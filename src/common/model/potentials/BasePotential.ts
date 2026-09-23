/**
 * Abstract base class for all quantum mechanical potentials.
 *
 * This class provides a common interface for all potentials, whether they have
 * analytical solutions or require numerical methods. Each potential must provide:
 * - A potential function V(x)
 * - Information about whether it has an analytical solution
 * - The potential type identifier
 *
 * @abstract
 */

import type { PotentialFunction, PotentialType } from "../PotentialFunction.js";

export abstract class BasePotential {
  protected mass: number;

  /**
   * Create a new potential instance.
   * @param mass - Particle mass in kg
   */
  constructor(mass: number) {
    this.mass = mass;
  }

  /**
   * Get the potential type identifier.
   */
  abstract getType(): PotentialType;

  /**
   * Create the potential function V(x).
   * @returns Potential function V(x) in Joules
   */
  abstract createPotential(): PotentialFunction;

  /**
   * Check if this potential has an analytical solution.
   * @returns true if analytical solution exists, false if numerical methods required
   */
  abstract hasAnalyticalSolution(): boolean;

  /**
   * Get the particle mass.
   */
  public getMass(): number {
    return this.mass;
  }
}
