/**
 * Numerov method for computing wavefunctions from known energies.
 *
 * Once eigenvalues (energies) have been found using matrix methods (DVR, Spectral, FGH,
 * Matrix Numerov), this solver can compute the corresponding wavefunctions on an
 * arbitrarily fine grid using the Numerov method.
 *
 * The Schrödinger equation:
 *   -ℏ²/(2m) d²ψ/dx² + V(x)ψ = Eψ
 *
 * Can be rearranged to:
 *   d²ψ/dx² = (2m/ℏ²)(V(x) - E)ψ = -k²(x)ψ
 *
 * The Numerov method is specifically designed for equations of this form and provides
 * higher accuracy than general ODE solvers like RK45.
 */

import qppw from "../../QPPWNamespace.js";
import { normalizeWavefunction } from "./LinearAlgebraUtils.js";
import type { GridConfig, PotentialFunction } from "./PotentialFunction.js";
import QuantumConstants from "./QuantumConstants.js";

/**
 * Result from computing wavefunctions using Numerov
 */
export type WavefunctionResult = {
  /** Computed wavefunctions (each row is one eigenstate) */
  wavefunctions: number[][];
  /** Grid x-positions in meters */
  xGrid: number[];
};

/**
 * Compute wavefunctions for given energies using Numerov integration.
 *
 * Uses a shooting method from both boundaries, matching at a classical
 * turning point for numerical stability.
 *
 * @param energies - Energy eigenvalues in Joules (already found by matrix solver)
 * @param potential - Function V(x) that returns potential energy in Joules
 * @param mass - Particle mass in kg
 * @param gridConfig - Grid configuration (can have many more points than used to find energies)
 * @returns Wavefunctions on the specified grid
 */
export function computeWavefunctionsNumerov(
  energies: number[],
  potential: PotentialFunction,
  mass: number,
  gridConfig: GridConfig,
): WavefunctionResult {
  const { xMin, xMax, numPoints } = gridConfig;
  const dx = (xMax - xMin) / (numPoints - 1);

  // Generate grid
  const xGrid: number[] = [];
  for (let i = 0; i < numPoints; i++) {
    xGrid.push(xMin + i * dx);
  }

  // Evaluate potential on grid
  const V = xGrid.map(potential);

  // Compute each wavefunction
  const wavefunctions: number[][] = [];
  for (const energy of energies) {
    const psi = computeSingleWavefunction(energy, V, xGrid, dx, mass);
    const normalizedPsi = normalizeWavefunction(psi, dx);
    wavefunctions.push(normalizedPsi);
  }

  return {
    wavefunctions,
    xGrid,
  };
}

/**
 * Compute a single wavefunction for a given energy using Numerov.
 *
 * Uses shooting from both boundaries and matching at a turning point.
 */
function computeSingleWavefunction(energy: number, V: number[], xGrid: number[], dx: number, mass: number): number[] {
  const N = xGrid.length;

  // Find matching point (classical turning point or middle)
  const matchIndex = findMatchingPoint(energy, V, xGrid);

  // Shoot from left boundary
  const psiLeft = shootFromLeft(energy, V, dx, mass, matchIndex);

  // Shoot from right boundary
  const psiRight = shootFromRight(energy, V, dx, mass, matchIndex);

  // Match solutions at matching point
  const psi = matchSolutions(psiLeft, psiRight, matchIndex, N);

  return psi;
}

/**
 * Find a good matching point (preferably near a classical turning point).
 */
function findMatchingPoint(energy: number, V: number[], xGrid: number[]): number {
  const N = xGrid.length;

  // Look for classical turning point where V(x) = E
  // Start from the middle and search outward
  const middle = Math.floor(N / 2);

  // Search for right turning point (from middle going right)
  let rightTurning = -1;
  for (let i = middle; i < N - 1; i++) {
    if (V[i]! <= energy && V[i + 1]! > energy) {
      rightTurning = i;
      break;
    }
  }

  // Search for left turning point (from middle going left)
  let leftTurning = -1;
  for (let i = middle; i > 0; i--) {
    if (V[i]! <= energy && V[i - 1]! > energy) {
      leftTurning = i;
      break;
    }
  }

  // Choose matching point
  if (rightTurning >= 0 && leftTurning >= 0) {
    // Use the middle of the classical region
    return Math.floor((leftTurning + rightTurning) / 2);
  } else if (rightTurning >= 0) {
    return rightTurning;
  } else if (leftTurning >= 0) {
    return leftTurning;
  } else {
    // No turning point found, use middle
    return middle;
  }
}

/**
 * Shoot from left boundary using Numerov method.
 *
 * Numerov formula: ψ_(j+1) = [(2 - 10f_j)ψ_j - (1+f_(j-1))ψ_(j-1)] / (1+f_(j+1))
 * where f_j = (h²/12) k²(x_j) and k²(x) = 2m(E - V(x))/ℏ²
 */
function shootFromLeft(energy: number, V: number[], dx: number, mass: number, matchIndex: number): number[] {
  const { HBAR } = QuantumConstants;
  const psi: number[] = new Array(matchIndex + 1).fill(0);

  // Calculate k²(x) = 2m(E - V(x))/ℏ²
  const k2 = V.map((v) => (2 * mass * (energy - v)) / (HBAR * HBAR));

  // Calculate f_j = (h²/12) * k²(x_j)
  const f = k2.map((k) => ((dx * dx) / 12) * k);

  // Initial conditions: ψ(xMin) = 0, ψ(xMin + dx) = small value
  psi[0] = 0;
  psi[1] = 1e-10;

  // Numerov forward integration
  for (let j = 1; j < matchIndex; j++) {
    const numerator = (2 - 10 * f[j]!) * psi[j]! - (1 + f[j - 1]!) * psi[j - 1]!;
    const denominator = 1 + f[j + 1]!;
    psi[j + 1] = numerator / denominator;

    // Check for divergence
    if (Math.abs(psi[j + 1]!) > 1e50) {
      // Normalize to prevent overflow
      const maxVal = Math.abs(psi[j + 1]!);
      for (let k = 0; k <= j + 1; k++) {
        psi[k]! /= maxVal;
      }
    }
  }

  return psi;
}

/**
 * Shoot from right boundary using Numerov method.
 */
function shootFromRight(energy: number, V: number[], dx: number, mass: number, matchIndex: number): number[] {
  const { HBAR } = QuantumConstants;
  const N = V.length;
  const psi: number[] = new Array(N - matchIndex).fill(0);

  // Calculate k²(x) = 2m(E - V(x))/ℏ²
  const k2 = V.map((v) => (2 * mass * (energy - v)) / (HBAR * HBAR));

  // Calculate f_j = (h²/12) * k²(x_j)
  const f = k2.map((k) => ((dx * dx) / 12) * k);

  // Initial conditions: ψ(xMax) = 0, ψ(xMax - dx) = small value
  psi[psi.length - 1] = 0;
  psi[psi.length - 2] = 1e-10;

  // Numerov backward integration
  // Rearranged formula: ψ_(j-1) = [(2 - 10f_j)ψ_j - (1+f_(j+1))ψ_(j+1)] / (1+f_(j-1))
  for (let j = N - 2; j > matchIndex; j--) {
    const psiIdx = j - matchIndex;
    const numerator = (2 - 10 * f[j]!) * psi[psiIdx]! - (1 + f[j + 1]!) * psi[psiIdx + 1]!;
    const denominator = 1 + f[j - 1]!;
    psi[psiIdx - 1] = numerator / denominator;

    // Check for divergence
    if (Math.abs(psi[psiIdx - 1]!) > 1e50) {
      // Normalize to prevent overflow
      const maxVal = Math.abs(psi[psiIdx - 1]!);
      for (let k = psiIdx - 1; k < psi.length; k++) {
        psi[k]! /= maxVal;
      }
    }
  }

  return psi;
}

/**
 * Match left and right solutions at the matching point.
 */
function matchSolutions(psiLeft: number[], psiRight: number[], matchIndex: number, N: number): number[] {
  const psi: number[] = new Array(N).fill(0);

  // Get values at matching point
  const leftValue = psiLeft[psiLeft.length - 1]!;
  const rightValue = psiRight[0]!;

  // Scale factor to match amplitudes
  const scale = Math.abs(rightValue) > 1e-30 ? leftValue / rightValue : 1;

  // Copy left part
  for (let i = 0; i <= matchIndex; i++) {
    psi[i] = psiLeft[i]!;
  }

  // Copy scaled right part
  for (let i = matchIndex + 1; i < N; i++) {
    psi[i] = psiRight[i - matchIndex]! * scale;
  }

  return psi;
}

/**
 * Convenience function to compute wavefunctions for a single energy.
 *
 * @param energy - Energy eigenvalue in Joules
 * @param potential - Function V(x) that returns potential energy in Joules
 * @param mass - Particle mass in kg
 * @param gridConfig - Grid configuration
 * @returns Single wavefunction on the specified grid
 */
export function computeWavefunctionNumerov(
  energy: number,
  potential: PotentialFunction,
  mass: number,
  gridConfig: GridConfig,
): { wavefunction: number[]; xGrid: number[] } {
  const result = computeWavefunctionsNumerov([energy], potential, mass, gridConfig);
  return {
    wavefunction: result.wavefunctions[0]!,
    xGrid: result.xGrid,
  };
}

qppw.register("WavefunctionNumerovSolver", {
  computeWavefunctionsNumerov,
  computeWavefunctionNumerov,
});
