/**
 * Analytical transcendental equations for symmetric double square well.
 *
 * Energy reference convention (matching the simulation):
 * - Left well:  [-L_outer, -L_inner] with V = 0
 * - Barrier:    [-L_inner, +L_inner] with V = V₀
 * - Right well: [+L_inner, +L_outer] with V = 0
 *
 * Where:
 *   L_inner = wellSeparation / 2
 *   L_outer = L_inner + wellWidth
 *
 * Due to symmetry, we solve on x ≥ 0 only:
 *
 * Region I:   [L_inner, L_outer]  → Inside right well (V = 0)
 * Region II:  [0, L_inner]        → Barrier region (V = V₀)
 * Region III: [L_outer, ∞)        → Outside (V = V₀, exponential decay)
 *
 * Wavefunctions have form:
 *
 * EVEN PARITY (ψ'(0) = 0):
 *   Region II (barrier):  ψ = A cosh(κx)
 *   Region I (well):      ψ = B cos(k(x - L_inner)) + C sin(k(x - L_inner))
 *   Region III (outside): ψ = D exp(-α(x - L_outer))
 *
 * ODD PARITY (ψ(0) = 0):
 *   Region II (barrier):  ψ = A sinh(κx)
 *   Region I (well):      ψ = B cos(k(x - L_inner)) + C sin(k(x - L_inner))
 *   Region III (outside): ψ = D exp(-α(x - L_outer))
 *
 * Where:
 *   k² = 2mE/ℏ²           (oscillatory in well, 0 < E < V₀)
 *   κ² = 2m(V₀ - E)/ℏ²    (exponential in barrier, E < V₀)
 *   α² = 2m(V₀ - E)/ℏ²    (same as κ for bound states)
 *
 * REFERENCES FOR TRANSCENDENTAL EQUATIONS:
 * - Griffiths, D. J., & Schroeter, D. F. (2018). "Introduction to Quantum Mechanics" (3rd ed.).
 *   Cambridge University Press. Problem 2.42, pp. 88-89.
 *   https://doi.org/10.1017/9781316995433
 *   Double well as an extension of the finite square well problem.
 *
 * - Cohen-Tannoudji, C., Diu, B., & Laloë, F. (1977). "Quantum Mechanics" (Vol. 1).
 *   Wiley. Complement G_II, pp. 70-85.
 *   Detailed treatment of double-well potential and tunneling doublets.
 *
 * - Razavy, M. (2003). "Quantum Theory of Tunneling". World Scientific.
 *   Section 7.2, pp. 205-220. https://doi.org/10.1142/4984
 *   Double-well potential and tunneling splitting derivation.
 *
 * - Merzbacher, E. (1998). "Quantum Mechanics" (3rd ed.). Wiley.
 *   Section 7.4, pp. 90-95.
 *   Piecewise constant potentials and boundary matching conditions.
 *
 * - Holstein, B. R. (1988). "Anomalies for pedestrians". American Journal of Physics, 61(2), 142-147.
 *   https://doi.org/10.1119/1.17328
 *   Double-well potential and tunneling in quantum field theory context.
 *
 * TRANSCENDENTAL EQUATIONS (from boundary condition matching at x = L_inner and x = L_outer):
 * The derivation follows from requiring continuity of ψ and ψ' at all boundaries.
 * Solutions must alternate in parity: ground state (even), 1st excited (odd), 2nd excited (even), etc.
 * The "tunneling doublet" refers to the nearly-degenerate ground and first excited states.
 *
 * These equations have no closed-form solution and must be solved numerically using root-finding.
 */

import Logger from "../../utils/Logger.js";
import type { BoundStateResult, GridConfig } from "../PotentialFunction.js";
import QuantumConstants from "../QuantumConstants.js";

/**
 * Count the number of nodes (zero crossings) in a wavefunction.
 * For bound states, the n-th eigenstate should have exactly n nodes.
 *
 * @param wavefunction - Wavefunction values on a grid
 * @returns Number of nodes (zero crossings)
 */
function countNodes(wavefunction: number[]): number {
  let nodeCount = 0;

  for (let i = 0; i < wavefunction.length - 1; i++) {
    // Check for sign change (node/zero crossing)
    if (wavefunction[i]! * wavefunction[i + 1]! < 0) {
      nodeCount++;
    }
  }

  return nodeCount;
}

/**
 * Search for missing eigenvalues using node counting as a diagnostic.
 *
 * Uses the theorem that the n-th eigenstate must have exactly n nodes.
 * If state at index n has more than n nodes, we know eigenvalue(s) are missing before it.
 *
 * Performs targeted ultra-fine search in energy gaps where missing states are detected.
 *
 * @returns Object with newly found states
 */
function searchForMissingEigenvalues(
  currentStates: Array<{ energy: number; parity: "even" | "odd" }>,
  Linner: number,
  Louter: number,
  V0: number,
  mass: number,
  gridConfig: GridConfig,
  numStates: number,
): { newStates: Array<{ energy: number; parity: "even" | "odd" }> } {
  const newStates: Array<{ energy: number; parity: "even" | "odd" }> = [];

  // Quick validation: need at least one state to check
  if (currentStates.length === 0) {
    return { newStates };
  }

  // Generate temporary grid for node counting
  const numPoints = Math.min(gridConfig.numPoints, 500); // Use moderate resolution for speed
  const xGrid: number[] = [];
  const dx = (gridConfig.xMax - gridConfig.xMin) / (numPoints - 1);
  for (let i = 0; i < numPoints; i++) {
    xGrid.push(gridConfig.xMin + i * dx);
  }

  // Compute wavefunctions and count nodes for current states
  const statesWithNodes: Array<{
    index: number;
    energy: number;
    parity: "even" | "odd";
    nodeCount: number;
    expectedNodes: number;
  }> = [];

  for (let n = 0; n < Math.min(currentStates.length, numStates); n++) {
    const state = currentStates[n]!;
    const wf = computeDoubleWellWavefunction(state.energy, state.parity, Linner, Louter, V0, mass, xGrid);
    const nodeCount = countNodes(wf);

    statesWithNodes.push({
      index: n,
      energy: state.energy,
      parity: state.parity,
      nodeCount,
      expectedNodes: n,
    });
  }

  // Detect missing states: if state n has k > n nodes, then (k - n) states are missing
  const searchRegions: Array<{
    energyMin: number;
    energyMax: number;
    missingParity: "even" | "odd";
    expectedNodeCount: number;
  }> = [];

  for (let i = 0; i < statesWithNodes.length; i++) {
    const current = statesWithNodes[i]!;

    if (current.nodeCount > current.expectedNodes) {
      // Missing state(s) detected!
      const numMissing = current.nodeCount - current.expectedNodes;

      Logger.debug(
        `Detected missing state(s): Index ${i} has ${current.nodeCount} nodes but should have ${current.expectedNodes}.\n` +
          `  This means ${numMissing} state(s) are missing before this one.`,
      );

      // Determine where to search: between previous state and current state
      const energyMin = i > 0 ? statesWithNodes[i - 1]!.energy : V0 * 1e-6;
      const energyMax = current.energy;

      // Determine expected parity of missing state(s)
      // States alternate: even, odd, even, odd, ...
      // If we're looking for state at index n, parity is "even" if n is even, "odd" if n is odd
      for (let missingIndex = current.expectedNodes; missingIndex < current.nodeCount; missingIndex++) {
        const expectedParity: "even" | "odd" = missingIndex % 2 === 0 ? "even" : "odd";

        searchRegions.push({
          energyMin,
          energyMax,
          missingParity: expectedParity,
          expectedNodeCount: missingIndex,
        });
      }
    }
  }

  // Perform ultra-fine targeted search in each region
  for (const region of searchRegions) {
    Logger.debug(
      `Searching for missing ${region.missingParity} parity state with ${region.expectedNodeCount} nodes\n` +
        `  Energy range: [${region.energyMin.toExponential(4)}, ${region.energyMax.toExponential(4)}] J`,
    );

    // Use the appropriate transcendental equation based on parity
    const searchResults = targetedEigenvalueSearch(
      region.energyMin,
      region.energyMax,
      region.missingParity,
      Linner,
      Louter,
      V0,
      mass,
      xGrid,
      region.expectedNodeCount,
    );

    newStates.push(...searchResults);
  }

  return { newStates };
}

/**
 * Targeted ultra-fine search for a specific missing eigenvalue.
 * Uses 10x finer grid than normal search and validates with node counting.
 */
function targetedEigenvalueSearch(
  Emin: number,
  Emax: number,
  parity: "even" | "odd",
  Linner: number,
  Louter: number,
  V0: number,
  mass: number,
  xGrid: number[],
  expectedNodeCount: number,
): Array<{ energy: number; parity: "even" | "odd" }> {
  const { HBAR } = QuantumConstants;
  const L = Louter - Linner;
  const foundStates: Array<{ energy: number; parity: "even" | "odd" }> = [];

  // Transcendental equation for the specified parity
  const transcendentalEquation = (E: number): number => {
    if (E >= V0 || E <= 0) {
      return Infinity;
    }

    const k = Math.sqrt(2 * mass * E) / HBAR;
    const kappa = Math.sqrt(2 * mass * (V0 - E)) / HBAR;
    const alpha = kappa;

    if (parity === "even") {
      const coshKL = Math.cosh(kappa * Linner);
      const sinhKL = Math.sinh(kappa * Linner);
      const numerator = -k * coshKL * Math.sin(k * L) + kappa * sinhKL * Math.cos(k * L);
      const denominator = coshKL * Math.cos(k * L) + (kappa / k) * sinhKL * Math.sin(k * L);

      // Pole-free form of ψ'/ψ + α (see findEvenParityDoubleWell)
      return (numerator + alpha * denominator) / k;
    } else {
      const sinhKL = Math.sinh(kappa * Linner);
      const coshKL = Math.cosh(kappa * Linner);
      const numerator = -k * sinhKL * Math.sin(k * L) + kappa * coshKL * Math.cos(k * L);
      const denominator = sinhKL * Math.cos(k * L) + (kappa / k) * coshKL * Math.sin(k * L);

      // Pole-free form of ψ'/ψ + α (see findEvenParityDoubleWell)
      return (numerator + alpha * denominator) / k;
    }
  };

  // Ultra-fine search: 10x finer than normal
  const numSearchPoints = 10000;
  const dE = (Emax - Emin) / numSearchPoints;

  for (let i = 0; i < numSearchPoints - 1; i++) {
    const E1 = Emin + i * dE;
    const E2 = Emin + (i + 1) * dE;

    const f1 = transcendentalEquation(E1);
    const f2 = transcendentalEquation(E2);

    if (f1 * f2 < 0 && Number.isFinite(f1) && Number.isFinite(f2)) {
      const root = solveBisection(transcendentalEquation, E1, E2, 1e-14, 150);

      if (root !== null && isValidBoundState(root, Linner, L, V0, mass, parity)) {
        // Validate with node counting
        const wf = computeDoubleWellWavefunction(root, parity, Linner, Louter, V0, mass, xGrid);
        const nodeCount = countNodes(wf);

        if (nodeCount === expectedNodeCount) {
          // Check if this is truly a new state
          const isNew = foundStates.every((s) => Math.abs(s.energy - root) > 1e-9 * Math.abs(root));
          if (isNew) {
            Logger.debug(`  ✓ Found missing ${parity} state: E = ${root.toExponential(6)} J, ${nodeCount} nodes`);
            foundStates.push({ energy: root, parity });
          }
        }
      }
    }
  }

  if (foundStates.length === 0) {
    Logger.debug(`  ✗ No matching state found in this region`);
  }

  return foundStates;
}

/**
 * Analytical solution for symmetric double square well potential.
 *
 * Solves the transcendental equations arising from boundary condition matching
 * to find bound state energies and wavefunctions.
 *
 * Energy convention: Wells at V=0, barrier at V=V₀ (positive).
 * Bound state energies are between 0 and V₀.
 *
 * @param wellWidth - Width of each well (L) in meters
 * @param wellDepth - Height of barrier relative to wells (V₀) in Joules (positive value)
 * @param wellSeparation - Barrier width (edge-to-edge well separation) in meters
 * @param mass - Particle mass in kg
 * @param numStates - Number of energy levels to calculate
 * @param gridConfig - Grid configuration for wavefunction evaluation
 * @returns Bound state results with energies and wavefunctions
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: double-well analytical solve spans many regimes
export function solveDoubleSquareWellAnalytical(
  wellWidth: number,
  wellDepth: number,
  wellSeparation: number,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
): BoundStateResult {
  // Geometry
  const Linner = wellSeparation / 2;
  const Louter = Linner + wellWidth;
  const V0 = wellDepth;

  // Estimate expected number of bound states using WKB approximation
  const estimatedStates = estimateNumberOfBoundStates(wellWidth, V0, mass);

  // Search for extra states to ensure we don't miss any roots
  // For a symmetric double well, states MUST alternate in parity (even, odd, even, odd, ...)
  // We search for more states than needed to ensure robust root-finding
  const searchStates = Math.max(numStates + 4, estimatedStates);

  // Find even parity states
  const evenEnergies = findEvenParityDoubleWell(Linner, Louter, V0, mass, Math.ceil(searchStates / 2));

  // Find odd parity states
  const oddEnergies = findOddParityDoubleWell(Linner, Louter, V0, mass, Math.ceil(searchStates / 2));

  // Combine and sort states by energy
  const combinedStates: Array<{ energy: number; parity: "even" | "odd" }> = [];

  for (const E of evenEnergies) {
    combinedStates.push({ energy: E, parity: "even" });
  }
  for (const E of oddEnergies) {
    combinedStates.push({ energy: E, parity: "odd" });
  }

  // Sort by energy (ascending, lowest energy first)
  combinedStates.sort((a, b) => a.energy - b.energy);

  // Iteratively search for missing eigenvalues using node counting
  // This is critical for ensuring the doublet and other low-lying states are found
  const maxRecoveryAttempts = 3;
  for (let attempt = 0; attempt < maxRecoveryAttempts; attempt++) {
    const recoveryResult = searchForMissingEigenvalues(combinedStates, Linner, Louter, V0, mass, gridConfig, numStates);

    if (recoveryResult.newStates.length === 0) {
      // No missing states detected, we're done
      break;
    }

    Logger.debug(
      `[Recovery Attempt ${attempt + 1}] Found ${recoveryResult.newStates.length} missing eigenvalue(s) via node counting`,
    );

    // Add newly found states and re-sort
    combinedStates.push(...recoveryResult.newStates);
    combinedStates.sort((a, b) => a.energy - b.energy);
  }

  // For symmetric double well, states MUST alternate in parity
  // Ground state is always even, then odd, then even, etc.
  // Filter to ensure proper alternation
  const selectedStates: Array<{ energy: number; parity: "even" | "odd" }> = [];
  let expectedParity: "even" | "odd" = "even"; // Ground state is even

  for (const state of combinedStates) {
    if (state.parity === expectedParity) {
      selectedStates.push(state);
      // Alternate expected parity
      expectedParity = expectedParity === "even" ? "odd" : "even";

      // Stop when we have enough states
      if (selectedStates.length >= numStates) {
        break;
      }
    }
  }

  // Validate that we found enough states
  if (selectedStates.length < numStates) {
    // Count how many states of each parity we found
    const evenCount = evenEnergies.length;
    const oddCount = oddEnergies.length;

    Logger.warn(
      `Warning: Only found ${selectedStates.length} properly alternating states out of ${numStates} requested.\n` +
        `  Even parity states found: ${evenCount}\n` +
        `  Odd parity states found: ${oddCount}\n` +
        `  WKB estimate suggests ~${estimatedStates} total states should exist.\n` +
        `  This may indicate:\n` +
        `    - Missing eigenvalues despite adaptive search\n` +
        `    - Parameter regime near continuum threshold\n` +
        `    - Need for finer grid resolution in specific energy regions`,
    );
  }

  // Check if we're significantly below WKB estimate
  if (selectedStates.length < estimatedStates * 0.7) {
    Logger.warn(
      `Warning: Found ${selectedStates.length} states but WKB approximation suggests ~${estimatedStates} should exist.\n` +
        `  Significant shortfall detected - some eigenvalues may be missing.`,
    );
  }

  // Generate grid
  const numPoints = gridConfig.numPoints;
  const xGrid: number[] = [];
  const dx = (gridConfig.xMax - gridConfig.xMin) / (numPoints - 1);
  for (let i = 0; i < numPoints; i++) {
    xGrid.push(gridConfig.xMin + i * dx);
  }

  // Generate wavefunctions
  const wavefunctions: number[][] = [];
  const energies: number[] = [];

  for (const state of selectedStates) {
    const wf = computeDoubleWellWavefunction(state.energy, state.parity, Linner, Louter, V0, mass, xGrid);
    wavefunctions.push(wf);
    energies.push(state.energy);
  }

  // CRITICAL VALIDATION: Check for missing low-lying states using node count
  // The n-th eigenstate MUST have exactly n nodes
  // Ground state (n=0): 0 nodes, First excited (n=1): 1 node, etc.
  const missingStates: number[] = [];

  for (let n = 0; n < Math.min(selectedStates.length, numStates); n++) {
    const expectedNodes = n;
    const actualNodes = countNodes(wavefunctions[n]!);

    if (actualNodes !== expectedNodes) {
      missingStates.push(n);
      Logger.warn(
        `WARNING: State ${n} has ${actualNodes} nodes but should have ${expectedNodes} nodes!\n` +
          `  This indicates a missing eigenvalue before this state.\n` +
          `  Energy = ${energies[n]!.toExponential(6)} J\n` +
          `  Parity = ${selectedStates[n]!.parity}\n` +
          `  Expected sequence: n=0 (even, 0 nodes), n=1 (odd, 1 node), n=2 (even, 2 nodes), ...`,
      );
    }
  }

  // Special check for doublet (first two states)
  if (selectedStates.length >= 2) {
    // Ground state MUST be even parity with 0 nodes
    if (selectedStates[0]!.parity !== "even") {
      Logger.warn(
        `CRITICAL: Ground state has ${selectedStates[0]!.parity} parity but MUST be even!\n` +
          `  This indicates the true ground state is missing.\n` +
          `  Current ground state energy: ${energies[0]!.toExponential(6)} J`,
      );
      missingStates.push(0);
    }

    // First excited state MUST be odd parity with 1 node
    if (selectedStates[1]!.parity !== "odd") {
      Logger.warn(
        `CRITICAL: First excited state has ${selectedStates[1]!.parity} parity but MUST be odd!\n` +
          `  This indicates the doublet partner is missing.\n` +
          `  Current first excited state energy: ${energies[1]!.toExponential(6)} J`,
      );
      missingStates.push(1);
    }

    // Check doublet energy splitting
    const splitting = energies[1]! - energies[0]!;
    const splittingPercent = (splitting / V0) * 100;

    if (splitting < 0) {
      Logger.error(
        `CRITICAL ERROR: First excited state energy is LOWER than ground state!\n` +
          `  Ground state: ${energies[0]!.toExponential(6)} J (${selectedStates[0]!.parity})\n` +
          `  First excited: ${energies[1]!.toExponential(6)} J (${selectedStates[1]!.parity})\n` +
          `  This violates the variational principle and indicates missing states.`,
      );
    } else if (splittingPercent > 50) {
      Logger.warn(
        `WARNING: Doublet splitting is unusually large (${splittingPercent.toFixed(2)}% of V₀).\n` +
          `  This may indicate a missing state between the ground and first excited states.\n` +
          `  Typical doublet splittings are much smaller due to tunneling suppression.`,
      );
    }
  }

  if (missingStates.length > 0) {
    Logger.warn(
      `\n=== SUMMARY: Missing states detected at indices: ${missingStates.join(", ")} ===\n` +
        `  Total states found: ${selectedStates.length}\n` +
        `  States requested: ${numStates}\n` +
        `  Recommendation: Increase search resolution or check potential parameters.`,
    );
  }

  return {
    energies,
    wavefunctions,
    xGrid,
    method: "analytical",
  };
}

/**
 * Validate that an energy is a true bound state, not a spurious root.
 *
 * Checks that:
 * 1. The wavefunction value at the outer boundary (D) is not too small
 * 2. The derivative matching condition is satisfied (small residual)
 *
 * Spurious roots can occur when D ≈ 0, causing a pole in the transcendental
 * equation that gets mistaken for a zero crossing.
 */
function isValidBoundState(
  E: number,
  Linner: number,
  L: number,
  V0: number,
  mass: number,
  parity: "even" | "odd",
): boolean {
  const { HBAR } = QuantumConstants;

  // Wave numbers
  const k = Math.sqrt(2 * mass * E) / HBAR;
  const kappa = Math.sqrt(2 * mass * (V0 - E)) / HBAR;
  const alpha = kappa;

  // Calculate coefficients
  let B: number, C: number;
  if (parity === "even") {
    B = Math.cosh(kappa * Linner);
    C = (kappa / k) * Math.sinh(kappa * Linner);
  } else {
    B = Math.sinh(kappa * Linner);
    C = (kappa / k) * Math.cosh(kappa * Linner);
  }

  // Calculate D (wavefunction value at outer boundary)
  const D = B * Math.cos(k * L) + C * Math.sin(k * L);

  // Reject if D is too small (near-node at boundary)
  // Use relative threshold compared to B (typical barrier value)
  // A very small D indicates a spurious pole in the transcendental equation
  const relativeDThreshold = 0.001; // 0.1% of typical barrier amplitude
  if (Math.abs(D) < Math.abs(B) * relativeDThreshold) {
    return false;
  }

  // Verify derivative matching condition
  const numerator = -k * B * Math.sin(k * L) + k * C * Math.cos(k * L);
  const denominator = D;

  const lhs = numerator / denominator; // ψ'/ψ from inside
  const rhs = -alpha; // ψ'/ψ from outside (should match)

  // Check that matching condition is satisfied
  // Allow for some numerical error in the root-finding
  const relativeError = Math.abs((lhs - rhs) / rhs);
  const matchingTolerance = 0.05; // 5% relative error

  if (relativeError > matchingTolerance) {
    return false;
  }

  return true;
}

/**
 * Estimate the expected number of bound states using semiclassical WKB approximation.
 *
 * For a double square well, the number of bound states is approximately:
 * N ≈ (2 * wellWidth) * sqrt(2 * m * V0) / (π * ℏ)
 *
 * This gives a rough upper bound on the number of states we should find.
 */
function estimateNumberOfBoundStates(wellWidth: number, V0: number, mass: number): number {
  const { HBAR } = QuantumConstants;

  // WKB approximation for total well width (both wells combined)
  const totalWellWidth = 2 * wellWidth;
  const estimate = (totalWellWidth * Math.sqrt(2 * mass * V0)) / (Math.PI * HBAR);

  // Round up to get conservative estimate
  return Math.ceil(estimate);
}

/**
 * Detect suspiciously large gaps in the energy spectrum that might indicate missing eigenvalues.
 *
 * Returns intervals [E1, E2] where additional search should be performed.
 */
function detectEnergyGaps(energies: number[], V0: number): Array<{ start: number; end: number }> {
  if (energies.length < 2) {
    return [];
  }

  const gaps: Array<{ start: number; end: number }> = [];

  // Calculate typical energy spacing
  const spacings: number[] = [];
  for (let i = 1; i < energies.length; i++) {
    spacings.push(energies[i]! - energies[i - 1]!);
  }

  // Use median spacing as reference (more robust than mean)
  spacings.sort((a, b) => a - b);
  const medianSpacing = spacings[Math.floor(spacings.length / 2)]!;

  // Flag gaps that are significantly larger than median (3x threshold)
  const gapThreshold = 3.0 * medianSpacing;

  for (let i = 1; i < energies.length; i++) {
    const gap = energies[i]! - energies[i - 1]!;
    if (gap > gapThreshold && gap > V0 * 0.01) {
      // Also must be > 1% of V0
      gaps.push({
        start: energies[i - 1]!,
        end: energies[i]!,
      });
    }
  }

  return gaps;
}

/**
 * Perform adaptive search in a specific energy interval with increased resolution.
 *
 * Uses a finer grid to search for roots that might have been missed in the initial sweep.
 */
function searchInInterval(
  transcendentalEq: (E: number) => number,
  validator: (E: number) => boolean,
  Estart: number,
  Eend: number,
  maxRoots: number,
): number[] {
  const roots: number[] = [];

  // Use very fine grid for adaptive search
  const numSearchPoints = 5000; // 5x finer than initial search
  const dE = (Eend - Estart) / numSearchPoints;

  for (let i = 0; i < numSearchPoints - 1; i++) {
    const E1 = Estart + i * dE;
    const E2 = Estart + (i + 1) * dE;

    const f1 = transcendentalEq(E1);
    const f2 = transcendentalEq(E2);

    // Check for sign change (root exists)
    if (f1 * f2 < 0 && Number.isFinite(f1) && Number.isFinite(f2)) {
      const root = solveBisection(transcendentalEq, E1, E2, 1e-12, 100);
      if (root !== null && validator(root)) {
        // Check if this root is new (not already found)
        const isNew = roots.every((existingRoot) => Math.abs(root - existingRoot) > 1e-9 * Math.abs(existingRoot));
        if (isNew) {
          roots.push(root);
          if (roots.length >= maxRoots) {
            break;
          }
        }
      }
    }
  }

  return roots;
}

/**
 * Find even parity bound states: ψ'(0) = 0
 *
 * Matching conditions give us a transcendental equation in E.
 *
 * From boundary matching:
 * - At x = L_inner: A cosh(κL_i) = B, Aκ sinh(κL_i) = -kC
 * - At x = L_outer: B cos(kL) + C sin(kL) = D, -k[B sin(kL) - C cos(kL)] = -αD
 *
 * Where L = L_outer - L_inner = wellWidth
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: even-parity root search has many energy brackets
function findEvenParityDoubleWell(
  Linner: number,
  Louter: number,
  V0: number,
  mass: number,
  maxStates: number,
): number[] {
  const { HBAR } = QuantumConstants;
  const energies: number[] = [];
  const L = Louter - Linner; // wellWidth

  /**
   * Transcendental equation for even parity states.
   * Returns f(E) = 0 when E is an eigenvalue.
   */
  const transcendentalEquation = (E: number): number => {
    // Must be bound state (below barrier top)
    if (E >= V0) {
      return Infinity;
    }

    // Must be above well bottom
    if (E <= 0) {
      return Infinity;
    }

    // Wave numbers
    const k = Math.sqrt(2 * mass * E) / HBAR; // In wells
    const kappa = Math.sqrt(2 * mass * (V0 - E)) / HBAR; // In barrier
    const alpha = kappa; // Same for bound states (outside also at V₀)

    // Hyperbolic functions at barrier/well interface
    const coshKL = Math.cosh(kappa * Linner);
    const sinhKL = Math.sinh(kappa * Linner);

    // From matching conditions:
    // B = cosh(κL_i), C = (κ/k)sinh(κL_i)
    // Substituting into well/outside matching:
    // ψ'_well = -Bk sin(kL) + Ck cos(kL) = -α D
    // ψ_well = B cos(kL) + C sin(kL) = D

    const numerator = -k * coshKL * Math.sin(k * L) + k * (kappa / k) * sinhKL * Math.cos(k * L);
    const denominator = coshKL * Math.cos(k * L) + (kappa / k) * sinhKL * Math.sin(k * L);

    // Matching condition ψ'_well/ψ_well = −α, multiplied through by ψ_well (= denominator) so the
    // function has no poles: the ratio form changes sign at poles too, and those spurious brackets
    // (rejected later) could hide a neighbouring true root. Divided by k to keep it O(κ).
    return (numerator + alpha * denominator) / k;
  };

  // Search for roots in energy range
  // Start slightly above zero to avoid numerical issues at E=0
  const Emin = V0 * 1e-6; // Tiny offset above well bottom
  const Emax = V0 * 0.9999; // Slightly below barrier top to avoid continuum

  // CRITICAL: Doublet search for ground state (even parity)
  // The ground state in a double well MUST be even parity and is often very low in energy.
  // Search the lowest 5% of energy range with ultra-fine resolution to ensure we find it.
  const doubletSearchMax = Emin + (Emax - Emin) * 0.05;
  const doubletSearchPoints = 3000; // Extra-fine grid for doublet
  const dEDoublet = (doubletSearchMax - Emin) / doubletSearchPoints;

  for (let i = 0; i < doubletSearchPoints - 1; i++) {
    const E1 = Emin + i * dEDoublet;
    const E2 = Emin + (i + 1) * dEDoublet;

    const f1 = transcendentalEquation(E1);
    const f2 = transcendentalEquation(E2);

    if (f1 * f2 < 0 && Number.isFinite(f1) && Number.isFinite(f2)) {
      const root = solveBisection(transcendentalEquation, E1, E2, 1e-14, 150);
      if (root !== null && isValidBoundState(root, Linner, L, V0, mass, "even")) {
        // Check if this root is new (not already found)
        const isNew = energies.every((existingRoot) => Math.abs(root - existingRoot) > 1e-9 * Math.abs(existingRoot));
        if (isNew) {
          energies.push(root);
        }
      }
    }
  }

  // Phase 1: Initial systematic search with bisection (now starting after doublet region)
  const numSearchPoints = 1500;
  const dE = (Emax - doubletSearchMax) / numSearchPoints;

  for (let i = 0; i < numSearchPoints - 1; i++) {
    const E1 = doubletSearchMax + i * dE;
    const E2 = doubletSearchMax + (i + 1) * dE;

    const f1 = transcendentalEquation(E1);
    const f2 = transcendentalEquation(E2);

    // Check for sign change (root exists)
    if (f1 * f2 < 0 && Number.isFinite(f1) && Number.isFinite(f2)) {
      const root = solveBisection(transcendentalEquation, E1, E2, 1e-12, 100);
      if (root !== null) {
        // Validate this is a true bound state, not a spurious root
        if (isValidBoundState(root, Linner, L, V0, mass, "even")) {
          energies.push(root);
        }
      }
    }
  }

  // Phase 2: Detect gaps and perform adaptive search
  if (energies.length > 0 && energies.length < maxStates) {
    const gaps = detectEnergyGaps(energies, V0);

    if (gaps.length > 0) {
      // Create validator closure
      const validator = (E: number) => isValidBoundState(E, Linner, L, V0, mass, "even");

      // Search in each gap region
      for (const gap of gaps) {
        const additionalRoots = searchInInterval(
          transcendentalEquation,
          validator,
          gap.start,
          gap.end,
          maxStates - energies.length,
        );

        // Add new roots and re-sort
        energies.push(...additionalRoots);
        energies.sort((a, b) => a - b);

        if (energies.length >= maxStates) {
          break;
        }
      }
    }
  }

  return energies;
}

/**
 * Find odd parity bound states: ψ(0) = 0
 *
 * Similar derivation but with sinh instead of cosh in barrier.
 *
 * From boundary matching:
 * - At x = L_inner: A sinh(κL_i) = B, Aκ cosh(κL_i) = -kC
 * - At x = L_outer: B cos(kL) + C sin(kL) = D, -k[B sin(kL) - C cos(kL)] = -αD
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: odd-parity root search has many energy brackets
function findOddParityDoubleWell(
  Linner: number,
  Louter: number,
  V0: number,
  mass: number,
  maxStates: number,
): number[] {
  const { HBAR } = QuantumConstants;
  const energies: number[] = [];
  const L = Louter - Linner; // wellWidth

  /**
   * Transcendental equation for odd parity states.
   * Returns f(E) = 0 when E is an eigenvalue.
   */
  const transcendentalEquation = (E: number): number => {
    if (E >= V0) {
      return Infinity;
    }

    if (E <= 0) {
      return Infinity;
    }

    const k = Math.sqrt(2 * mass * E) / HBAR;
    const kappa = Math.sqrt(2 * mass * (V0 - E)) / HBAR;
    const alpha = kappa;

    // Hyperbolic functions at barrier/well interface
    const sinhKL = Math.sinh(kappa * Linner);
    const coshKL = Math.cosh(kappa * Linner);

    // From matching conditions:
    // B = sinh(κL_i), C = (κ/k)cosh(κL_i)
    // ψ'_well = -Bk sin(kL) + Ck cos(kL) = -α D
    // ψ_well = B cos(kL) + C sin(kL) = D

    const numerator = -k * sinhKL * Math.sin(k * L) + k * (kappa / k) * coshKL * Math.cos(k * L);
    const denominator = sinhKL * Math.cos(k * L) + (kappa / k) * coshKL * Math.sin(k * L);

    // Matching condition ψ'_well/ψ_well = −α, multiplied through by ψ_well (= denominator) so the
    // function has no poles: the ratio form changes sign at poles too, and those spurious brackets
    // (rejected later) could hide a neighbouring true root. Divided by k to keep it O(κ).
    return (numerator + alpha * denominator) / k;
  };

  // Search for roots in energy range
  // Start slightly above zero to avoid numerical issues at E=0
  const Emin = V0 * 1e-6; // Tiny offset above well bottom
  const Emax = V0 * 0.9999; // Slightly below barrier top to avoid continuum

  // CRITICAL: Doublet search for first excited state (odd parity)
  // The first excited state in a double well MUST be odd parity and is very close to ground state.
  // Search the lowest 5% of energy range with ultra-fine resolution to ensure we find it.
  const doubletSearchMax = Emin + (Emax - Emin) * 0.05;
  const doubletSearchPoints = 3000; // Extra-fine grid for doublet
  const dEDoublet = (doubletSearchMax - Emin) / doubletSearchPoints;

  for (let i = 0; i < doubletSearchPoints - 1; i++) {
    const E1 = Emin + i * dEDoublet;
    const E2 = Emin + (i + 1) * dEDoublet;

    const f1 = transcendentalEquation(E1);
    const f2 = transcendentalEquation(E2);

    if (f1 * f2 < 0 && Number.isFinite(f1) && Number.isFinite(f2)) {
      const root = solveBisection(transcendentalEquation, E1, E2, 1e-14, 150);
      if (root !== null && isValidBoundState(root, Linner, L, V0, mass, "odd")) {
        // Check if this root is new (not already found)
        const isNew = energies.every((existingRoot) => Math.abs(root - existingRoot) > 1e-9 * Math.abs(existingRoot));
        if (isNew) {
          energies.push(root);
        }
      }
    }
  }

  // Phase 1: Initial systematic search (now starting after doublet region)
  const numSearchPoints = 1500;
  const dE = (Emax - doubletSearchMax) / numSearchPoints;

  for (let i = 0; i < numSearchPoints - 1; i++) {
    const E1 = doubletSearchMax + i * dE;
    const E2 = doubletSearchMax + (i + 1) * dE;

    const f1 = transcendentalEquation(E1);
    const f2 = transcendentalEquation(E2);

    if (f1 * f2 < 0 && Number.isFinite(f1) && Number.isFinite(f2)) {
      const root = solveBisection(transcendentalEquation, E1, E2, 1e-12, 100);
      if (root !== null) {
        // Validate this is a true bound state, not a spurious root
        if (isValidBoundState(root, Linner, L, V0, mass, "odd")) {
          energies.push(root);
        }
      }
    }
  }

  // Phase 2: Detect gaps and perform adaptive search
  if (energies.length > 0 && energies.length < maxStates) {
    const gaps = detectEnergyGaps(energies, V0);

    if (gaps.length > 0) {
      // Create validator closure
      const validator = (E: number) => isValidBoundState(E, Linner, L, V0, mass, "odd");

      // Search in each gap region
      for (const gap of gaps) {
        const additionalRoots = searchInInterval(
          transcendentalEquation,
          validator,
          gap.start,
          gap.end,
          maxStates - energies.length,
        );

        // Add new roots and re-sort
        energies.push(...additionalRoots);
        energies.sort((a, b) => a - b);

        if (energies.length >= maxStates) {
          break;
        }
      }
    }
  }

  return energies;
}

/**
 * Compute wavefunction for a given energy and parity on the provided grid.
 *
 * Constructs the full wavefunction by matching boundary conditions and normalizing.
 *
 * Energy convention: Wells at V=0, barrier at V=V₀.
 *
 * @param E - Energy eigenvalue (between 0 and V₀)
 * @param parity - "even" or "odd" parity
 * @param Linner - Inner boundary (half the barrier width)
 * @param Louter - Outer boundary (Linner + wellWidth)
 * @param V0 - Barrier height (positive)
 * @param mass - Particle mass
 * @param xGrid - Position grid
 * @returns Normalized wavefunction values
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: piecewise double-well ψ construction
function computeDoubleWellWavefunction(
  E: number,
  parity: "even" | "odd",
  Linner: number,
  Louter: number,
  V0: number,
  mass: number,
  xGrid: number[],
): number[] {
  const { HBAR } = QuantumConstants;
  const k = Math.sqrt(2 * mass * E) / HBAR;
  const kappa = Math.sqrt(2 * mass * (V0 - E)) / HBAR;
  const alpha = kappa;

  const L = Louter - Linner; // wellWidth

  // Solve for coefficients A, B, C, D from matching conditions
  // Set A = 1 for convenience, then normalize at end

  const A = 1.0;
  let B: number, C: number;

  if (parity === "even") {
    // A cosh(κ L_inner) = B
    B = Math.cosh(kappa * Linner);
    // A κ sinh(κ L_inner) = k C
    C = (kappa / k) * Math.sinh(kappa * Linner);
  } else {
    // A sinh(κ L_inner) = B
    B = Math.sinh(kappa * Linner);
    // A κ cosh(κ L_inner) = k C
    C = (kappa / k) * Math.cosh(kappa * Linner);
  }

  // From well/outside matching:
  // B cos(kL) + C sin(kL) = D
  const D = B * Math.cos(k * L) + C * Math.sin(k * L);

  // Evaluate on grid (not yet normalized)
  const psi: number[] = [];

  for (const x of xGrid) {
    let value: number;

    if (x >= 0) {
      // Right half: evaluate directly
      if (x < Linner) {
        // Barrier region (0 to L_inner)
        if (parity === "even") {
          value = A * Math.cosh(kappa * x);
        } else {
          value = A * Math.sinh(kappa * x);
        }
      } else if (x < Louter) {
        // Inside right well (L_inner to L_outer)
        const xShifted = x - Linner;
        value = B * Math.cos(k * xShifted) + C * Math.sin(k * xShifted);
      } else {
        // Outside right well (x > L_outer)
        value = D * Math.exp(-alpha * (x - Louter));
      }
    } else {
      // Left half: use symmetry/antisymmetry
      const absX = -x;

      if (absX < Linner) {
        // Barrier region
        if (parity === "even") {
          value = A * Math.cosh(kappa * absX);
        } else {
          value = -A * Math.sinh(kappa * absX); // Antisymmetric
        }
      } else if (absX < Louter) {
        // Inside left well
        const xShifted = absX - Linner;
        const valueRight = B * Math.cos(k * xShifted) + C * Math.sin(k * xShifted);
        value = parity === "even" ? valueRight : -valueRight;
      } else {
        // Outside left well
        const valueRight = D * Math.exp(-alpha * (absX - Louter));
        value = parity === "even" ? valueRight : -valueRight;
      }
    }

    psi.push(value);
  }

  // Normalize using trapezoidal rule
  const dx = xGrid[1]! - xGrid[0]!;
  const normSq = psi.reduce((sum, val) => sum + val * val, 0) * dx;
  const norm = Math.sqrt(normSq);

  return psi.map((val) => val / norm);
}

/**
 * Solve equation f(x) = 0 using bisection method.
 * Robust root-finding algorithm for continuous functions.
 *
 * @param f - Function to find root of
 * @param xMin - Lower bound of search interval
 * @param xMax - Upper bound of search interval
 * @param tolerance - Convergence tolerance
 * @param maxIterations - Maximum number of iterations
 * @returns Root if found, null otherwise
 */
function solveBisection(
  f: (x: number) => number,
  xMin: number,
  xMax: number,
  tolerance: number, // relative to |x|
  maxIterations: number,
): number | null {
  let a = xMin;
  let b = xMax;

  // Check if function values have opposite signs
  const fa = f(a);
  const fb = f(b);

  if (fa * fb > 0) {
    // No sign change, bisection won't work
    return null;
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    const c = (a + b) / 2;
    const fc = f(c);

    // Converged once the bracket is small relative to the energy (~1e-19 J). The old absolute test
    // (b − a)/2 < 1e-12 J held immediately, so "roots" were just midpoints of the scan brackets.
    if (fc === 0 || (b - a) / 2 <= tolerance * Math.max(Math.abs(a), Math.abs(b))) {
      return c;
    }

    // Update interval
    if (fa * fc < 0) {
      b = c;
    } else {
      a = c;
    }
  }

  // The bracket still contains the sign change; return its midpoint
  return (a + b) / 2;
}
