/**
 * Pöschl-Teller potential.
 * V(x) = -V₀/cosh²(x/a)
 */

import { PoschlTellerPotentialSolution } from "../analytical-solutions/poschl-teller-potential.js";
import { PotentialType } from "../PotentialFunction.js";
import { AnalyticalPotential } from "./AnalyticalPotential.js";

export class PoschlTellerPotential extends AnalyticalPotential {
  private potentialDepth: number;
  private wellWidth: number;

  /**
   * Create a Pöschl-Teller potential.
   * @param potentialDepth - Potential depth (V₀) in Joules (positive value)
   * @param wellWidth - Well width parameter (a) in meters
   * @param mass - Particle mass in kg
   */
  constructor(potentialDepth: number, wellWidth: number, mass: number) {
    const solution = new PoschlTellerPotentialSolution(potentialDepth, wellWidth, mass);
    super(solution, mass);
    this.potentialDepth = potentialDepth;
    this.wellWidth = wellWidth;
  }

  /**
   * Get the potential type identifier.
   */
  public getType(): PotentialType {
    return PotentialType.POSCHL_TELLER;
  }

  /**
   * Get the potential depth.
   */
  public getPotentialDepth(): number {
    return this.potentialDepth;
  }

  /**
   * Get the well width parameter.
   */
  public getWellWidth(): number {
    return this.wellWidth;
  }
}
