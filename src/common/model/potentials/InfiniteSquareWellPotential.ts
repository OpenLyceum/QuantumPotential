/**
 * Infinite square well (particle in a box) potential.
 * V(x) = 0 for -L/2 < x < L/2, V(x) = ∞ otherwise
 */

import { InfiniteSquareWellSolution } from "../analytical-solutions/infinite-square-well.js";
import { PotentialType } from "../PotentialFunction.js";
import { AnalyticalPotential } from "./AnalyticalPotential.js";

export class InfiniteSquareWellPotential extends AnalyticalPotential {
  private wellWidth: number;

  /**
   * Create an infinite square well potential.
   * @param wellWidth - Width of the well (L) in meters
   * @param mass - Particle mass in kg
   */
  constructor(wellWidth: number, mass: number) {
    const solution = new InfiniteSquareWellSolution(wellWidth, mass);
    super(solution, mass);
    this.wellWidth = wellWidth;
  }

  /**
   * Get the potential type identifier.
   */
  public getType(): PotentialType {
    return PotentialType.INFINITE_WELL;
  }

  /**
   * Get the well width.
   */
  public getWellWidth(): number {
    return this.wellWidth;
  }
}
