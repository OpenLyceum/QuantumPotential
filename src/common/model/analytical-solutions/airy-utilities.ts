/**
 * Utilities for Airy function-based quantum well solutions.
 * Used by asymmetric-triangle-potential and triangular-potential solvers.
 */

import type { GridConfig } from "../PotentialFunction.js";
import QuantumConstants from "../QuantumConstants.js";
import { airyAi } from "./math-utilities.js";

/**
 * Pre-computed zeros of the Airy function Ai(z).
 * These are the first 30 zeros (negative values where Ai(z_n) = 0).
 */
export const AIRY_ZEROS = [
  -2.33810741046, -4.08794944413, -5.5205598281, -6.78670809007, -7.94413358712, -9.02265085334, -10.0401743416,
  -11.0085243037, -11.9360155632, -12.8287767529, -13.6914890352, -14.5278299518, -15.3407550016, -16.1328355283,
  -16.9062914467, -17.6629059623, -18.4040686682, -19.1316436363, -19.8471121589, -20.5516776771, -21.2463345333,
  -21.931907637, -22.6091606826, -23.278791381, -23.9414358498, -24.5976826013, -25.2480724088, -25.8930940959,
  -26.5331934669, -27.1687726548,
];

/**
 * Calculate the Airy scaling parameter α = (2mF/ℏ²)^(1/3)
 *
 * @param mass - Particle mass in kg
 * @param slope - Potential slope F in Joules/meter
 * @returns Scaling parameter alpha in m^(-1)
 */
export function calculateAiryAlpha(mass: number, slope: number): number {
  const { HBAR } = QuantumConstants;
  return ((2 * mass * slope) / (HBAR * HBAR)) ** (1 / 3);
}

/**
 * Asymptotic approximation for Airy zeros when n >= 30
 * z_n ≈ -(3π(4n-1)/8)^(2/3)
 * (Internal helper)
 *
 * @param n - Zero index (1-indexed, so first zero is n=1)
 * @returns Approximate value of the n-th Airy zero
 */
function getApproximateAiryZero(n: number): number {
  return -(((3 * Math.PI * (4 * n - 1)) / 8) ** (2 / 3));
}

/**
 * Refine an Airy zero using Newton-Raphson method.
 * Finds z where Ai(z) = 0.
 * (Internal helper)
 *
 * @param initialGuess - Initial estimate for the zero
 * @param maxIterations - Maximum number of Newton-Raphson iterations
 * @param tolerance - Convergence tolerance
 * @returns Refined value of the Airy zero
 */
function refineAiryZero(initialGuess: number, maxIterations: number = 10, tolerance: number = 1e-10): number {
  let z = initialGuess;
  const h = 1e-6; // Small step for numerical derivative

  for (let iter = 0; iter < maxIterations; iter++) {
    const aiZ = airyAi(z);

    // Check convergence
    if (Math.abs(aiZ) < tolerance) {
      break;
    }

    // Numerical derivative: Ai'(z) ≈ (Ai(z+h) - Ai(z-h)) / (2h)
    const aiZPlusH = airyAi(z + h);
    const aiZMinusH = airyAi(z - h);
    const aiPrime = (aiZPlusH - aiZMinusH) / (2 * h);

    // Newton-Raphson step: z_new = z - Ai(z) / Ai'(z)
    if (Math.abs(aiPrime) < 1e-12) {
      // Derivative too small, can't continue
      break;
    }

    const zNew = z - aiZ / aiPrime;

    // Check for convergence
    if (Math.abs(zNew - z) < tolerance) {
      z = zNew;
      break;
    }

    z = zNew;
  }

  return z;
}

/**
 * Get the n-th Airy zero, using pre-computed values when available
 * and asymptotic approximation with refinement for larger n.
 *
 * @param n - Zero index (0-indexed)
 * @returns Value of the n-th Airy zero
 */
export function getAiryZero(n: number): number {
  if (n < AIRY_ZEROS.length) {
    return AIRY_ZEROS[n]!;
  }
  // Use asymptotic approximation for states beyond the pre-computed ones
  const initialGuess = getApproximateAiryZero(n + 1); // n+1 because zeros are 1-indexed
  return refineAiryZero(initialGuess);
}

/**
 * Calculate energy eigenvalue for an infinite triangular well.
 * E_n = -z_n · (ℏ²/2m)^(1/3) · F^(2/3)
 *
 * @param airyZero - The n-th Airy zero (negative value)
 * @param mass - Particle mass in kg
 * @param slope - Potential slope F in Joules/meter
 * @returns Energy eigenvalue in Joules
 */
export function calculateTriangularWellEnergy(airyZero: number, mass: number, slope: number): number {
  const { HBAR } = QuantumConstants;
  // Since z_n < 0, we have -z_n > 0, so E > 0
  return -airyZero * ((HBAR * HBAR) / (2 * mass)) ** (1 / 3) * slope ** (2 / 3);
}

/**
 * Generate a uniform grid of x-positions.
 *
 * @param gridConfig - Grid configuration with xMin, xMax, and numPoints
 * @returns Object containing xGrid array and dx spacing
 */
export function generateGrid(gridConfig: GridConfig): {
  xGrid: number[];
  dx: number;
} {
  const numPoints = gridConfig.numPoints;
  const dx = (gridConfig.xMax - gridConfig.xMin) / (numPoints - 1);
  const xGrid: number[] = [];

  for (let i = 0; i < numPoints; i++) {
    xGrid.push(gridConfig.xMin + i * dx);
  }

  return { xGrid, dx };
}

/**
 * Normalize a wavefunction using numerical integration.
 *
 * @param psiRaw - Unnormalized wavefunction values
 * @param dx - Grid spacing
 * @returns Normalized wavefunction
 */
export function normalizeWavefunction(psiRaw: number[], dx: number): number[] {
  let normSq = 0;
  for (const psi of psiRaw) {
    normSq += psi * psi * dx;
  }
  const norm = 1 / Math.sqrt(normSq);

  return psiRaw.map((psi) => norm * psi);
}

/**
 * Apply sign convention to wavefunction.
 * Ensures ground state (n=0) is positive at maximum, and alternates for excited states.
 *
 * @param wavefunction - Wavefunction values
 * @param stateIndex - Quantum state index (0 for ground state)
 * @returns Wavefunction with consistent sign convention
 */
export function applySignConvention(wavefunction: number[], stateIndex: number): number[] {
  // Find the maximum absolute value
  let maxAbsIndex = 0;
  let maxAbsValue = 0;
  for (let i = 0; i < wavefunction.length; i++) {
    if (Math.abs(wavefunction[i]!) > maxAbsValue) {
      maxAbsValue = Math.abs(wavefunction[i]!);
      maxAbsIndex = i;
    }
  }

  // For ground state (n=0), ensure it's positive
  // For excited states, use alternating convention based on state index
  const shouldBePositive = stateIndex % 2 === 0;
  if (wavefunction[maxAbsIndex]! > 0 !== shouldBePositive) {
    return wavefunction.map((psi) => -psi);
  }

  return wavefunction;
}

/**
 * Refine a root using bisection method.
 *
 * @param f - Function to find root of
 * @param a - Left bracket
 * @param b - Right bracket
 * @param tolerance - Convergence tolerance
 * @param maxIterations - Maximum iterations
 * @returns Refined root value, or null if no sign change
 */
export function refineBisection(
  f: (x: number) => number,
  a: number,
  b: number,
  tolerance: number,
  maxIterations: number,
): number | null {
  let lo = a;
  let hi = b;
  let fa = f(lo);
  const fb = f(hi);

  if (fa * fb > 0) {
    return null; // No sign change
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    const c = (lo + hi) / 2;
    const fc = f(c);

    if (Math.abs(fc) < tolerance || (hi - lo) / 2 < tolerance) {
      return c;
    }

    if (fa * fc < 0) {
      hi = c;
    } else {
      lo = c;
      fa = fc;
    }
  }

  return (lo + hi) / 2;
}
