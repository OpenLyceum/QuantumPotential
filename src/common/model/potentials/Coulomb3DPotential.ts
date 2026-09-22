/**
 * 3D Coulomb potential (hydrogen-like atom, radial component).
 * V(r) = -α/r
 */

import { Coulomb3DPotentialSolution } from "../analytical-solutions/coulomb-3d-potential.js";
import { PotentialType } from "../PotentialFunction.js";
import { AnalyticalPotential } from "./AnalyticalPotential.js";

export class Coulomb3DPotential extends AnalyticalPotential {
  private coulombStrength: number;

  /**
   * Create a 3D Coulomb potential.
   * @param coulombStrength - Coulomb strength parameter (α) in J·m
   * @param mass - Particle mass in kg
   */
  constructor(coulombStrength: number, mass: number) {
    const solution = new Coulomb3DPotentialSolution(coulombStrength, mass);
    super(solution, mass);
    this.coulombStrength = coulombStrength;
  }

  /**
   * Get the potential type identifier.
   */
  public getType(): PotentialType {
    return PotentialType.COULOMB_3D;
  }

  /**
   * Get the Coulomb strength parameter.
   */
  public getCoulombStrength(): number {
    return this.coulombStrength;
  }
}
