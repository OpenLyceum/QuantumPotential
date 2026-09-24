/**
 * Analytical solution for the asymmetric triangle potential.
 * V(x) = ∞ for x < 0 (infinite wall)
 * V(x) = F·x for x ≥ 0 (linear increasing potential)
 *
 * This is the standard triangular well problem with an infinite wall at x=0.
 * The eigenvalues are related to the zeros of the Airy function Ai(z).
 *
 * REFERENCES:
 * - Griffiths, D. J., & Schroeter, D. F. (2018). "Introduction to Quantum Mechanics" (3rd ed.).
 *   Cambridge University Press. Problem 2.43, p. 89.
 *   https://doi.org/10.1017/9781316995433
 *   Linear potential with hard wall boundary condition.
 *
 * - Schiff, L. I. (1968). "Quantum Mechanics" (3rd ed.). McGraw-Hill.
 *   Problem 14, pp. 269-270.
 *   Exact solution using Airy functions.
 *
 * - Vallée, O., & Soares, M. (2004). "Airy Functions and Applications to Physics".
 *   Imperial College Press. Chapter 5, pp. 115-145.
 *   https://doi.org/10.1142/p345
 *   Comprehensive treatment of Airy functions in quantum mechanics.
 *
 * - Abramowitz, M., & Stegun, I. A. (1964). "Handbook of Mathematical Functions".
 *   National Bureau of Standards. Section 10.4, pp. 446-452; Table 10.13, p. 478.
 *   https://doi.org/10.1119/1.15378
 *   Zeros of Airy function Ai(z): z_n for n = 1, 2, 3, ...
 *
 *
 * ENERGY EIGENVALUES (exact):
 *   E_n = (ℏ²/2m)^(1/3) · F^(2/3) · |z_n|
 * where z_n is the n-th zero of the Airy function Ai(z) (all negative):
 *   z_1 ≈ -2.338107, z_2 ≈ -4.087949, z_3 ≈ -5.520560, ...
 *
 * WAVEFUNCTIONS (exact):
 *   ψ_n(x) = N_n · Ai(α(x - x_n))
 * where α = (2mF/ℏ²)^(1/3), x_n = E_n/F is the classical turning point,
 * and N_n is the normalization constant.
 *
 * Boundary condition: ψ(0) = 0 leads to Ai(-αx_n) = 0, giving αx_n = -z_n.
 */

import type { BoundStateResult, GridConfig, PotentialFunction } from "../PotentialFunction.js";
import { AnalyticalSolution } from "./AnalyticalSolution.js";
import {
  calculateAiryAlpha,
  calculateTriangularWellEnergy,
  generateGrid,
  getAiryZero,
  normalizeWavefunction,
} from "./airy-utilities.js";
import { airyAi } from "./math-utilities.js";

/**
 * Class-based implementation of asymmetric triangle potential analytical solution.
 * Extends the AnalyticalSolution abstract base class.
 */
export class AsymmetricTrianglePotentialSolution extends AnalyticalSolution {
  private slope: number;
  private wellWidth: number;
  private mass: number;

  constructor(slope: number, wellWidth: number, mass: number) {
    super();
    this.slope = slope;
    this.wellWidth = wellWidth;
    this.mass = mass;
  }

  solve(numStates: number, gridConfig: GridConfig): BoundStateResult {
    return solveAsymmetricTrianglePotential(this.slope, this.wellWidth, this.mass, numStates, gridConfig);
  }

  createPotential(): PotentialFunction {
    return createAsymmetricTrianglePotential(this.slope);
  }

  calculateTurningPoints(energy: number): Array<{ left: number; right: number }> {
    const points = calculateAsymmetricTriangleTurningPoints(this.slope, energy);
    return [points]; // Return as array with single element for simple single-well potential
  }

  calculateWavefunctionFirstDerivative(stateIndex: number, xGrid: number[]): number[] {
    // Get energy from Airy zero
    const zN = getAiryZero(stateIndex);
    const energy = calculateTriangularWellEnergy(zN, this.mass, this.slope);

    return calculateAsymmetricTriangleWavefunctionFirstDerivative(this.slope, this.mass, energy, xGrid);
  }

  calculateWavefunctionSecondDerivative(stateIndex: number, xGrid: number[]): number[] {
    // Get energy from Airy zero
    const zN = getAiryZero(stateIndex);
    const energy = calculateTriangularWellEnergy(zN, this.mass, this.slope);

    return calculateAsymmetricTriangleWavefunctionSecondDerivative(this.slope, this.mass, energy, xGrid);
  }

  calculateWavefunctionMinMax(
    stateIndex: number,
    xMin: number,
    xMax: number,
    numPoints?: number,
  ): { min: number; max: number; extremaPositions: number[] } {
    return calculateAsymmetricTriangleWavefunctionMinMax(this.slope, this.mass, stateIndex, xMin, xMax, numPoints);
  }
}

/**
 * Analytical solution for the asymmetric triangle potential with infinite wall.
 *
 * @param slope - Slope parameter F in Joules/meter (field strength)
 * @param _wellWidth - Width parameter (not used for infinite well, kept for API compatibility)
 * @param mass - Particle mass in kg
 * @param numStates - Number of energy levels to calculate
 * @param gridConfig - Grid configuration for wavefunction evaluation
 * @returns Bound state results with exact energies and wavefunctions
 */
export function solveAsymmetricTrianglePotential(
  slope: number,
  _wellWidth: number,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
): BoundStateResult {
  const F = slope;
  const alpha = calculateAiryAlpha(mass, F);

  // Calculate energies using Airy zeros
  const energies: number[] = [];
  for (let n = 0; n < numStates; n++) {
    const zN = getAiryZero(n);
    const energy = calculateTriangularWellEnergy(zN, mass, F);
    energies.push(energy);
  }

  const actualNumStates = energies.length;

  // Generate grid
  const { xGrid, dx } = generateGrid(gridConfig);

  // Calculate wavefunctions using Airy functions
  const wavefunctions: number[][] = [];

  for (let n = 0; n < actualNumStates; n++) {
    const E = energies[n]!;

    // Classical turning point: x_0 = E/F (where V(x_0) = F·x_0 = E)
    const x0 = E / F;

    // Calculate unnormalized wavefunction
    const psiRaw: number[] = [];
    for (const x of xGrid) {
      if (x < 0) {
        // Region x < 0: infinite wall, ψ = 0
        psiRaw.push(0);
      } else {
        // Region x ≥ 0: Airy function solution
        // ψ(x) = N · Ai(α(x - x_0))
        const z = alpha * (x - x0);
        psiRaw.push(airyAi(z));
      }
    }

    // Normalize wavefunction
    const wavefunction = normalizeWavefunction(psiRaw, dx);
    wavefunctions.push(wavefunction);
  }

  return {
    energies,
    wavefunctions,
    xGrid,
    method: "analytical",
  };
}

/**
 * Create the potential function for an asymmetric triangle potential.
 * V(x) = ∞ for x < 0 (infinite wall), V(x) = F·x for x ≥ 0
 *
 * @param slope - Slope parameter F in Joules/meter (field strength)
 * @returns Potential function V(x) in Joules
 */
export function createAsymmetricTrianglePotential(slope: number): (x: number) => number {
  const F = slope;

  return (x: number) => {
    if (x < 0) {
      return 1e100; // Very large value to approximate infinity
    } else {
      return F * x;
    }
  };
}

/**
 * Calculate the classical turning points for an asymmetric triangle potential.
 * For this potential, there is one turning point at x = E/F (right side).
 * The left boundary is the infinite wall at x = 0.
 *
 * @param slope - Slope parameter F in Joules/meter (field strength)
 * @param energy - Energy of the particle in Joules
 * @returns Object with left and right turning point positions (in meters)
 */
export function calculateAsymmetricTriangleTurningPoints(
  slope: number,
  energy: number,
): { left: number; right: number } {
  const F = slope;

  // Classical turning point where E = F·x => x = E/F
  const turningPoint = energy / F;

  return {
    left: 0, // Infinite wall at x = 0
    right: turningPoint,
  };
}

/**
 * Compute numerical normalization constant for asymmetric triangle wavefunction.
 * Ensures the wavefunction satisfies ∫|ψ|² dx = 1.
 */
function computeAsymmetricTriangleNormalization(
  alpha: number,
  x0: number,
  xMin: number,
  xMax: number,
  numSamples: number = 1000,
): number {
  // If xMin and xMax are too close (e.g., single point evaluation),
  // use a default integration range that covers the wavefunction
  let integrationMin = xMin;
  let integrationMax = xMax;
  if (Math.abs(xMax - xMin) < 1e-10) {
    // For asymmetric triangle, wavefunction exists for x >= 0
    // Classical turning point is at x0, use range [0, 2*x0] or [0, 10nm] if x0 is small
    integrationMin = 0;
    integrationMax = Math.max(2 * x0, 10e-9);
  }

  const dx = (integrationMax - integrationMin) / (numSamples - 1);
  let normSq = 0;

  for (let i = 0; i < numSamples; i++) {
    const x = integrationMin + i * dx;
    if (x < 0) {
      // Infinite wall region, ψ = 0
      continue;
    }
    const z = alpha * (x - x0);
    const psiUnnorm = airyAi(z);
    normSq += psiUnnorm * psiUnnorm * dx;
  }

  return 1 / Math.sqrt(normSq);
}

/**
 * Calculate the first derivative of the wavefunction for an asymmetric triangle potential.
 * Uses numerical differentiation on the analytical wavefunction.
 *
 * @param slope - Slope parameter F in Joules/meter (field strength)
 * @param mass - Particle mass in kg
 * @param energy - Energy of the eigenstate in Joules
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of first derivative values
 */
export function calculateAsymmetricTriangleWavefunctionFirstDerivative(
  slope: number,
  mass: number,
  energy: number,
  xGrid: number[],
): number[] {
  const F = slope;
  const alpha = calculateAiryAlpha(mass, F);
  const x0 = energy / F;

  // Compute normalization to match the wavefunction normalization
  const xMin = xGrid[0]!;
  const xMax = xGrid[xGrid.length - 1]!;
  const normalization = computeAsymmetricTriangleNormalization(alpha, x0, xMin, xMax);

  const firstDerivative: number[] = [];
  const h = 1e-12; // Small step for numerical differentiation

  for (const x of xGrid) {
    if (x < 0) {
      // In the infinite wall region, wavefunction is zero
      firstDerivative.push(0);
      continue;
    }

    // Evaluate at x-h, x+h
    const xMinus = x - h;
    const xPlus = x + h;

    const zMinus = alpha * (xMinus - x0);
    const psiMinus = xMinus < 0 ? 0 : normalization * airyAi(zMinus);

    const zPlus = alpha * (xPlus - x0);
    const psiPlus = normalization * airyAi(zPlus);

    // First derivative using central difference
    const firstDeriv = (psiPlus - psiMinus) / (2 * h);
    firstDerivative.push(firstDeriv);
  }

  return firstDerivative;
}

/**
 * Calculate the second derivative of the wavefunction for an asymmetric triangle potential.
 * Uses numerical differentiation on the analytical wavefunction.
 *
 * @param slope - Slope parameter F in Joules/meter (field strength)
 * @param mass - Particle mass in kg
 * @param energy - Energy of the eigenstate in Joules
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of second derivative values
 */
export function calculateAsymmetricTriangleWavefunctionSecondDerivative(
  slope: number,
  mass: number,
  energy: number,
  xGrid: number[],
): number[] {
  const F = slope;
  const alpha = calculateAiryAlpha(mass, F);
  const x0 = energy / F;

  // Compute normalization to match the wavefunction normalization
  const xMin = xGrid[0]!;
  const xMax = xGrid[xGrid.length - 1]!;
  const normalization = computeAsymmetricTriangleNormalization(alpha, x0, xMin, xMax);

  const secondDerivative: number[] = [];
  const h = 1e-12; // Small step for numerical differentiation

  for (const x of xGrid) {
    if (x < 0) {
      // In the infinite wall region, wavefunction is zero
      secondDerivative.push(0);
      continue;
    }

    // Evaluate at x-h, x, x+h
    const xMinus = x - h;
    const xPlus = x + h;

    const zMinus = alpha * (xMinus - x0);
    const psiMinus = xMinus < 0 ? 0 : normalization * airyAi(zMinus);

    const z = alpha * (x - x0);
    const psi = normalization * airyAi(z);

    const zPlus = alpha * (xPlus - x0);
    const psiPlus = normalization * airyAi(zPlus);

    // Second derivative using central difference
    const secondDeriv = (psiPlus - 2 * psi + psiMinus) / (h * h);
    secondDerivative.push(secondDeriv);
  }

  return secondDerivative;
}

/**
 * Calculate the minimum and maximum values of the wavefunction for an asymmetric triangle potential.
 *
 * @param slope - Slope parameter F in Joules/meter (field strength)
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for ground state, etc.)
 * @param xMin - Left boundary of the region in meters
 * @param xMax - Right boundary of the region in meters
 * @param numPoints - Number of points to sample (default: 1000)
 * @returns Object containing min/max values and x-positions of all extrema
 */
export function calculateAsymmetricTriangleWavefunctionMinMax(
  slope: number,
  mass: number,
  stateIndex: number,
  xMin: number,
  xMax: number,
  numPoints: number = 1000,
): { min: number; max: number; extremaPositions: number[] } {
  const F = slope;
  const alpha = calculateAiryAlpha(mass, F);

  // Get energy from Airy zero
  const zN = getAiryZero(stateIndex);
  const energy = calculateTriangularWellEnergy(zN, mass, F);
  const x0 = energy / F;

  let min = Infinity;
  let max = -Infinity;
  const extremaPositions: number[] = [];

  const dx = (xMax - xMin) / (numPoints - 1);
  const h = 1e-12; // Small step for numerical derivative
  let prevDerivativeSign: number | null = null;

  // Helper function to calculate psi at a given x
  const calculatePsi = (x: number): number => {
    if (x < 0) {
      return 0;
    } else {
      const z = alpha * (x - x0);
      return airyAi(z);
    }
  };

  for (let i = 0; i < numPoints; i++) {
    const x = xMin + i * dx;
    const psi = calculatePsi(x);

    // Calculate derivative using central difference for extrema detection
    let derivative = 0;
    if (i > 0 && i < numPoints - 1) {
      const psiMinus = calculatePsi(x - h);
      const psiPlus = calculatePsi(x + h);
      derivative = (psiPlus - psiMinus) / (2 * h);
    }

    if (psi < min) {
      min = psi;
    }
    if (psi > max) {
      max = psi;
    }

    // Detect extrema by sign change in derivative
    const currentDerivativeSign = Math.sign(derivative);
    if (
      prevDerivativeSign !== null &&
      currentDerivativeSign !== prevDerivativeSign &&
      prevDerivativeSign !== 0 &&
      Math.abs(derivative) > 1e-10 // Avoid numerical noise
    ) {
      extremaPositions.push(x);
    }
    prevDerivativeSign = currentDerivativeSign;
  }

  return { min, max, extremaPositions };
}
