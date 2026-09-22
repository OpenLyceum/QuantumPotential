/**
 * Morse potential for molecular vibrations.
 * V(x) = Dₑ[1 - exp(-a(x - xₑ))]²
 */

import { MorsePotentialSolution } from "../analytical-solutions/morse-potential.js";
import { PotentialType } from "../PotentialFunction.js";
import { AnalyticalPotential } from "./AnalyticalPotential.js";

export class MorsePotential extends AnalyticalPotential {
  private dissociationEnergy: number;
  private wellWidth: number;
  private equilibriumPosition: number;

  /**
   * Create a Morse potential.
   * @param dissociationEnergy - Dissociation energy (Dₑ) in Joules
   * @param wellWidth - Well width parameter (related to a = √(k/(2Dₑ))) in meters
   * @param equilibriumPosition - Equilibrium position (xₑ) in meters
   * @param mass - Particle mass in kg
   */
  constructor(dissociationEnergy: number, wellWidth: number, equilibriumPosition: number, mass: number) {
    const solution = new MorsePotentialSolution(dissociationEnergy, wellWidth, equilibriumPosition, mass);
    super(solution, mass);
    this.dissociationEnergy = dissociationEnergy;
    this.wellWidth = wellWidth;
    this.equilibriumPosition = equilibriumPosition;
  }

  /**
   * Get the potential type identifier.
   */
  public getType(): PotentialType {
    return PotentialType.MORSE;
  }

  /**
   * Get the dissociation energy.
   */
  public getDissociationEnergy(): number {
    return this.dissociationEnergy;
  }

  /**
   * Get the well width parameter.
   */
  public getWellWidth(): number {
    return this.wellWidth;
  }

  /**
   * Get the equilibrium position.
   */
  public getEquilibriumPosition(): number {
    return this.equilibriumPosition;
  }
}
