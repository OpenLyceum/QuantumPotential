/**
 * NumerovSolver orchestrates the solution of the 1D Time-Independent Schrödinger Equation (TISE)
 * on a finite, equally-spaced grid. It coordinates Numerov integration, node-count bracketing,
 * eigenvalue refinement, wave-function stitching, and normalization.
 *
 * Architecture:
 * - NumerovIntegrator: Handles forward and backward integration
 * - EnergyRefiner: Refines energy eigenvalues using Illinois false-position
 * - WaveFunctionNormalizer: Normalizes wave functions
 *
 * The TISE is: -ℏ²/(2m) d²ψ/dx² + V(x)ψ = Eψ
 *
 * Eigenvalues are localized by **node counting** (Sturm-Liouville oscillation theorem): for the
 * finite-grid Dirichlet problem, the number of interior nodes of the forward solution ψ_L at a trial
 * energy E equals the number of eigenvalues strictly below E. Bisecting on this integer node count
 * isolates each state by index, so closely spaced multi-well levels do not depend on fixed energy
 * sampling.
 *
 * The bracket is then refined to the eigenvalue using a mismatch at a meeting grid point m.
 * For **non-symmetric** potentials this is the log-derivative mismatch
 * (ψ_L'/ψ_L)|_m - (ψ_R'/ψ_R)|_m, multiplied through by ψ_L·ψ_R so it remains bounded when ψ
 * has a node at m. Each side is rescaled to its peak amplitude before forming the mismatch so the
 * magnitude is O(1) even when a trial solution grows exponentially in classically forbidden
 * regions. The meeting point is chosen per state at the eigenstate's main lobe (where |ψ_L|·|ψ_R|
 * is largest) rather than at the geometric center, so a state localized far from x = 0 — such as a
 * lower level of an electric-field-tilted multi-well — is stitched where both sweeps are still
 * physical instead of inside ψ_L's spurious growing tail (see getMatchingPointIndex).
 *
 * For **symmetric** potentials (V(-x) = V(x)) the Sturm-Liouville theorem guarantees that
 * eigenfunctions alternate between even (ψ(-x) = ψ(x)) and odd (ψ(-x) = -ψ(x)) with increasing
 * index n. This solver exploits that structure in three ways:
 *   1. **Detection** — the caller states whether the potential is symmetric;
 *   2. **Mismatch** — only the forward sweep ψ_L is needed:
 *        Even states (n = 0, 2, 4, …): ψ'(0) = 0  →  slope mismatch at center.
 *        Odd  states (n = 1, 3, 5, …): ψ(0)  = 0  →  value mismatch at center.
 *   3. **Wave function** — ψ on [0, x_max] is the mirror image of ψ_L, giving exact symmetry in
 *        the output and halving the integration work.
 *
 * **Eigenvector refinement.** The shooting/mirror construction produces the right gross shape and
 * node count for well-separated levels. But in a dense multi-well miniband, where many levels lie
 * within a tiny energy span, the forward/backward sweeps cannot distinguish near-degenerate states, so
 * the stitched (or mirrored) wave function is a scrambled linear combination with the wrong node count
 * and a kink at the join. To remove this, each wave function is finalized by a couple of steps of
 * inverse iteration on the Numerov generalized eigenproblem H ψ = E B ψ. See inverseIteration.
 *
 * Ported from phetsims/quantum-bound-states (© University of Colorado Boulder, GPL-3.0).
 *
 * @author Martin Veillette
 */

import type { StrictOmit } from "scenerystack/phet-core";
import { optionize } from "scenerystack/phet-core";
import EnergyRefiner, { type EnergyRefinerOptions } from "./EnergyRefiner.js";
import NumerovConstants from "./NumerovConstants.js";
import NumerovIntegrator from "./NumerovIntegrator.js";
import type { PotentialEnergyFunction, TimeIndependentSolution } from "./TimeIndependentSolution.js";
import WaveFunctionNormalizer from "./WaveFunctionNormalizer.js";
import type XGrid from "./XGrid.js";

// Configuration options for the solver.
type SelfOptions = {
  // Options propagated to EnergyRefiner
  energyRefinerOptions?: EnergyRefinerOptions;
};

type NumerovSolverOptions = SelfOptions;

export default class NumerovSolver {
  // Positive barriers above this are effectively infinite for the energy ranges in this sim.
  // Keeping them finite avoids overflow in Numerov factors for steep potentials.
  // Since Numerov is currently only used for finite potentials (Finite Square, Pöschl-Teller) this is something
  // that should not be encountered, but does future-proof the sim.
  private static readonly MAX_SOLVER_POTENTIAL_ENERGY = 1000; // in eV

  // Relative threshold for detecting a node of psi at the matching point.
  // If |psi[m]| / max(|psi[m-1]|, |psi[m+1]|) is below this value, psi is treated as having a node
  // at m. A relative threshold is essential: the absolute amplitude of psi varies with the seed
  // value, so an absolute tolerance would misclassify the node when the seed changes.
  private static readonly RELATIVE_NODE_TOLERANCE = 1e-3;

  // Relative threshold for choosing non-zero reference values near a node. This is much smaller
  // than RELATIVE_NODE_TOLERANCE because it is used only to avoid division by numerical zero.
  private static readonly SCALE_REFERENCE_TOLERANCE = 1e-12;

  // Maximum bisection iterations when bracketing an eigenvalue by node count. This is a backstop only:
  // the loop normally exits on the bracket tolerance below, well before the cap. Even 60 halvings shrink
  // a bracket by ~10^18, far below floating-point relative resolution.
  private static readonly MAX_NODE_BISECTION_ITERATIONS = 200;

  // Stop node-count bisection when the bracket is this small relative to the initial energy
  // window and the upper endpoint has crossed only the requested state. The EnergyRefiner then
  // uses the continuous log-derivative mismatch within that bracket.
  //
  // This must be well below the intra-band level spacing of the densest multi-well miniband the sim
  // solves. Measured worst case (10 finite square wells, wide and deep, small wall gap) has adjacent
  // levels ~5×10⁻⁴ eV apart on a ~15 eV window, i.e. a relative gap ~3×10⁻⁵. 1×10⁻⁷ keeps the bracket ≪ the gap; the extra
  // halvings are cheap (MAX_NODE_BISECTION_ITERATIONS already allows 200).
  private static readonly NODE_BRACKET_RELATIVE_TOLERANCE = 1e-7;

  // Number of inverse-iteration steps used to turn each shooting/mirror wave function into the true
  // discrete Numerov eigenvector (see inverseIteration). Because the refined energy already sits
  // within machine precision of an eigenvalue, one step amplifies the matching eigenvector by
  // ~1/(E−λ) ≫ 1; a second step makes the result insensitive even to a badly scrambled
  // near-degenerate seed (the densest minibands), at negligible cost (two O(N) tridiagonal solves).
  private static readonly INVERSE_ITERATION_STEPS = 2;

  // Floor for tridiagonal pivots during inverse iteration. The shifted matrix (H − E·B) is singular
  // exactly at an eigenvalue, so a refined E landing on a pivot would divide by zero in the Thomas
  // elimination. Flooring keeps the solve finite; the resulting large amplitude is removed by the
  // subsequent peak rescale, leaving the eigenvector direction unchanged.
  private static readonly INVERSE_ITERATION_PIVOT_FLOOR = 1e-30;

  private readonly energyRefiner: EnergyRefiner;

  /**
   * @param [providedOptions] - Optional solver configuration
   */
  public constructor(providedOptions?: NumerovSolverOptions) {
    const options = optionize<NumerovSolverOptions, StrictOmit<SelfOptions, "energyRefinerOptions">>()(
      {
        // SelfOptions - none have defaults; energyRefinerOptions is forwarded as-is.
      },
      providedOptions,
    );

    this.energyRefiner = new EnergyRefiner(options.energyRefinerOptions);
  }

  /**
   * Solves the 1D Schrödinger equation using the Numerov method.
   * Returns all states detected by node count within the finite-grid energy bounds.
   *
   * @param potentialEnergyFunction - Function V(x) that returns potential energy in eV
   * @param isPotentialSymmetric - is the potential curve symmetric about x=0
   * @param xGrid - equally spaced x-coordinates in nm
   * @param mass - Particle mass in electron masses
   * @param energyMin - Minimum energy to search (eV)
   * @param energyMax - Maximum energy to search (eV)
   * @returns TimeIndependentSolution
   */
  public getTimeIndependentSolution(
    potentialEnergyFunction: PotentialEnergyFunction,
    isPotentialSymmetric: boolean,
    xGrid: XGrid,
    mass: number,
    energyMin: number,
    energyMax: number,
  ): TimeIndependentSolution {
    const potentialEnergyValues = NumerovSolver.evaluatePotential(potentialEnergyFunction, xGrid);

    const { eigenvalues, waveFunctionSolutions } = this.findEigenvaluesAndWaveFunctionSolutions(
      isPotentialSymmetric,
      potentialEnergyValues,
      xGrid,
      mass,
      energyMin,
      energyMax,
    );

    return {
      solutionMethod: "numerov",
      potentialEnergyValues: potentialEnergyValues,
      eigenvalues: eigenvalues,
      waveFunctionSolutions: waveFunctionSolutions,
    };
  }

  /**
   * Convenience method for testing NumerovSolver. This creates a new instance of NumerovSolver each time it is called,
   * so it is not recommended for use in sim production code.
   *
   * @param potentialEnergyFunction - Function V(x) that returns potential energy in eV
   * @param isPotentialSymmetric - is the potential curve symmetric about x=0
   * @param xGrid - equally spaced x-coordinates in nm
   * @param mass - Particle mass in electron masses
   * @param energyMin - Minimum energy to search (eV)
   * @param energyMax - Maximum energy to search (eV)
   * @param options - Optional solver configuration
   * @returns TimeIndependentSolution
   */
  public static solve(
    potentialEnergyFunction: PotentialEnergyFunction,
    isPotentialSymmetric: boolean,
    xGrid: XGrid,
    mass: number,
    energyMin: number,
    energyMax: number,
    options?: NumerovSolverOptions,
  ): TimeIndependentSolution {
    const solver = new NumerovSolver(options);
    return solver.getTimeIndependentSolution(
      potentialEnergyFunction,
      isPotentialSymmetric,
      xGrid,
      mass,
      energyMin,
      energyMax,
    );
  }

  /**
   * Finds eigenvalues and wave function solutions using node-count bracketing followed by eigenvalue refinement.
   *
   *   1. Count interior nodes of ψ_L at energyMin and energyMax. By Sturm–Liouville, this gives
   *      the inclusive index of the lowest state and the exclusive index of the highest state in
   *      the energy window.
   *   2. For each state index in that range, bisect on the integer node count to isolate E_n.
   *   3. Refine the bracket to the eigenvalue:
   *      - Symmetric potential: parity-specific center-BC mismatch (forward integration only).
   *      - General potential: log-derivative mismatch at the per-state main-lobe meeting point.
   *   4. Build the normalized wave function:
   *      - Symmetric potential: reflect the left half.
   *      - General potential: stitch ψ_L and ψ_R at the per-state main-lobe meeting point.
   *
   * @param isPotentialSymmetric - is the potential curve symmetric about x=0
   * @param potentialEnergyValues - Discretized potential energy array on xGrid (eV)
   * @param xGrid - equally spaced x-coordinates in nm
   * @param mass - Particle mass in electron masses
   * @param energyMin - Minimum energy to search (eV)
   * @param energyMax - Maximum energy to search (eV)
   * @returns eigenvalues and wave function solutions
   */
  private findEigenvaluesAndWaveFunctionSolutions(
    isPotentialSymmetric: boolean,
    potentialEnergyValues: number[],
    xGrid: XGrid,
    mass: number,
    energyMin: number,
    energyMax: number,
  ): { eigenvalues: number[]; waveFunctionSolutions: number[][] } {
    const meetingIndex = NumerovSolver.getMeetingPointIndex(xGrid);

    // For symmetric potentials, mirror the left half over the right half so that the forward
    // integrator (which sweeps the entire grid) does not propagate any tail asymmetry that
    // arose from 1-ulp floating-point boundary effects when V was discretized.
    const solverV = isPotentialSymmetric
      ? NumerovSolver.symmetrize(potentialEnergyValues, meetingIndex)
      : potentialEnergyValues;

    // States E_n with n in [lowestStateIndex, highestStateIndexExclusive) lie in the requested energy window.
    const lowestStateIndex = NumerovSolver.countNodesAtEnergy(energyMin, solverV, xGrid, mass);
    const highestStateIndexExclusive = NumerovSolver.countNodesAtEnergy(energyMax, solverV, xGrid, mass);

    const eigenvalues: number[] = [];
    const waveFunctionSolutions: number[][] = [];

    for (let n = lowestStateIndex; n < highestStateIndexExclusive; n++) {
      const bracket = NumerovSolver.bracketEigenvalueByNodeCount(
        n,
        solverV,
        xGrid,
        mass,
        energyMin,
        energyMax,
        lowestStateIndex,
        highestStateIndexExclusive,
      );
      if (bracket === null) {
        continue;
      }

      if (isPotentialSymmetric) {
        // Even-indexed states are spatially even; odd-indexed states are spatially odd.
        const parity: "even" | "odd" = n % 2 === 0 ? "even" : "odd";
        const { mismatchFunction, getLastPsiL } = NumerovSolver.makeSymmetricMismatch(
          solverV,
          xGrid,
          mass,
          meetingIndex,
          parity,
        );
        const energy = this.energyRefiner.refine(bracket.lowerEnergy, bracket.upperEnergy, mismatchFunction);
        eigenvalues.push(energy);

        // Seed inverse iteration with the mirror construction (correct parity and gross shape), then
        // project the refined vector back onto the parity subspace so the output is exactly symmetric.
        const seed = this.computeSymmetricWaveFunction(
          energy,
          solverV,
          xGrid,
          mass,
          meetingIndex,
          parity,
          getLastPsiL(),
        );
        const refined = NumerovSolver.projectParity(
          NumerovSolver.inverseIteration(energy, solverV, xGrid, mass, seed),
          meetingIndex,
          parity,
        );
        waveFunctionSolutions.push(WaveFunctionNormalizer.normalize(refined, xGrid.dx));
      } else {
        // Stitch each state at its own main lobe rather than at the fixed center, so a state
        // localized far from x = 0 (e.g. a lower level of an electric-field-tilted multi-well) is
        // joined where both sweeps are still physical. Matching at the center would stitch into
        // ψ_L's spurious growing tail and leave a kink. The closure caches its last psi arrays so
        // computeWaveFunction can skip re-integration. See getMatchingPointIndex.
        const matchIndex = NumerovSolver.getMatchingPointIndex(
          0.5 * (bracket.lowerEnergy + bracket.upperEnergy),
          solverV,
          xGrid,
          mass,
        );
        const { mismatchFunction, getLastPsiLeft, getLastPsiRight } = NumerovSolver.makeLogDerivativeMismatch(
          solverV,
          xGrid,
          mass,
          matchIndex,
        );
        const energy = this.energyRefiner.refine(bracket.lowerEnergy, bracket.upperEnergy, mismatchFunction);
        eigenvalues.push(energy);

        // Seed inverse iteration with the stitched solution; the refinement removes the join kink and
        // resolves scrambled near-degenerate combinations into the single true eigenvector.
        const seed = this.computeWaveFunction(
          energy,
          solverV,
          xGrid,
          mass,
          matchIndex,
          getLastPsiLeft(),
          getLastPsiRight(),
        );
        const psi = NumerovSolver.inverseIteration(energy, solverV, xGrid, mass, seed);
        waveFunctionSolutions.push(WaveFunctionNormalizer.normalize(psi, xGrid.dx));
      }
    }

    return { eigenvalues: eigenvalues, waveFunctionSolutions: waveFunctionSolutions };
  }

  /**
   * Counts the number of interior nodes of ψ_L for trial energy E. By the Sturm-Liouville oscillation
   * theorem this is also the number of eigenstates strictly below E, so it is the index that the next
   * eigenstate above E will have.
   *
   * @param energy - energy (in eV) at which to count
   * @param potentialEnergyValues - Discretized potential energy array on xGrid (eV)
   * @param xGrid - equally spaced x-coordinates in nm
   * @param mass - Particle mass in electron masses
   * @returns number of interior nodes
   */
  private static countNodesAtEnergy(
    energy: number,
    potentialEnergyValues: number[],
    xGrid: XGrid,
    mass: number,
  ): number {
    const psiL = NumerovIntegrator.integrate(energy, potentialEnergyValues, xGrid, mass);
    return NumerovSolver.countNodes(psiL);
  }

  /**
   * Computes bracket E_{stateIndex} by bisecting on the integer node count of ψ_L.
   *
   * Invariants maintained throughout: countNodesAtEnergy(lowerEnergy) ≤ stateIndex and
   * countNodesAtEnergy(upperEnergy) > stateIndex. The bracket therefore strictly contains E_n.
   *
   * @param stateIndex - Zero-based eigenstate index to bracket
   * @param potentialEnergyValues - Discretized potential energy array on xGrid (eV)
   * @param xGrid - equally spaced x-coordinates in nm
   * @param mass - Particle mass in electron masses
   * @param energyMin - Minimum energy to search (eV)
   * @param energyMax - Maximum energy to search (eV)
   * @param precomputedLowerNodeCount - optional pre-computed countNodesAtEnergy(energyMin); if
   *   provided the boundary guard at the low end is skipped (caller guarantees it passes).
   * @param precomputedUpperNodeCount - same for energyMax.
   * @returns Energy bracket { lowerEnergy, upperEnergy }, or null if stateIndex is outside the [energyMin, energyMax] window
   */
  private static bracketEigenvalueByNodeCount(
    stateIndex: number,
    potentialEnergyValues: number[],
    xGrid: XGrid,
    mass: number,
    energyMin: number,
    energyMax: number,
    precomputedLowerNodeCount?: number,
    precomputedUpperNodeCount?: number,
  ): { lowerEnergy: number; upperEnergy: number } | null {
    let lowerEnergy = energyMin;
    let upperEnergy = energyMax;

    const lowerNodeCount =
      precomputedLowerNodeCount ?? NumerovSolver.countNodesAtEnergy(lowerEnergy, potentialEnergyValues, xGrid, mass);
    const upperNodeCount =
      precomputedUpperNodeCount ?? NumerovSolver.countNodesAtEnergy(upperEnergy, potentialEnergyValues, xGrid, mass);

    if (lowerNodeCount > stateIndex) {
      return null;
    }
    if (upperNodeCount <= stateIndex) {
      return null;
    }

    const bracketTolerance = NumerovSolver.NODE_BRACKET_RELATIVE_TOLERANCE * (upperEnergy - lowerEnergy);

    for (let i = 0; i < NumerovSolver.MAX_NODE_BISECTION_ITERATIONS; i++) {
      if (
        upperEnergy - lowerEnergy <= bracketTolerance &&
        NumerovSolver.countNodesAtEnergy(upperEnergy, potentialEnergyValues, xGrid, mass) === stateIndex + 1
      ) {
        break;
      }

      const midEnergy = 0.5 * (lowerEnergy + upperEnergy);
      if (NumerovSolver.countNodesAtEnergy(midEnergy, potentialEnergyValues, xGrid, mass) > stateIndex) {
        upperEnergy = midEnergy;
      } else {
        lowerEnergy = midEnergy;
      }
    }

    return { lowerEnergy: lowerEnergy, upperEnergy: upperEnergy };
  }

  /**
   * Returns a copy of V with the right half (indices > centerIndex) replaced by the mirror of
   * the left half: symV[centerIndex + k] = V[centerIndex - k]. The result is exactly symmetric
   * about centerIndex by construction.
   *
   * Used on the symmetric-potential path after isPotentialSymmetric has confirmed the
   * analytical V is symmetric. The discretized array can still pick up a 1-ulp asymmetry at a
   * single grid point when a well boundary lands exactly on a grid index; mirroring guarantees
   * that the forward integrator sees the same potential on both halves and produces a node
   * count and eigenenergy consistent with the symmetric wave function we ultimately emit.
   *
   * @param potentialEnergyValues - Discretized potential energy array on xGrid (eV)
   * @param centerIndex - grid index of the axis to mirror about; values above it are replaced by the mirror of those below
   * @returns symmetric array of potential energy values
   */
  private static symmetrize(potentialEnergyValues: number[], centerIndex: number): number[] {
    const potentialEnergyValuesCopy = potentialEnergyValues.slice();
    for (let k = 1; centerIndex + k < potentialEnergyValues.length; k++) {
      if (centerIndex - k >= 0) {
        potentialEnergyValuesCopy[centerIndex + k] = potentialEnergyValues[centerIndex - k]!;
      }
    }
    return potentialEnergyValuesCopy;
  }

  /**
   * Builds a mismatch function for symmetric potentials. By the Sturm-Liouville theorem,
   * eigenfunctions alternate parity: even-indexed states are spatially even (ψ(-x) = ψ(x)) and
   * odd-indexed states are spatially odd (ψ(-x) = -ψ(x)). The boundary condition at the center
   * therefore differs by parity:
   *
   *   Even states: ψ'(0) = 0  →  f(E) = slope at center / peak
   *   Odd  states: ψ(0)  = 0  →  f(E) = ψ_L[m] / peak
   *
   * Only the forward integration ψ_L is required — no backward sweep.

   *
   * @param potentialEnergyValues - Discretized potential energy array on xGrid (eV)
   * @param xGrid - equally spaced x-coordinates in nm
   * @param mass - Particle mass in electron masses
   * @param centerIndex - grid index of the symmetry axis, where the parity boundary condition is imposed
   * @param parity - 'even' for a spatially even state (zero slope at the axis), 'odd' for a spatially odd state
   *   (zero value at the axis)
   * @returns mismatchFunction, which the energy refiner finds a root of: it is zero exactly when the trial energy
   *   satisfies the parity boundary condition, and is scaled by the peak amplitude so its magnitude stays O(1);
   *   and getLastPsiL, which returns the forward sweep computed by the most recent mismatch evaluation, so the
   *   caller can build the wave function at the refined energy without integrating again
   */
  private static makeSymmetricMismatch(
    potentialEnergyValues: number[],
    xGrid: XGrid,
    mass: number,
    centerIndex: number,
    parity: "even" | "odd",
  ): { mismatchFunction: (energy: number) => number; getLastPsiL: () => number[] } {
    // Cached by the last mismatchFunction evaluation so computeSymmetricWaveFunction can reuse ψ_L.
    let lastPsiL: number[] = [];

    const mismatchFunction = (energy: number): number => {
      const psiL = NumerovIntegrator.integrate(energy, potentialEnergyValues, xGrid, mass);
      lastPsiL = psiL;
      const peak = NumerovSolver.getPeak(psiL);

      if (parity === "odd") {
        // Odd eigenfunction: ψ(0) must be zero.
        return psiL[centerIndex]! / peak;
      } else {
        // Even eigenfunction: ψ'(0) must be zero.
        // 5-point O(dx⁴) centered-difference stencil for the first derivative.
        const centerGridIndex = centerIndex;
        return (
          (-psiL[centerGridIndex + 2]! +
            8 * psiL[centerGridIndex + 1]! -
            8 * psiL[centerGridIndex - 1]! +
            psiL[centerGridIndex - 2]!) /
          (12 * xGrid.dx * peak)
        );
      }
    };

    return { mismatchFunction: mismatchFunction, getLastPsiL: () => lastPsiL };
  }

  /**
   * Constructs the wave function for a symmetric potential by integrating from the left boundary
   * to the center only, then reflecting to fill the right half:
   *
   *   Even states: ψ[centerIndex + k]  =  ψ[centerIndex - k]
   *   Odd  states: ψ[centerIndex + k]  = -ψ[centerIndex - k],  ψ[centerIndex] = 0 exactly
   *
   * This guarantees exact spatial symmetry in the output and avoids the backward integration.
   *
   * @param energy - refined eigenvalue at which to build the wave function (eV)
   * @param potentialEnergyValues - Discretized potential energy array on xGrid (eV)
   * @param xGrid - equally spaced x-coordinates in nm
   * @param mass - Particle mass in electron masses
   * @param centerIndex - grid index of the symmetry axis; only the half below it is integrated, and the half above
   *   it is that half reflected
   * @param parity - 'even' reflects with the same sign, 'odd' reflects with the opposite sign and pins the value at
   *   the axis to zero
   * @param [cachedPsiL] - forward sweep already computed at this same energy. Supplying it skips a redundant
   *   integration; omitting it costs one extra sweep but gives the same result.
   * @returns symmetric wave function values for the specified energy
   */
  private computeSymmetricWaveFunction(
    energy: number,
    potentialEnergyValues: number[],
    xGrid: XGrid,
    mass: number,
    centerIndex: number,
    parity: "even" | "odd",
    cachedPsiL?: number[],
  ): number[] {
    const N = potentialEnergyValues.length;
    const psiL = cachedPsiL ?? NumerovIntegrator.integrate(energy, potentialEnergyValues, xGrid, mass);
    const psi = new Array<number>(N);

    // Copy left half (including center).
    for (let i = 0; i <= centerIndex; i++) {
      psi[i] = psiL[i]!;
    }

    // Enforce exact zero at center for odd states.
    if (parity === "odd") {
      psi[centerIndex] = 0;
    }

    // Reflect to fill the right half. Sign is +1 for even, -1 for odd.
    const sign = parity === "even" ? 1 : -1;
    for (let i = centerIndex + 1; i < N; i++) {
      const mirrorIndex = 2 * centerIndex - i;

      // mirrorIndex can be negative for even-N grids at the far boundary (where ψ = 0 anyway).
      psi[i] = mirrorIndex >= 0 ? sign * psiL[mirrorIndex]! : 0;
    }

    return WaveFunctionNormalizer.normalize(psi, xGrid.dx);
  }

  /**
   * Builds a mismatch function for use by the EnergyRefiner. This is index function use to gauge
   * how close we are to a true eigenvalue. At an eigenvalue, ψ_L and ψ_R have a
   * common log-derivative at the meeting point m: (ψ_L'/ψ_L)|_m = (ψ_R'/ψ_R)|_m. The returned
   * function is
   *
   *     f(E) = (slopeLeft·valueRight - slopeRight·valueLeft)
   *
   * which is the log-derivative difference multiplied through by ψ_L(m)·ψ_R(m) — equivalent at
   * roots, but bounded when ψ has a node at the meeting point (avoiding 1/0). Therefore f(E)=0 for
   * a true eigenvalue. Each side is rescaled by its peak amplitude beforehand so the mismatch
   * has O(1) magnitude regardless of the exponential scaling that arises when integrating across
   * classically forbidden regions.
   *
   * @param potentialEnergyValues - Discretized potential energy array on xGrid (eV)
   * @param xGrid - equally spaced x-coordinates in nm
   * @param mass - Particle mass in electron masses
   * @param meetingIndex - interior grid index at which the two sweeps are compared. It must leave room for the
   *   5-point slope stencil, i.e. lie at least two points inside each boundary.
   * @returns mismatchFunction, which the energy refiner finds a root of: it is zero exactly when the trial energy
   *   makes the two sweeps agree in log-derivative at the meeting point; and getLastPsiLeft/getLastPsiRight, which
   *   return the forward and backward sweeps computed by the most recent mismatch evaluation, so the caller can
   *   stitch the wave function at the refined energy without integrating again
   */
  private static makeLogDerivativeMismatch(
    potentialEnergyValues: number[],
    xGrid: XGrid,
    mass: number,
    meetingIndex: number,
  ): { mismatchFunction: (energy: number) => number; getLastPsiLeft: () => number[]; getLastPsiRight: () => number[] } {
    // Cached by the last mismatchFunction evaluation so computeWaveFunction can reuse both sweeps.
    let lastPsiLeft: number[] = [];
    let lastPsiRight: number[] = [];

    const mismatchFunction = (energy: number): number => {
      const psiLeft = NumerovIntegrator.integrate(energy, potentialEnergyValues, xGrid, mass);
      const psiRight = NumerovIntegrator.integrateBackward(energy, potentialEnergyValues, xGrid, mass);
      lastPsiLeft = psiLeft;
      lastPsiRight = psiRight;

      const peakLeft = NumerovSolver.getPeak(psiLeft);
      const peakRight = NumerovSolver.getPeak(psiRight);

      const valueLeft = psiLeft[meetingIndex]! / peakLeft;
      const valueRight = psiRight[meetingIndex]! / peakRight;

      // 5-point O(dx⁴) centered-difference stencil for the first derivative.
      const slopeLeft =
        (-psiLeft[meetingIndex + 2]! +
          8 * psiLeft[meetingIndex + 1]! -
          8 * psiLeft[meetingIndex - 1]! +
          psiLeft[meetingIndex - 2]!) /
        (12 * xGrid.dx * peakLeft);
      const slopeRight =
        (-psiRight[meetingIndex + 2]! +
          8 * psiRight[meetingIndex + 1]! -
          8 * psiRight[meetingIndex - 1]! +
          psiRight[meetingIndex - 2]!) /
        (12 * xGrid.dx * peakRight);

      // Zero when log-derivatives match at the meeting point (eigenvalue condition).
      return slopeLeft * valueRight - slopeRight * valueLeft;
    };

    return {
      mismatchFunction: mismatchFunction,
      getLastPsiLeft: () => lastPsiLeft,
      getLastPsiRight: () => lastPsiRight,
    };
  }

  /**
   * Computes the wave function: integrates from both ends, stitches the two sweeps at the caller's
   * meeting point, and normalizes.
   * Accepts optional pre-computed psi arrays (from the mismatch cache) to avoid re-integrating.
   *
   * @param energy - refined eigenvalue at which to build the wave function (eV)
   * @param potentialEnergyValues - Discretized potential energy array on xGrid (eV)
   * @param xGrid - equally spaced x-coordinates in nm
   * @param mass - Particle mass in electron masses
   * @param meetingIndex - interior grid index at which the forward and backward sweeps are joined
   * @param [cachedPsiLeft] - forward sweep already computed at this same energy. Supplying it skips a redundant
   *   integration; omitting it costs one extra sweep but gives the same result.
   * @param [cachedPsiRight] - backward sweep already computed at this same energy, with the same trade-off.
   * @returns wave function values for the specified energy
   */
  private computeWaveFunction(
    energy: number,
    potentialEnergyValues: number[],
    xGrid: XGrid,
    mass: number,
    meetingIndex: number,
    cachedPsiLeft?: number[],
    cachedPsiRight?: number[],
  ): number[] {
    const psiL = cachedPsiLeft ?? NumerovIntegrator.integrate(energy, potentialEnergyValues, xGrid, mass);
    const psiR = cachedPsiRight ?? NumerovIntegrator.integrateBackward(energy, potentialEnergyValues, xGrid, mass);
    const stitched = NumerovSolver.stitchWaveFunctions(psiL, psiR, meetingIndex);
    return WaveFunctionNormalizer.normalize(stitched, xGrid.dx);
  }

  /**
   * Counts zero crossings of psi in the interior (indices 1 ... N-2).
   *
   * Do not use a global amplitude threshold here. Trial solutions can grow by many orders of
   * magnitude after crossing a forbidden barrier, especially for multiple separated wells. A
   * global threshold would then hide real earlier nodes and collapse several states into the same
   * high-energy bracket.
   *
   * @param psi - trial solution values on the grid
   * @returns the number of zero crossings
   */
  private static countNodes(psi: number[]): number {
    let nodes = 0;
    let prevSign = 0;

    for (let i = 1; i < psi.length - 1; i++) {
      const value = psi[i]!;
      if (value === 0 || !Number.isFinite(value)) {
        continue;
      }

      const sign = Math.sign(value);
      if (prevSign !== 0 && sign !== prevSign) {
        nodes++;
      }
      prevSign = sign;
    }

    return nodes;
  }

  /**
   * Gets the spatial grid index m closest to the x-coordinate midpoint (xMin+xMax)/2.
   *
   * @param xGrid - equally spaced x-coordinates in nm
   * @returns the index in xGrid of the meeting point
   */
  private static getMeetingPointIndex(xGrid: XGrid): number {
    return xGrid.getClosestIndex((xGrid.xMin + xGrid.xMax) / 2);
  }

  /**
   * Gets the spatial grid index at which to stitch ψ_L (forward) and ψ_R (backward) for a non-symmetric potential,
   * chosen from a trial energy near the eigenvalue.
   *
   * The fixed geometric center is a poor stitch point whenever the eigenstate is localized far from
   * x = 0 — for example a multi-well potential tilted by an electric field, whose lower states sit
   * in the deepest well on the downhill side. There the center lies deep in a classically forbidden
   * region where ψ_L (integrated left→right) has decayed and been overtaken by the spurious
   * growing-exponential mode, so its value and slope at the center are numerical noise. Stitching
   * ψ_L to ψ_R there matches the value but not the slope, leaving a visible kink at x = 0 and a
   * wave function that is many orders of magnitude too large in the tail.
   *
   * The remedy is to stitch where both sweeps are still dominated by the true solution: the
   * eigenstate's main lobe. Each sweep is reliable from its own boundary up to the localization
   * region (ψ_L while its envelope grows left→right, ψ_R while it grows right→left), so the index
   * that maximizes the overlap |ψ_L|·|ψ_R| (each normalized to its own peak) lands on an antinode of
   * the main lobe. There ψ_L and ψ_R are both large and physical, the stitch scale is
   * well-conditioned, and the joined wave function is smooth. A spurious-growth tail inflates only
   * one factor of the product while the other has already decayed, so it never wins the maximum.
   *
   * @param energy - Trial energy near the eigenvalue (eV), e.g. the midpoint of the node-count bracket
   * @param potentialEnergyValues - Discretized potential energy array on xGrid (eV)
   * @param xGrid - equally spaced x-coordinates in nm
   * @param mass - Particle mass in electron masses
   * @returns Interior grid index, valid for the 5-point slope stencil (m±2) and stitch neighbors (m±1)
   */
  private static getMatchingPointIndex(
    energy: number,
    potentialEnergyValues: number[],
    xGrid: XGrid,
    mass: number,
  ): number {
    const psiL = NumerovIntegrator.integrate(energy, potentialEnergyValues, xGrid, mass);
    const psiR = NumerovIntegrator.integrateBackward(energy, potentialEnergyValues, xGrid, mass);
    const peakL = NumerovSolver.getPeak(psiL);
    const peakR = NumerovSolver.getPeak(psiR);

    // Default to the center so the result is well-defined even if no overlap is found.
    let bestIndex = NumerovSolver.getMeetingPointIndex(xGrid);
    let bestOverlap = -1;

    // Restrict to interior indices where the 5-point slope stencil (m±2) and the stitch neighbors
    // (m±1) are all in range.
    for (let i = 2; i < psiL.length - 2; i++) {
      const overlap = Math.abs(psiL[i]! / peakL) * Math.abs(psiR[i]! / peakR);
      if (overlap > bestOverlap) {
        bestOverlap = overlap;
        bestIndex = i;
      }
    }

    return bestIndex;
  }

  /**
   * Determines whether psi has a node at index, relative to its immediate neighbors.
   *
   * @param psi - wave function values on the grid
   * @param index - interior grid index to test; its two neighbors supply the reference amplitude, so the index must
   *   not be a boundary
   * @returns boolean
   */
  private static hasNodeAtIndex(psi: number[], index: number): boolean {
    const neighborMax = Math.max(Math.abs(psi[index - 1]!), Math.abs(psi[index + 1]!));
    return neighborMax === 0 || Math.abs(psi[index]!) < NumerovSolver.RELATIVE_NODE_TOLERANCE * neighborMax;
  }

  /**
   * Scales psiR for a stitch point that is itself a node. The value at the node cannot determine
   * the scale, so use the nearest symmetric pair around the node to match the local slope:
   * ψ(m + k) ≈ -ψ(m - k).
   *
   * @param psiL - forward sweep, which supplies the reference values below the node
   * @param psiR - backward sweep, which the returned factor scales
   * @param meetingPointIndex - grid index of the node being stitched at
   * @returns factor to multiply the backward sweep by so that it continues the forward sweep through the node with
   *   the correct slope and sign. Falls back to 1 when neither sweep has a usable non-zero reference pair.
   */
  private static getNodeMatchScale(psiL: number[], psiR: number[], meetingPointIndex: number): number {
    const N = psiL.length;
    const psiRMaxAbs = psiR.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0);
    const psiLMaxAbs = psiL.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0);
    const threshR = NumerovSolver.SCALE_REFERENCE_TOLERANCE * psiRMaxAbs;
    const threshL = NumerovSolver.SCALE_REFERENCE_TOLERANCE * psiLMaxAbs;

    for (let offset = 1; meetingPointIndex - offset >= 0 && meetingPointIndex + offset < N; offset++) {
      const leftValue = psiL[meetingPointIndex - offset]!;
      const rightValue = psiR[meetingPointIndex + offset]!;
      if (Math.abs(leftValue) > threshL && Math.abs(rightValue) > threshR) {
        return -leftValue / rightValue;
      }
    }

    // Fall back to sign matching if no stable derivative reference was found.
    for (let referenceIndex = meetingPointIndex - 1; referenceIndex > 0; referenceIndex--) {
      const leftValue = psiL[referenceIndex]!;
      const rightValue = psiR[referenceIndex]!;
      if (Math.abs(leftValue) > threshL && Math.abs(rightValue) > threshR) {
        return Math.sign(leftValue) !== Math.sign(rightValue) ? -1 : 1;
      }
    }

    return 1;
  }

  /**
   * Concatenates the left and right solutions at meetingPointIndex.
   * psiR is scaled so that ψ_R at the meeting point equals ψ_L there, ensuring continuity.
   *
   * Because psiL and psiR are integrated from opposite ends with independent
   * initial conditions, they may have opposite signs at the meeting point.
   * The scale factor (which may be negative) effectively flips the sign of psiR
   * when necessary, so the stitched wave function is continuous.
   *
   * @param psiL - forward sweep, used unchanged for indices up to and including the meeting point
   * @param psiR - backward sweep, used above the meeting point after scaling
   * @param meetingPointIndex - grid index at which the two sweeps are joined
   * @returns the joined wave function over the full grid, continuous at the meeting point but not yet normalized
   */
  private static stitchWaveFunctions(psiL: number[], psiR: number[], meetingPointIndex: number): number[] {
    const N = psiL.length;
    const stitched = new Array<number>(N);

    for (let i = 0; i <= meetingPointIndex; i++) {
      stitched[i] = psiL[i]!;
    }

    const psiLHasNodeAtMatch = NumerovSolver.hasNodeAtIndex(psiL, meetingPointIndex);
    const psiRHasNodeAtMatch = NumerovSolver.hasNodeAtIndex(psiR, meetingPointIndex);
    const psiRatMatch = psiR[meetingPointIndex]!;

    if (!(psiLHasNodeAtMatch || psiRHasNodeAtMatch)) {
      // scale may be negative, flipping psiR's sign to match psiL at the junction.
      const scale = psiL[meetingPointIndex]! / psiRatMatch;
      for (let i = meetingPointIndex + 1; i < N; i++) {
        stitched[i] = psiR[i]! * scale;
      }
    } else {
      // The stitch point is a node. Force it to zero and use the local slope to determine the
      // relative scale; otherwise a small numerical midpoint value can normalize into a spike.
      stitched[meetingPointIndex] = 0;
      const scale = NumerovSolver.getNodeMatchScale(psiL, psiR, meetingPointIndex);
      for (let i = meetingPointIndex + 1; i < N; i++) {
        stitched[i] = psiR[i]! * scale;
      }
    }

    return stitched;
  }

  /**
   * Refines a trial wave function into the true discrete Numerov eigenvector at the given energy by a
   * few steps of inverse iteration.
   *
   * The Numerov recurrence (1 + f_{j+1})ψ_{j+1} − (2 − 10 f_j)ψ_j + (1 + f_{j-1})ψ_{j-1} = 0, with
   * f_j = (dx²/12)·(2m/ℏ²)(E − V_j), is exactly the tridiagonal matrix pencil H ψ = E B ψ where (with
   * invC = 6ℏ²/(m·dx²))
   *
   *     H_{j,j}   = 2·invC + 10·V_j        B_{j,j}   = 10
   *     H_{j,j±1} = V_{j±1} − invC         B_{j,j±1} = 1
   *
   * Its eigenvalues are the Numerov shooting eigenvalues to machine precision, so the refined energy E
   * is an extremely accurate shift. Each inverse-iteration step solves the shifted system
   *
   *     (H − E B) ψ_new = B ψ_old
   *
   * which amplifies the component of ψ_old along the eigenvector whose eigenvalue is nearest E by
   * ~1/(E − λ). With E within ~10⁻¹² eV of λ and the next-nearest level ~10⁻⁴ eV away, a single step
   * boosts the target eigenvector by ~10⁸ relative to every other, so the iterate collapses onto the
   * one true discrete eigenstate even when the seed is a scrambled near-degenerate mixture. The result
   * is smooth by construction — it is an actual eigenvector of the discrete operator, with no stitch
   * point or mirror seam to leave a kink.
   *
   * (H − E B) is tridiagonal, so each step is one O(N) solve. Dirichlet boundaries ψ_0 =
   * ψ_{N−1} = 0 leave the interior indices 1 … N−2 as the unknowns. The iterate is rescaled to unit
   * peak each step to keep magnitudes O(1) through the near-singular solve.
   *
   * @param energy - Refined eigenvalue used as the inverse-iteration shift (eV)
   * @param potentialEnergyValues - Discretized potential energy array on xGrid (eV); the same array the integrator saw
   * @param xGrid - equally spaced x-coordinates in nm
   * @param mass - Particle mass in electron masses
   * @param seed - Shooting/mirror wave function providing the starting direction (need only overlap
   *               the target eigenvector; its scale is irrelevant)
   * @returns Refined wave function (unit peak, not yet area-normalized)
   */
  private static inverseIteration(
    energy: number,
    potentialEnergyValues: number[],
    xGrid: XGrid,
    mass: number,
    seed: number[],
  ): number[] {
    const N = potentialEnergyValues.length;
    const invC = (6 * NumerovConstants.HBAR * NumerovConstants.HBAR) / (mass * xGrid.dx * xGrid.dx);

    // Tridiagonal entries of M = H − E·B over the interior indices 1 … N−2 (rows 0 and N−1 are pinned
    // to ψ = 0 by the Dirichlet boundary and drop out of the system).
    //   lower[j] · ψ_{j−1} + diag[j] · ψ_j + upper[j] · ψ_{j+1}
    const lower = new Array<number>(N);
    const diag = new Array<number>(N);
    const upper = new Array<number>(N);
    for (let j = 1; j < N - 1; j++) {
      lower[j] = potentialEnergyValues[j - 1]! - invC - energy;
      diag[j] = 2 * invC + 10 * (potentialEnergyValues[j]! - energy);
      upper[j] = potentialEnergyValues[j + 1]! - invC - energy;
    }

    let psi = seed.slice();
    NumerovSolver.scaleToUnitPeak(psi);

    const cp = new Array<number>(N); // Thomas forward-sweep super-diagonal coefficients

    for (let step = 0; step < NumerovSolver.INVERSE_ITERATION_STEPS; step++) {
      // Right-hand side d = B ψ over the interior (ψ_0 = ψ_{N−1} = 0).
      const d = new Array<number>(N);
      for (let j = 1; j < N - 1; j++) {
        d[j] = psi[j + 1]! + 10 * psi[j]! + psi[j - 1]!;
      }

      // Thomas algorithm: solve M ψ_new = d for the interior. The result overwrites `next`.
      const next = new Array<number>(N).fill(0);
      let beta = NumerovSolver.guardPivot(diag[1]!);
      cp[1] = upper[1]! / beta;
      next[1] = d[1]! / beta;
      for (let j = 2; j < N - 1; j++) {
        beta = NumerovSolver.guardPivot(diag[j]! - lower[j]! * cp[j - 1]!);
        cp[j] = upper[j]! / beta;
        next[j] = (d[j]! - lower[j]! * next[j - 1]!) / beta;
      }
      for (let j = N - 3; j >= 1; j--) {
        next[j]! -= cp[j]! * next[j + 1]!;
      }

      // A non-finite result means E landed essentially on a singular pivot; keep the prior iterate
      // (already a valid, correctly-shaped wave function) rather than returning NaN.
      if (!NumerovSolver.allFinite(next)) {
        break;
      }
      NumerovSolver.scaleToUnitPeak(next);
      psi = next;
    }

    return psi;
  }

  /**
   * Projects psi onto the even or odd subspace about centerIndex by mirror-averaging, restoring the
   * bit-exact spatial symmetry that the (direction-dependent) tridiagonal solve in inverseIteration
   * perturbs at the roundoff level. Because the true eigenvector already lies in this subspace, the
   * projection only removes roundoff-level contamination of the opposite parity.
   *
   *   even: ψ[c+k] = ψ[c−k]            odd: ψ[c+k] = −ψ[c−k], ψ[c] = 0
   *
   * Indices with no in-range mirror partner are set to zero, matching computeSymmetricWaveFunction.
   *
   * @param psi - wave function values on the grid
   * @param centerIndex - grid index of the symmetry axis to mirror about
   * @param parity - 'even' keeps the mirror-symmetric part, 'odd' keeps the antisymmetric part
   * @returns a new array holding the projected wave function; the input is left unmodified
   */
  private static projectParity(psi: number[], centerIndex: number, parity: "even" | "odd"): number[] {
    const N = psi.length;
    const sign = parity === "even" ? 1 : -1;
    const out = new Array<number>(N).fill(0);
    for (let i = 0; i < N; i++) {
      const mirror = 2 * centerIndex - i;
      if (mirror >= 0 && mirror < N) {
        out[i] = 0.5 * (psi[i]! + sign * psi[mirror]!);
      }
    }
    return out;
  }

  /**
   * Floors a Thomas-algorithm pivot away from zero (sign-preserving) so a shift that lands on the
   * singular eigenvalue cannot divide by zero. See INVERSE_ITERATION_PIVOT_FLOOR.
   *
   * @param pivot - Thomas-algorithm pivot, which is arbitrarily close to zero when the shift lands on an eigenvalue
   * @returns the pivot unchanged, or the floor magnitude carrying the pivot's sign when the pivot is smaller than it
   */
  private static guardPivot(pivot: number): number {
    if (Math.abs(pivot) < NumerovSolver.INVERSE_ITERATION_PIVOT_FLOOR) {
      return pivot < 0 ? -NumerovSolver.INVERSE_ITERATION_PIVOT_FLOOR : NumerovSolver.INVERSE_ITERATION_PIVOT_FLOOR;
    }
    return pivot;
  }

  /**
   * Rescales psi in place so its peak absolute value is 1 (no-op for an all-zero vector).
   *
   * @param psi - wave function values, modified in place
   */
  private static scaleToUnitPeak(psi: number[]): void {
    const peak = NumerovSolver.getPeak(psi);
    for (let i = 0; i < psi.length; i++) {
      psi[i]! /= peak;
    }
  }

  /**
   * Determines whether every element of the array is a finite number.
   */
  private static allFinite(values: number[]): boolean {
    return values.every((value) => Number.isFinite(value));
  }

  /**
   * Returns the peak absolute amplitude of psi, or 1 if psi is identically zero.
   * Used to normalize mismatch magnitudes so they remain O(1) across all trial energies.
   *
   * @param psi - wave function values on the grid
   * @returns the largest absolute value, or 1 when every value is zero
   */
  private static getPeak(psi: number[]): number {
    return psi.reduce((peak, value) => Math.max(peak, Math.abs(value)), 0) || 1;
  }

  /**
   * Evaluates potential on the spatial grid.
   * Clamps the potential energy to MAX_SOLVER_POTENTIAL_ENERGY to avoid overflow in steep potentials.
   *
   * An infinitely deep well is capped to the same magnitude as an infinitely high barrier, but with its sign
   * preserved: replacing it with a positive cap would turn the well into a barrier and invert the physics at that
   * grid point. NaN has no meaningful sign and is treated as an infinite barrier, which keeps the trial solution
   * pinned near zero there rather than poisoning the whole sweep.
   *
   * @param potentialEnergyFunction - Function V(x) that returns potential energy in eV
   * @param xGrid - equally spaced x-coordinates in nm
   * @returns Discretized potential energy array on xGrid (eV), with every value finite
   */
  private static evaluatePotential(potentialEnergyFunction: PotentialEnergyFunction, xGrid: XGrid): number[] {
    return xGrid.xCoordinates.map((x) => {
      const potentialEnergy = potentialEnergyFunction(x);
      return Number.isFinite(potentialEnergy)
        ? Math.min(potentialEnergy, NumerovSolver.MAX_SOLVER_POTENTIAL_ENERGY)
        : potentialEnergy === Number.NEGATIVE_INFINITY
          ? -NumerovSolver.MAX_SOLVER_POTENTIAL_ENERGY
          : NumerovSolver.MAX_SOLVER_POTENTIAL_ENERGY;
    });
  }
}
