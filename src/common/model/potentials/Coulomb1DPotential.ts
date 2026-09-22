/**
 * 1D Coulomb potential.
 * V(x) = -α/|x|
 */

import { Coulomb1DPotentialSolution } from "../analytical-solutions/coulomb-1d-potential.js";
import { PotentialType } from "../PotentialFunction.js";
import { AnalyticalPotential } from "./AnalyticalPotential.js";

export class Coulomb1DPotential extends AnalyticalPotential {
  private coulombStrength: number;

  /**
   * Create a 1D Coulomb potential.
   * @param coulombStrength - Coulomb strength parameter (α) in J·m
   * @param mass - Particle mass in kg
   */
  constructor(coulombStrength: number, mass: number) {
    const solution = new Coulomb1DPotentialSolution(coulombStrength, mass);
    super(solution, mass);
    this.coulombStrength = coulombStrength;
  }

  /**
   * Get the potential type identifier.
   */
  public getType(): PotentialType {
    return PotentialType.COULOMB_1D;
  }

  /**
   * Get the Coulomb strength parameter.
   */
  public getCoulombStrength(): number {
    return this.coulombStrength;
  }
}
