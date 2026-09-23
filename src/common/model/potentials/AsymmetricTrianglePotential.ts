/**
 * Asymmetric triangle potential with linear wall and barrier.
 * V(x) = F·x for x > 0, V(x) = ∞ for x < 0
 */

import { AsymmetricTrianglePotentialSolution } from "../analytical-solutions/asymmetric-triangle-potential.js";
import { PotentialType } from "../PotentialFunction.js";
import { AnalyticalPotential } from "./AnalyticalPotential.js";

export class AsymmetricTrianglePotential extends AnalyticalPotential {
  private slope: number;
  private wellWidth: number;

  /**
   * Create an asymmetric triangle potential.
   * @param slope - Slope parameter (F) in Joules/meter
   * @param wellWidth - Well width parameter in meters
   * @param mass - Particle mass in kg
   */
  constructor(slope: number, wellWidth: number, mass: number) {
    const solution = new AsymmetricTrianglePotentialSolution(slope, wellWidth, mass);
    super(solution, mass);
    this.slope = slope;
    this.wellWidth = wellWidth;
  }

  /**
   * Get the potential type identifier.
   */
  public getType(): PotentialType {
    return PotentialType.ASYMMETRIC_TRIANGLE;
  }

  /**
   * Get the slope parameter.
   */
  public getSlope(): number {
    return this.slope;
  }

  /**
   * Get the well width parameter.
   */
  public getWellWidth(): number {
    return this.wellWidth;
  }
}
