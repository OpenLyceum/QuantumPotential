/**
 * Class for potentials that require numerical methods to solve.
 *
 * This class represents arbitrary potential functions that don't have
 * closed-form analytical solutions. These potentials must be solved using
 * numerical methods like Numerov, DVR, FGH, or Spectral methods.
 *
 * Examples include:
 * - Custom user-defined potentials
 * - Complex multi-well structures without analytical solutions
 * - Potentials with numerical coefficients
 * - Arbitrary shape potentials
 */

import { type PotentialFunction, PotentialType } from "../PotentialFunction.js";
import { BasePotential } from "./BasePotential.js";

export class NumericalPotential extends BasePotential {
  private potentialFunction: PotentialFunction;
  private potentialType: PotentialType;

  /**
   * Create a new numerical potential.
   * @param potentialFunction - The potential function V(x)
   * @param mass - Particle mass in kg
   * @param type - Optional type identifier (defaults to CUSTOM)
   */
  constructor(potentialFunction: PotentialFunction, mass: number, type: PotentialType = PotentialType.CUSTOM) {
    super(mass);
    this.potentialFunction = potentialFunction;
    this.potentialType = type;
  }

  /**
   * Get the potential type identifier.
   */
  public getType(): PotentialType {
    return this.potentialType;
  }

  /**
   * Create the potential function V(x).
   */
  public createPotential(): PotentialFunction {
    return this.potentialFunction;
  }

  /**
   * Always returns false for numerical potentials.
   */
  public hasAnalyticalSolution(): boolean {
    return false;
  }

  /**
   * Create a simple numerical potential from a function.
   * Convenience factory method.
   */
  public static fromFunction(func: PotentialFunction, mass: number): NumericalPotential {
    return new NumericalPotential(func, mass);
  }
}
