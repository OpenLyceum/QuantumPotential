/**
 * Analytical solution for an infinite square well (particle in a box).
 * V(x) = 0 for -L/2 < x < L/2, V(x) = ∞ otherwise
 * The well is centered at x=0.
 *
 * REFERENCES:
 * - Griffiths, D. J., & Schroeter, D. F. (2018). "Introduction to Quantum Mechanics" (3rd ed.).
 *   Cambridge University Press. Section 2.2, pp. 31-39.
 *   https://doi.org/10.1017/9781316995433
 *
 * - Liboff, R. L. (2003). "Introductory Quantum Mechanics" (4th ed.).
 *   Addison-Wesley. Section 4.2, pp. 138-145.
 *
 * - Original formulation: Schrödinger, E. (1926). "Quantisierung als Eigenwertproblem"
 *   (Quantization as an Eigenvalue Problem). Annalen der Physik, 384(4), 361-376.
 *   https://doi.org/10.1002/andp.19263840404
 *
 * ENERGY EIGENVALUES:
 *   E_n = (n² π² ℏ²) / (2 m L²),  n = 1, 2, 3, ...
 *
 * WAVEFUNCTIONS:
 *   ψ_n(x) = √(2/L) sin(nπ(x + L/2)/L),  -L/2 ≤ x ≤ L/2
 *   ψ_n(x) = 0,  |x| > L/2
 */

import type { BoundStateResult, GridConfig, PotentialFunction } from "../PotentialFunction.js";
import QuantumConstants from "../QuantumConstants.js";
import { AnalyticalSolution } from "./AnalyticalSolution.js";

/**
 * Create the potential function for an infinite square well.
 * V(x) = 0 for -L/2 < x < L/2, V(x) = ∞ otherwise
 *
 * @param wellWidth - Width of the well (L) in meters
 * @returns Potential function V(x) in Joules
 */
export function createInfiniteWellPotential(wellWidth: number): PotentialFunction {
  const halfWidth = wellWidth / 2;
  return (x: number) => {
    if (x >= -halfWidth && x <= halfWidth) {
      return 0;
    } else {
      return 1e100; // Very large value to approximate infinity
    }
  };
}

/**
 * Calculate classical probability density for an infinite square well.
 * For a particle in a box with constant potential inside, the classical velocity
 * is constant, so the probability density is uniform: P(x) = 1/L for |x| < L/2
 *
 * This is one of the cases where the renormalization can be computed analytically.
 *
 * @param wellWidth - Width of the well (L) in meters
 * @param energy - Energy of the particle in Joules (unused for infinite well)
 * @param mass - Particle mass in kg (unused for infinite well)
 * @param xGrid - Array of x positions in meters
 * @returns Array of normalized classical probability density values (in 1/meters)
 */
export function calculateInfiniteWellClassicalProbability(
  wellWidth: number,
  _energy: number,
  _mass: number,
  xGrid: number[],
): number[] {
  const halfWidth = wellWidth / 2;
  const probability: number[] = [];

  // Classical probability is uniform inside the well: P(x) = 1/L
  // This is already normalized: ∫P(x)dx = 1
  const uniformProbability = 1 / wellWidth;

  for (const x of xGrid) {
    if (x >= -halfWidth && x <= halfWidth) {
      probability.push(uniformProbability);
    } else {
      probability.push(0);
    }
  }

  return probability;
}

/**
 * Calculate the classical turning points for an infinite square well.
 * For an infinite well, the turning points are always at the walls: x = ±L/2
 *
 * @param wellWidth - Width of the well (L) in meters
 * @param _energy - Energy of the particle in Joules (unused for infinite well)
 * @returns Object with left and right turning point positions (in meters)
 */
export function calculateInfiniteWellTurningPoints(
  wellWidth: number,
  _energy: number,
): { left: number; right: number } {
  const halfWidth = wellWidth / 2;
  return {
    left: -halfWidth,
    right: halfWidth,
  };
}

/**
 * Calculate the first derivative of the wavefunction for an infinite square well.
 *
 * For ψ_n(x) = √(2/L) sin(nπ(x + L/2)/L):
 * - ψ'_n(x) = √(2/L) * (nπ/L) * cos(nπ(x + L/2)/L)
 *
 * @param wellWidth - Width of the well (L) in meters
 * @param stateIndex - Index of the eigenstate (0 for ground state, 1 for first excited, etc.)
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of first derivative values
 */
export function calculateInfiniteWellWavefunctionFirstDerivative(
  wellWidth: number,
  stateIndex: number,
  xGrid: number[],
): number[] {
  const n = stateIndex + 1; // Quantum number (1, 2, 3, ...)
  const L = wellWidth;
  const halfWidth = L / 2;
  const normalization = Math.sqrt(2 / L);
  const waveFactor = (n * Math.PI) / L;

  const firstDerivative: number[] = [];

  for (const x of xGrid) {
    // Check if x is inside the well [-L/2, L/2]
    if (x >= -halfWidth && x <= halfWidth) {
      // Shift coordinate to [0, L] range for standard formula
      const xShifted = x + halfWidth;

      // ψ'_n(x) = normalization * waveFactor * cos(waveFactor * xShifted)
      const firstDeriv = normalization * waveFactor * Math.cos(waveFactor * xShifted);
      firstDerivative.push(firstDeriv);
    } else {
      // Outside the well, wavefunction and derivatives are zero
      firstDerivative.push(0);
    }
  }

  return firstDerivative;
}

/**
 * Calculate the second derivative of the wavefunction for an infinite square well.
 *
 * For ψ_n(x) = √(2/L) sin(nπ(x + L/2)/L):
 * - ψ''_n(x) = -√(2/L) * (nπ/L)² * sin(nπ(x + L/2)/L) = -(nπ/L)² * ψ_n(x)
 *
 * @param wellWidth - Width of the well (L) in meters
 * @param stateIndex - Index of the eigenstate (0 for ground state, 1 for first excited, etc.)
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of second derivative values
 */
export function calculateInfiniteWellWavefunctionSecondDerivative(
  wellWidth: number,
  stateIndex: number,
  xGrid: number[],
): number[] {
  const n = stateIndex + 1; // Quantum number (1, 2, 3, ...)
  const L = wellWidth;
  const halfWidth = L / 2;
  const normalization = Math.sqrt(2 / L);
  const waveFactor = (n * Math.PI) / L;

  const secondDerivative: number[] = [];

  for (const x of xGrid) {
    // Check if x is inside the well [-L/2, L/2]
    if (x >= -halfWidth && x <= halfWidth) {
      // Shift coordinate to [0, L] range for standard formula
      const xShifted = x + halfWidth;

      // ψ''_n(x) = -normalization * waveFactor² * sin(waveFactor * xShifted)
      const secondDeriv = -normalization * waveFactor * waveFactor * Math.sin(waveFactor * xShifted);
      secondDerivative.push(secondDeriv);
    } else {
      // Outside the well, wavefunction and derivatives are zero
      secondDerivative.push(0);
    }
  }

  return secondDerivative;
}

/**
 * Calculate the minimum and maximum values of the wavefunction for an infinite square well.
 *
 * For ψ_n(x) = √(2/L) sin(nπ(x + L/2)/L), the function is sampled at multiple points
 * in the range [xMin, xMax] to find the extrema and their positions.
 *
 * @param wellWidth - Width of the well (L) in meters
 * @param stateIndex - Index of the eigenstate (0 for ground state, 1 for first excited, etc.)
 * @param xMin - Left boundary of the region in meters
 * @param xMax - Right boundary of the region in meters
 * @param numPoints - Number of points to sample (default: 1000)
 * @returns Object containing min/max values and x-positions of all extrema
 */
export function calculateInfiniteWellWavefunctionMinMax(
  wellWidth: number,
  stateIndex: number,
  xMin: number,
  xMax: number,
  numPoints: number = 1000,
): { min: number; max: number; extremaPositions: number[] } {
  const n = stateIndex + 1; // Quantum number (1, 2, 3, ...)
  const L = wellWidth;
  const halfWidth = L / 2;
  const normalization = Math.sqrt(2 / L);
  const waveFactor = (n * Math.PI) / L;

  let min = Infinity;
  let max = -Infinity;
  const extremaPositions: number[] = [];

  const dx = (xMax - xMin) / (numPoints - 1);
  let prevDerivativeSign: number | null = null;

  for (let i = 0; i < numPoints; i++) {
    const x = xMin + i * dx;

    let psi: number;
    let derivative: number;

    // Check if x is inside the well [-L/2, L/2]
    if (x >= -halfWidth && x <= halfWidth) {
      // Shift coordinate to [0, L] range for standard formula
      const xShifted = x + halfWidth;
      psi = normalization * Math.sin(waveFactor * xShifted);
      // ψ'_n(x) = normalization * waveFactor * cos(waveFactor * xShifted)
      derivative = normalization * waveFactor * Math.cos(waveFactor * xShifted);
    } else {
      // Outside the well, wavefunction is zero
      psi = 0;
      derivative = 0;
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

/**
 * Class-based implementation of infinite square well analytical solution.
 * Extends the AnalyticalSolution abstract base class.
 */
export class InfiniteSquareWellSolution extends AnalyticalSolution {
  private wellWidth: number;
  private mass: number;

  constructor(wellWidth: number, mass: number) {
    super();
    this.wellWidth = wellWidth;
    this.mass = mass;
  }

  solve(numStates: number, gridConfig: GridConfig): BoundStateResult {
    return solveInfiniteWell(this.wellWidth, this.mass, numStates, gridConfig);
  }

  createPotential(): PotentialFunction {
    return createInfiniteWellPotential(this.wellWidth);
  }

  override calculateClassicalProbability(energy: number, mass: number, xGrid: number[]): number[] {
    return calculateInfiniteWellClassicalProbability(this.wellWidth, energy, mass, xGrid);
  }

  calculateTurningPoints(energy: number): Array<{ left: number; right: number }> {
    const points = calculateInfiniteWellTurningPoints(this.wellWidth, energy);
    return [points]; // Return as array with single element for simple single-well potential
  }

  calculateWavefunctionFirstDerivative(stateIndex: number, xGrid: number[]): number[] {
    return calculateInfiniteWellWavefunctionFirstDerivative(this.wellWidth, stateIndex, xGrid);
  }

  calculateWavefunctionSecondDerivative(stateIndex: number, xGrid: number[]): number[] {
    return calculateInfiniteWellWavefunctionSecondDerivative(this.wellWidth, stateIndex, xGrid);
  }

  calculateWavefunctionMinMax(
    stateIndex: number,
    xMin: number,
    xMax: number,
    numPoints?: number,
  ): { min: number; max: number; extremaPositions: number[] } {
    return calculateInfiniteWellWavefunctionMinMax(this.wellWidth, stateIndex, xMin, xMax, numPoints);
  }
}

/**
 * Analytical solution for an infinite square well (particle in a box).
 * V(x) = 0 for -L/2 < x < L/2, V(x) = ∞ otherwise
 * The well is centered at x=0.
 *
 * @param wellWidth - Width of the well (L) in meters
 * @param mass - Particle mass in kg
 * @param numStates - Number of energy levels to calculate
 * @param gridConfig - Grid configuration for wavefunction evaluation
 * @returns Bound state results with exact energies and wavefunctions
 */
export function solveInfiniteWell(
  wellWidth: number,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
): BoundStateResult {
  const { HBAR } = QuantumConstants;
  const L = wellWidth;

  // Calculate energies: E_n = (n^2 * π^2 * ℏ^2) / (2 * m * L^2) for n = 1, 2, 3, ...
  const energies: number[] = [];
  for (let n = 1; n <= numStates; n++) {
    const energy = (n * n * Math.PI * Math.PI * HBAR * HBAR) / (2 * mass * L * L);
    energies.push(energy);
  }

  // Generate grid
  const numPoints = gridConfig.numPoints;
  const xGrid: number[] = [];
  const dx = (gridConfig.xMax - gridConfig.xMin) / (numPoints - 1);
  for (let i = 0; i < numPoints; i++) {
    xGrid.push(gridConfig.xMin + i * dx);
  }

  // Calculate wavefunctions for centered well: ψ_n(x) = sqrt(2/L) * sin(n * π * (x + L/2) / L)
  // Well extends from -L/2 to +L/2
  const wavefunctions: number[][] = [];
  const halfWidth = L / 2;
  for (let n = 1; n <= numStates; n++) {
    const wavefunction: number[] = [];
    const normalization = Math.sqrt(2 / L);

    for (const x of xGrid) {
      // Check if x is inside the well [-L/2, L/2]
      if (x >= -halfWidth && x <= halfWidth) {
        // Shift coordinate to [0, L] range for standard sine formula
        const xShifted = x + halfWidth;
        const value = normalization * Math.sin((n * Math.PI * xShifted) / L);
        wavefunction.push(value);
      } else {
        wavefunction.push(0);
      }
    }
    wavefunctions.push(wavefunction);
  }

  return {
    energies,
    wavefunctions,
    xGrid,
    method: "analytical",
  };
}
