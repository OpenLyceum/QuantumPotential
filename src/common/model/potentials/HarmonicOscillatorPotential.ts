/**
 * Quantum harmonic oscillator potential.
 * V(x) = (1/2) * k * x²
 */

import { HarmonicOscillatorSolution } from "../analytical-solutions/harmonic-oscillator.js";
import { PotentialType } from "../PotentialFunction.js";
import { AnalyticalPotential } from "./AnalyticalPotential.js";

export class HarmonicOscillatorPotential extends AnalyticalPotential {
  private springConstant: number;

  /**
   * Create a harmonic oscillator potential.
   * @param springConstant - Spring constant (k) in N/m
   * @param mass - Particle mass in kg
   */
  constructor(springConstant: number, mass: number) {
    const solution = new HarmonicOscillatorSolution(springConstant, mass);
    super(solution, mass);
    this.springConstant = springConstant;
  }

  /**
   * Get the potential type identifier.
   */
  public getType(): PotentialType {
    return PotentialType.HARMONIC_OSCILLATOR;
  }

  /**
   * Get the spring constant.
   */
  public getSpringConstant(): number {
    return this.springConstant;
  }

  /**
   * Get the angular frequency ω = √(k/m).
   */
  public getAngularFrequency(): number {
    return Math.sqrt(this.springConstant / this.mass);
  }
}
