/**
 * Numerical solver wrapper for 1D Coulomb potential that filters for odd-parity solutions.
 *
 * The 1D Coulomb potential V(x) = -α/|x| is pathological: only odd-parity eigenstates
 * exist as normalizable solutions due to the singularity at x=0. Even-parity eigenstates
 * diverge at the origin and are unphysical.
 *
 * Standard numerical solvers don't know this and will find a mix of even and odd parity
 * states. This wrapper filters the results to return only odd-parity states.
 *
 * Reference:
 * - Loudon, R. (2016). "The one-dimensional Coulomb problem"
 *   Proc. R. Soc. A 472: 20150534. https://doi.org/10.1098/rspa.2015.0534
 */

import { solveDVR } from "../DVRSolver.js";
import type { BoundStateResult, GridConfig, PotentialFunction } from "../PotentialFunction.js";

/**
 * Check if a wavefunction has odd parity: ψ(-x) = -ψ(x)
 *
 * @param wavefunction - Wavefunction values on grid
 * @param xGrid - Spatial grid (should be symmetric about x=0)
 * @returns true if wavefunction is predominantly odd-parity
 */
function isOddParity(wavefunction: number[], _xGrid: number[]): boolean {
  const midIdx = Math.floor(wavefunction.length / 2);
  const numSamples = Math.min(20, Math.floor(wavefunction.length / 4));

  let oddError = 0;
  let evenError = 0;

  for (let i = 1; i <= numSamples; i++) {
    const leftIdx = midIdx - i;
    const rightIdx = midIdx + i;

    if (leftIdx >= 0 && rightIdx < wavefunction.length) {
      const leftVal = wavefunction[leftIdx]!;
      const rightVal = wavefunction[rightIdx]!;
      const magnitude = Math.max(Math.abs(leftVal), Math.abs(rightVal));

      if (magnitude > 1e-10) {
        // For odd: ψ(-x) = -ψ(x), so leftVal + rightVal ≈ 0
        oddError += Math.abs(leftVal + rightVal) / magnitude;
        // For even: ψ(-x) = ψ(x), so leftVal - rightVal ≈ 0
        evenError += Math.abs(leftVal - rightVal) / magnitude;
      }
    }
  }

  // Return true if odd error is smaller (more odd than even)
  return oddError < evenError;
}

/**
 * Solve the 1D Coulomb potential using numerical methods, filtering for odd-parity states.
 *
 * Strategy:
 * 1. Solve on full domain using standard numerical solver
 * 2. Filter results to keep only odd-parity eigenstates
 * 3. Request extra states initially to ensure we get enough odd-parity ones
 *
 * @param coulombStrength - Coulomb strength parameter α in J·m
 * @param mass - Particle mass in kg
 * @param numStates - Number of odd-parity bound states to find
 * @param gridConfig - Grid configuration (should be symmetric about x=0)
 * @param solver - Numerical solver function to use (default: DVR)
 * @returns Bound state results with odd-parity wavefunctions only
 */
export function solveCoulomb1DNumerical(
  coulombStrength: number,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
  solver: (
    pot: PotentialFunction,
    mass: number,
    numStates: number,
    grid: GridConfig,
    energiesOnly: false,
  ) => BoundStateResult = solveDVR,
): BoundStateResult {
  const alpha = coulombStrength;

  // Create potential function with regularization at x=0
  const coulomb1DPotential: PotentialFunction = (x: number) => {
    const absX = Math.abs(x);
    if (absX < 1e-12) {
      return -alpha / 1e-12;
    }
    return -alpha / absX;
  };

  // Request more states than needed (numerical solvers find mix of even/odd)
  // We'll filter for odd parity afterwards
  const numStatesToRequest = numStates * 3;

  // Solve on full domain
  const result = solver(coulomb1DPotential, mass, numStatesToRequest, gridConfig, false);

  // Filter for odd-parity states
  const oddEnergies: number[] = [];
  const oddWavefunctions: number[][] = [];

  for (let i = 0; i < result.energies.length && oddEnergies.length < numStates; i++) {
    if (isOddParity(result.wavefunctions[i]!, result.xGrid)) {
      oddEnergies.push(result.energies[i]!);
      oddWavefunctions.push(result.wavefunctions[i]!);
    }
  }

  // Sort by energy (should already be sorted, but make sure)
  const indices = oddEnergies.map((_, i) => i);
  indices.sort((a, b) => oddEnergies[a]! - oddEnergies[b]!);

  const sortedEnergies = indices.map((i) => oddEnergies[i]!);
  const sortedWavefunctions = indices.map((i) => oddWavefunctions[i]!);

  return {
    energies: sortedEnergies,
    wavefunctions: sortedWavefunctions,
    xGrid: result.xGrid,
    method: result.method,
  };
}
