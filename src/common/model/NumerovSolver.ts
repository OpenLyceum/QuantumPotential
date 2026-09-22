/**
 * Numerov method for solving the 1D time-independent Schrödinger equation.
 * Uses the higher-order Numerov formula with O(h^6) error.
 *
 * The TISE is: -ℏ²/(2m) d²ψ/dx² + V(x)ψ = Eψ
 * Rearranged as: d²ψ/dx² = -k²(x)ψ where k²(x) = 2m(E - V(x))/ℏ²
 *
 * Numerov formula: ψ_(j+1) = [(2 - 10f_j)ψ_j - (1+f_(j-1))ψ_(j-1)] / (1+f_(j+1))
 * where f_j = (h²/12) k²(x_j)
 */

import qppw from "../../QPPWNamespace.js";
import type { BoundStateResult, GridConfig, PotentialFunction } from "./PotentialFunction.js";
import QuantumConstants from "./QuantumConstants.js";

/**
 * Solve the 1D Schrödinger equation using the Numerov method.
 *
 * @param potential - Function V(x) that returns potential energy in Joules
 * @param mass - Particle mass in kg
 * @param numStates - Number of bound states to find
 * @param gridConfig - Grid configuration
 * @param energyMin - Minimum energy to search (Joules)
 * @param energyMax - Maximum energy to search (Joules)
 * @returns Bound state results
 */
export function solveNumerov(
  potential: PotentialFunction,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
  energyMin: number,
  energyMax: number,
): BoundStateResult {
  const { xMin, xMax, numPoints } = gridConfig;
  const dx = (xMax - xMin) / (numPoints - 1);

  // Generate grid
  const xGrid: number[] = [];
  for (let i = 0; i < numPoints; i++) {
    xGrid.push(xMin + i * dx);
  }

  // Evaluate potential on grid
  const V = xGrid.map(potential);

  // Find bound state energies using shooting method
  const energies: number[] = [];
  const wavefunctions: number[][] = [];

  // Search for energies where wavefunction satisfies boundary conditions
  const energyStep = (energyMax - energyMin) / 1000;
  let prevSign = 0;

  for (let E = energyMin; E <= energyMax && energies.length < numStates; E += energyStep) {
    const psi = integrateNumerov(E, V, xGrid, dx, mass);
    const endValue = psi[numPoints - 1]!;

    // Check for sign change (indicates bound state)
    const currentSign = Math.sign(endValue);
    if (prevSign !== 0 && currentSign !== prevSign) {
      // Refine energy using bisection
      const refinedEnergy = refineEnergy(E - energyStep, E, V, xGrid, dx, mass);
      energies.push(refinedEnergy);

      // Calculate normalized wavefunction
      const refinedPsi = integrateNumerov(refinedEnergy, V, xGrid, dx, mass);
      const normalizedPsi = normalizeWavefunction(refinedPsi, dx);
      wavefunctions.push(normalizedPsi);
    }
    prevSign = currentSign;
  }

  return {
    energies,
    wavefunctions,
    xGrid,
    method: "numerov",
  };
}

/**
 * Integrate the Schrödinger equation using Numerov formula.
 *
 * @param E - Energy eigenvalue to test (Joules)
 * @param V - Potential energy array (Joules)
 * @param xGrid - Spatial grid (meters)
 * @param dx - Grid spacing (meters)
 * @param mass - Particle mass (kg)
 * @returns Wavefunction array
 */
export function integrateNumerov(E: number, V: number[], xGrid: number[], dx: number, mass: number): number[] {
  const { HBAR } = QuantumConstants;
  const N = xGrid.length;
  const psi = new Array(N).fill(0);

  // Calculate k²(x) = 2m(E - V(x))/ℏ²
  const k2 = V.map((v) => (2 * mass * (E - v)) / (HBAR * HBAR));

  // Calculate f_j = (h²/12) * k²(x_j)
  const f = k2.map((k) => ((dx * dx) / 12) * k);

  // Initial conditions (boundary condition: ψ(x_min) = 0)
  psi[0] = 0;
  psi[1] = dx; // Small non-zero value

  // Numerov forward integration
  for (let j = 1; j < N - 1; j++) {
    const numerator = (2 - 10 * f[j]!) * psi[j] - (1 + f[j - 1]!) * psi[j - 1];
    const denominator = 1 + f[j + 1]!;
    psi[j + 1] = numerator / denominator;

    // Check for divergence (not a bound state)
    if (Math.abs(psi[j + 1]) > 1e10) {
      // Force large value to indicate divergence
      for (let k = j + 1; k < N; k++) {
        psi[k] = psi[j + 1];
      }
      break;
    }
  }

  return psi;
}

/**
 * Integrate for symmetric double well potentials using standard shooting method.
 * For symmetric potentials, use parity to integrate only half the domain.
 *
 * Due to symmetry, we can integrate from x=0 to x_max and use parity to fill the left half.
 * - Symmetric states: ψ(-x) = ψ(x), so ψ'(0) = 0
 * - Antisymmetric states: ψ(-x) = -ψ(x), so ψ(0) = 0
 * - Shooting parameter: ψ(x_max) should be zero for bound states
 *
 * @param E - Energy eigenvalue
 * @param V - Potential array
 * @param xGrid - Spatial grid (must be symmetric around x=0)
 * @param dx - Grid spacing
 * @param mass - Particle mass
 * @param parity - "symmetric" or "antisymmetric"
 * @returns Wavefunction array
 */
export function integrateNumerovFromCenter(
  E: number,
  V: number[],
  xGrid: number[],
  dx: number,
  mass: number,
  parity: "symmetric" | "antisymmetric",
): number[] {
  const { HBAR } = QuantumConstants;
  const N = xGrid.length;
  const psi = new Array(N).fill(0);

  // Find center index (closest to x=0)
  let centerIdx = 0;
  let minDist = Math.abs(xGrid[0]!);
  for (let i = 1; i < N; i++) {
    const dist = Math.abs(xGrid[i]!);
    if (dist < minDist) {
      minDist = dist;
      centerIdx = i;
    }
  }

  // Calculate k²(x) = 2m(E - V(x))/ℏ²
  const k2 = V.map((v) => (2 * mass * (E - v)) / (HBAR * HBAR));

  // Calculate f_j = (h²/12) * k²(x_j)
  const f = k2.map((k) => ((dx * dx) / 12) * k);

  // Initial conditions at x=0 based on parity
  // For shooting method from center with symmetric potential:
  // - Symmetric states: ψ(0) = A (constant), ψ'(0) = 0
  // - Antisymmetric states: ψ(0) = 0, ψ'(0) = B

  if (parity === "symmetric") {
    // Symmetric state: ψ(-x) = ψ(x)
    // At x=0: ψ'(0) = 0 (derivative must be zero for symmetry)
    // Use Taylor expansion: ψ(dx) ≈ ψ(0) + ψ''(0)·dx²/2
    // From Schrödinger equation: ψ'' = -k²ψ
    // So ψ(dx) = ψ(0)·(1 - k²·dx²/2) = ψ(0)·(1 - 6f) where f = k²·dx²/12
    psi[centerIdx] = 1.0;
    psi[centerIdx + 1] = 1.0 * (1 - 6 * f[centerIdx]!);
  } else {
    // Antisymmetric state: ψ(-x) = -ψ(x)
    // At x=0: ψ(0) = 0 (wavefunction must be zero for antisymmetry)
    // So ψ(0) = 0 and ψ(dx) ≈ ψ'(0)*dx (linear start)
    psi[centerIdx] = 0.0;
    psi[centerIdx + 1] = dx; // Linear start from zero
  }

  // Integrate from center (x=0) to right boundary (x_max)
  // Apply periodic renormalization to prevent exponential overflow
  const renormalizationInterval = 50; // Renormalize every 50 steps

  for (let j = centerIdx + 1; j < N - 1; j++) {
    const numerator = (2 - 10 * f[j]!) * psi[j] - (1 + f[j - 1]!) * psi[j - 1];
    const denominator = 1 + f[j + 1]!;
    psi[j + 1] = numerator / denominator;

    // Stop on catastrophic numerical failure
    if (!isFinite(psi[j + 1])) {
      for (let k = j + 1; k < N; k++) {
        psi[k] = 1e100;
      }
      break;
    }

    // Periodic renormalization to prevent exponential growth
    // For non-eigenvalue energies, wavefunction grows exponentially in classically forbidden regions
    // Renormalization preserves the relative behavior (sign changes) while preventing overflow
    if ((j - centerIdx) % renormalizationInterval === 0) {
      // Find maximum absolute value in computed region
      let maxAbs = 0;
      for (let k = centerIdx; k <= j + 1; k++) {
        maxAbs = Math.max(maxAbs, Math.abs(psi[k]));
      }

      // Renormalize if getting too large (but not if too small, which is normal decay)
      if (maxAbs > 1e10) {
        const scale = 1.0 / maxAbs;
        for (let k = centerIdx; k <= j + 1; k++) {
          psi[k] *= scale;
        }
      }
    }
  }

  // Use parity to fill left half
  if (parity === "symmetric") {
    for (let i = 0; i < centerIdx; i++) {
      const mirrorIdx = 2 * centerIdx - i;
      if (mirrorIdx < N) {
        psi[i] = psi[mirrorIdx];
      }
    }
  } else {
    for (let i = 0; i < centerIdx; i++) {
      const mirrorIdx = 2 * centerIdx - i;
      if (mirrorIdx < N) {
        psi[i] = -psi[mirrorIdx];
      }
    }
  }

  return psi;
}

/**
 * Refine energy eigenvalue using bisection method.
 *
 * @param E1 - Lower energy bound (Joules)
 * @param E2 - Upper energy bound (Joules)
 * @param V - Potential energy array (Joules)
 * @param xGrid - Spatial grid (meters)
 * @param dx - Grid spacing (meters)
 * @param mass - Particle mass (kg)
 * @param tolerance - Energy tolerance (default 1e-10 Joules)
 * @returns Refined energy eigenvalue (Joules)
 */
export function refineEnergy(
  E1: number,
  E2: number,
  V: number[],
  xGrid: number[],
  dx: number,
  mass: number,
  tolerance = 1e-10,
): number {
  const N = xGrid.length;
  let Elow = E1;
  let Ehigh = E2;

  while (Ehigh - Elow > tolerance) {
    const Emid = (Elow + Ehigh) / 2;
    const psi = integrateNumerov(Emid, V, xGrid, dx, mass);
    const endValue = psi[N - 1]!;

    const psiLow = integrateNumerov(Elow, V, xGrid, dx, mass);
    const endValueLow = psiLow[N - 1]!;

    if (Math.sign(endValue) === Math.sign(endValueLow)) {
      Elow = Emid;
    } else {
      Ehigh = Emid;
    }
  }

  return (Elow + Ehigh) / 2;
}

/**
 * Normalize a wavefunction using trapezoidal rule.
 *
 * @param psi - Wavefunction array
 * @param dx - Grid spacing (meters)
 * @returns Normalized wavefunction
 */
export function normalizeWavefunction(psi: number[], dx: number): number[] {
  // Calculate ∫|ψ|² dx using trapezoidal rule
  let integral = 0;
  for (let i = 0; i < psi.length - 1; i++) {
    integral += (psi[i]! * psi[i]! + psi[i + 1]! * psi[i + 1]!) / 2;
  }
  integral *= dx;

  const normalization = Math.sqrt(integral);
  return psi.map((val) => val / normalization);
}

qppw.register("NumerovSolver", { solveNumerov });
