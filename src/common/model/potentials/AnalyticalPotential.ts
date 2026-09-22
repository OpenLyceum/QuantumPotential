/**
 * Abstract base class for potentials with analytical solutions.
 *
 * This class extends BasePotential and wraps an AnalyticalSolution instance
 * to provide access to exact analytical solutions. It provides:
 * - Exact energy eigenvalues
 * - Exact wavefunctions
 * - Classical probability density
 * - Wavefunction zeros (nodes)
 * - Classical turning points
 * - Wavefunction derivatives
 *
 * @abstract
 */

import type { AnalyticalSolution } from "../analytical-solutions/AnalyticalSolution.js";
import type { BoundStateResult, GridConfig, PotentialFunction } from "../PotentialFunction.js";
import { BasePotential } from "./BasePotential.js";

export abstract class AnalyticalPotential extends BasePotential {
  protected solution: AnalyticalSolution;

  /**
   * Create a new analytical potential.
   * @param solution - The analytical solution instance for this potential
   * @param mass - Particle mass in kg
   */
  constructor(solution: AnalyticalSolution, mass: number) {
    super(mass);
    this.solution = solution;
  }

  /**
   * Solve the Schrödinger equation for this potential analytically.
   * Delegates to the wrapped AnalyticalSolution instance.
   *
   * @param numStates - Number of energy levels to calculate
   * @param gridConfig - Grid configuration for wavefunction evaluation
   * @returns Bound state results with exact energies and wavefunctions
   */
  public solve(numStates: number, gridConfig: GridConfig): BoundStateResult {
    return this.solution.solve(numStates, gridConfig);
  }

  /**
   * Create the potential function V(x).
   * Delegates to the wrapped AnalyticalSolution instance.
   */
  public createPotential(): PotentialFunction {
    return this.solution.createPotential();
  }

  /**
   * Calculate classical probability density for this potential.
   * Delegates to the wrapped AnalyticalSolution instance.
   *
   * @param energy - Energy of the particle in Joules
   * @param xGrid - Array of x positions in meters
   * @returns Array of normalized classical probability density values (in 1/meters)
   */
  public calculateClassicalProbability(energy: number, xGrid: number[]): number[] {
    return this.solution.calculateClassicalProbability(energy, this.mass, xGrid);
  }

  /**
   * Calculate the positions of wavefunction zeros (nodes).
   * Delegates to the wrapped AnalyticalSolution instance.
   *
   * @param stateIndex - Index of the eigenstate (0 for ground state, 1 for first excited, etc.)
   * @param energy - Energy of the eigenstate in Joules (may be needed for some potentials)
   * @returns Array of x positions (in meters) where the wavefunction is zero
   */
  public calculateWavefunctionZeros(stateIndex: number, energy: number): number[] {
    return this.solution.calculateWavefunctionZeros(stateIndex, energy);
  }

  /**
   * Calculate the classical turning points.
   * Delegates to the wrapped AnalyticalSolution instance.
   *
   * @param energy - Energy of the particle in Joules
   * @returns Array of turning point pairs
   */
  public calculateTurningPoints(energy: number): Array<{ left: number; right: number }> {
    return this.solution.calculateTurningPoints(energy);
  }

  /**
   * Calculate the second derivative of the wavefunction.
   * Delegates to the wrapped AnalyticalSolution instance.
   *
   * @param stateIndex - Index of the eigenstate (0 for ground state, 1 for first excited, etc.)
   * @param xGrid - Array of x positions in meters where derivatives should be evaluated
   * @returns Array of second derivative values
   */
  public calculateWavefunctionSecondDerivative(stateIndex: number, xGrid: number[]): number[] {
    return this.solution.calculateWavefunctionSecondDerivative(stateIndex, xGrid);
  }

  /**
   * Calculate the minimum and maximum values of the wavefunction in a given region.
   * Delegates to the wrapped AnalyticalSolution instance.
   *
   * @param stateIndex - Index of the eigenstate (0 for ground state, 1 for first excited, etc.)
   * @param xMin - Left boundary of the region in meters
   * @param xMax - Right boundary of the region in meters
   * @param numPoints - Number of points to sample (default: 1000)
   * @returns Object containing min and max values of the wavefunction
   */
  public calculateWavefunctionMinMax(
    stateIndex: number,
    xMin: number,
    xMax: number,
    numPoints?: number,
  ): { min: number; max: number } {
    return this.solution.calculateWavefunctionMinMax(stateIndex, xMin, xMax, numPoints);
  }

  /**
   * Calculate the minimum and maximum values of a superposition of wavefunctions.
   * Delegates to the wrapped AnalyticalSolution instance.
   *
   * @param coefficients - Complex coefficients for each eigenstate (as [real, imag] pairs)
   * @param energies - Energy eigenvalues in Joules
   * @param time - Time in seconds
   * @param xMin - Left boundary of the region in meters
   * @param xMax - Right boundary of the region in meters
   * @param numPoints - Number of points to sample (default: 1000)
   * @returns Object containing min and max values of the superposition
   */
  public calculateSuperpositionMinMax(
    coefficients: Array<[number, number]>,
    energies: number[],
    time: number,
    xMin: number,
    xMax: number,
    numPoints?: number,
  ): { min: number; max: number } {
    return this.solution.calculateSuperpositionMinMax(coefficients, energies, time, xMin, xMax, numPoints);
  }

  /**
   * Always returns true for analytical potentials.
   */
  public hasAnalyticalSolution(): boolean {
    return true;
  }

  /**
   * Get the wrapped analytical solution instance.
   * This provides direct access to the solution for advanced use cases.
   */
  public getAnalyticalSolution(): AnalyticalSolution {
    return this.solution;
  }
}
