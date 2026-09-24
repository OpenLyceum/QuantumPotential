/**
 * Abstract base class for analytical solutions to quantum mechanical potentials.
 *
 * This class provides a common interface for all analytical solutions, ensuring consistency
 * across different potential types. Each concrete implementation must provide methods for:
 * - Solving the Schrödinger equation to get energies and wavefunctions
 * - Creating the potential function
 * - Calculating classical probability density (a shared default built on createPotential)
 * - Finding wavefunction zeros (nodes)
 * - Determining classical turning points
 * - Computing wavefunction second derivatives
 *
 * @abstract
 */

import { calculateClassicalProbabilityDensity } from "../ClassicalProbability.js";
import type { BoundStateResult, FourierTransformResult, GridConfig, PotentialFunction } from "../PotentialFunction.js";

export abstract class AnalyticalSolution {
  /**
   * Solve the Schrödinger equation for this potential analytically.
   * Returns bound state energies and wavefunctions.
   *
   * @param numStates - Number of energy levels to calculate
   * @param gridConfig - Grid configuration for wavefunction evaluation
   * @returns Bound state results with exact energies and wavefunctions
   */
  abstract solve(numStates: number, gridConfig: GridConfig): BoundStateResult;

  /**
   * Create the potential function V(x).
   *
   * @returns Potential function V(x) in Joules
   */
  abstract createPotential(): PotentialFunction;

  /**
   * Calculate classical probability density for this potential.
   *
   * For a classical particle with total energy E moving in potential V(x),
   * the probability density is proportional to 1/v(x), where v(x) is the velocity:
   * P(x) ∝ 1/√(2m(E - V(x)))
   *
   * The result is normalized so that ∫P(x)dx = 1 over the classically allowed region. The default samples
   * createPotential(); override it only where a closed form is better (the square wells' uniform density).
   *
   * @param energy - Energy of the particle in Joules
   * @param mass - Particle mass in kg
   * @param xGrid - Array of x positions in meters
   * @returns Array of normalized classical probability density values (in 1/meters)
   */
  calculateClassicalProbability(energy: number, mass: number, xGrid: number[]): number[] {
    const potential = this.createPotential();
    return calculateClassicalProbabilityDensity(
      xGrid.map((x) => potential(x)),
      energy,
      mass,
      xGrid,
    );
  }

  /**
   * Calculate the classical turning points.
   *
   * Turning points occur where the particle's kinetic energy becomes zero,
   * i.e., where E = V(x). These mark the boundaries of the classically allowed regions.
   *
   * For simple potentials with a single well, there are two turning points (left and right).
   * For more complex potentials (e.g., double wells, periodic potentials), there can be
   * multiple pairs of turning points, creating multiple classically allowed regions.
   *
   * Some turning points may be infinite (±∞) for potentials that extend infinitely
   * in one or both directions.
   *
   * @param energy - Energy of the particle in Joules
   * @returns Array of turning point pairs, where each pair represents a classically
   *          allowed region: [{left: x1, right: x2}, {left: x3, right: x4}, ...]
   *          For simple single-well potentials, this will be a single-element array.
   */
  abstract calculateTurningPoints(energy: number): Array<{ left: number; right: number }>;

  /**
   * Calculate the first derivative of the wavefunction.
   *
   * The first derivative provides information about the slope of the wavefunction
   * at each position. This is useful for analyzing the momentum distribution,
   * probability current, and other quantum mechanical properties.
   *
   * @param stateIndex - Index of the eigenstate (0 for ground state, 1 for first excited, etc.)
   * @param xGrid - Array of x positions in meters where derivatives should be evaluated
   * @returns Array of first derivative values
   */
  abstract calculateWavefunctionFirstDerivative(stateIndex: number, xGrid: number[]): number[];

  /**
   * Calculate the second derivative of the wavefunction.
   *
   * The second derivative is related to the Schrödinger equation:
   * ψ''(x) = (2m/ℏ²)[V(x) - E]ψ(x)
   *
   * This is useful for verifying that the wavefunction satisfies the Schrödinger equation
   * and for numerical stability checks.
   *
   * @param stateIndex - Index of the eigenstate (0 for ground state, 1 for first excited, etc.)
   * @param xGrid - Array of x positions in meters where derivatives should be evaluated
   * @returns Array of second derivative values
   */
  abstract calculateWavefunctionSecondDerivative(stateIndex: number, xGrid: number[]): number[];

  /**
   * Calculate the minimum and maximum values of a wavefunction in a given region.
   *
   * This method evaluates the wavefunction at multiple points within the specified
   * region and returns the minimum and maximum values encountered, along with their
   * x-positions. The wavefunction is sampled at a sufficient density to accurately
   * capture the extrema.
   *
   * @param stateIndex - Index of the eigenstate (0 for ground state, 1 for first excited, etc.)
   * @param xMin - Left boundary of the region in meters
   * @param xMax - Right boundary of the region in meters
   * @param numPoints - Number of points to sample (default: 1000)
   * @returns Object containing min/max values and their x-positions (all extrema positions)
   */
  abstract calculateWavefunctionMinMax(
    stateIndex: number,
    xMin: number,
    xMax: number,
    numPoints?: number,
  ): { min: number; max: number; extremaPositions: number[] };

  /**
   * Calculate the Fourier transform of the wavefunctions to obtain momentum-space representation.
   *
   * The Fourier transform of a wavefunction ψ(x) is defined as:
   * φ(p) = (1/√(2πℏ)) ∫ ψ(x) e^(-ipx/ℏ) dx
   *
   * where p is the momentum. This method should be implemented analytically when possible,
   * otherwise using numerical FFT methods.
   *
   * For some potentials (e.g., harmonic oscillator, infinite square well), the Fourier
   * transform can be computed analytically. For others, numerical integration or FFT
   * should be used.
   *
   * @param boundStateResult - The position-space wavefunction results to transform
   * @param mass - Particle mass in kg (needed for momentum-position scaling)
   * @param numMomentumPoints - Number of points in momentum space grid (optional)
   * @param pMax - Maximum momentum value in kg·m/s (optional, auto-determined if not provided)
   * @returns Fourier transform result with momentum-space wavefunctions
   */
  abstract calculateFourierTransform(
    boundStateResult: BoundStateResult,
    mass: number,
    numMomentumPoints?: number,
    pMax?: number,
  ): FourierTransformResult;
}
