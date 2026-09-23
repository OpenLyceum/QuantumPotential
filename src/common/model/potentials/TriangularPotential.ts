/**
 * Triangular potential well.
 * V(x) = V₀(1 - 2|x|/L) for |x| < L/2, V(x) = V_offset otherwise
 */

import { TriangularPotentialSolution } from "../analytical-solutions/triangular-potential.js";
import { PotentialType } from "../PotentialFunction.js";
import { AnalyticalPotential } from "./AnalyticalPotential.js";

export class TriangularPotential extends AnalyticalPotential {
  private wellDepth: number;
  private wellWidth: number;
  private energyOffset: number;

  /**
   * Create a triangular potential.
   * @param wellDepth - Well depth (V₀) in Joules (positive value)
   * @param wellWidth - Well width (L) in meters
   * @param energyOffset - Energy offset outside the well in Joules
   * @param mass - Particle mass in kg
   */
  constructor(wellDepth: number, wellWidth: number, energyOffset: number, mass: number) {
    const solution = new TriangularPotentialSolution(wellDepth, wellWidth, energyOffset, mass);
    super(solution, mass);
    this.wellDepth = wellDepth;
    this.wellWidth = wellWidth;
    this.energyOffset = energyOffset;
  }

  /**
   * Get the potential type identifier.
   */
  public getType(): PotentialType {
    return PotentialType.TRIANGULAR;
  }

  /**
   * Get the well depth.
   */
  public getWellDepth(): number {
    return this.wellDepth;
  }

  /**
   * Get the well width.
   */
  public getWellWidth(): number {
    return this.wellWidth;
  }

  /**
   * Get the energy offset.
   */
  public getEnergyOffset(): number {
    return this.energyOffset;
  }
}
