/**
 * Eckart potential for barrier tunneling.
 * V(x) = V₀/cosh²(x/a) + V₁
 */

import { EckartPotentialSolution } from "../analytical-solutions/eckart-potential.js";
import { PotentialType } from "../PotentialFunction.js";
import { AnalyticalPotential } from "./AnalyticalPotential.js";

export class EckartPotential extends AnalyticalPotential {
  private potentialDepth: number;
  private barrierHeight: number;
  private wellWidth: number;

  /**
   * Create an Eckart potential.
   * @param potentialDepth - Potential depth (V₀) in Joules (positive value)
   * @param barrierHeight - Barrier height (V₁) in Joules
   * @param wellWidth - Well width parameter (a) in meters
   * @param mass - Particle mass in kg
   */
  constructor(potentialDepth: number, barrierHeight: number, wellWidth: number, mass: number) {
    const solution = new EckartPotentialSolution(potentialDepth, barrierHeight, wellWidth, mass);
    super(solution, mass);
    this.potentialDepth = potentialDepth;
    this.barrierHeight = barrierHeight;
    this.wellWidth = wellWidth;
  }

  /**
   * Get the potential type identifier.
   */
  public getType(): PotentialType {
    return PotentialType.ECKART;
  }

  /**
   * Get the potential depth.
   */
  public getPotentialDepth(): number {
    return this.potentialDepth;
  }

  /**
   * Get the barrier height.
   */
  public getBarrierHeight(): number {
    return this.barrierHeight;
  }

  /**
   * Get the well width parameter.
   */
  public getWellWidth(): number {
    return this.wellWidth;
  }
}
