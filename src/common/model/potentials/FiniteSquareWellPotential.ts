/**
 * Finite square well potential.
 * V(x) = -V₀ for -L/2 < x < L/2, V(x) = 0 otherwise
 */

import { FiniteSquareWellSolution } from "../analytical-solutions/finite-square-well.js";
import { PotentialType } from "../PotentialFunction.js";
import { AnalyticalPotential } from "./AnalyticalPotential.js";

export class FiniteSquareWellPotential extends AnalyticalPotential {
  private wellWidth: number;
  private wellDepth: number;

  /**
   * Create a finite square well potential.
   * @param wellWidth - Width of the well (L) in meters
   * @param wellDepth - Depth of the well (V₀) in Joules (positive value)
   * @param mass - Particle mass in kg
   */
  constructor(wellWidth: number, wellDepth: number, mass: number) {
    const solution = new FiniteSquareWellSolution(wellWidth, wellDepth, mass);
    super(solution, mass);
    this.wellWidth = wellWidth;
    this.wellDepth = wellDepth;
  }

  /**
   * Get the potential type identifier.
   */
  public getType(): PotentialType {
    return PotentialType.FINITE_WELL;
  }

  /**
   * Get the well width.
   */
  public getWellWidth(): number {
    return this.wellWidth;
  }

  /**
   * Get the well depth.
   */
  public getWellDepth(): number {
    return this.wellDepth;
  }
}
