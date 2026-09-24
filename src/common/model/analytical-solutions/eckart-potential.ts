/**
 * Analytical solution for the Eckart potential.
 * V(x) = V_0 / (1 + exp(x/a))² - V_1 / (1 + exp(x/a))
 *
 * REFERENCES:
 * - Eckart, C. (1930). "The Penetration of a Potential Barrier by Electrons"
 *   Physical Review, 35(11), 1303-1309. https://doi.org/10.1103/PhysRev.35.1303
 * - Cooper, F., Khare, A., & Sukhatme, U. (1995). "Supersymmetry and quantum mechanics"
 *   Physics Reports, 251(5-6), 267-385. Sections 3.3-3.4.
 *
 * EXACT MAPPING ONTO ROSEN-MORSE:
 * With z = 1/(1 + e^(x/a)) = (1 − t)/2 and t = tanh(x/2a),
 *   V(x) = C + [−V₀′ sech²(x/a′) + V₁′ tanh(x/a′)]
 * with a′ = 2a, V₀′ = V_0/4, V₁′ = (V_1 − V_0)/2 and the constant C = (V_0 − V_1)/2.
 * So the Eckart spectrum is the Rosen-Morse spectrum shifted by C, with the same wavefunctions;
 * every method here delegates to RosenMorsePotentialSolution with those parameters.
 *
 * The potential runs from V_0 − V_1 (x → −∞) to 0 (x → +∞). It has bound states only when the
 * dip −V_1²/(4V_0) (for V_1 < 2V_0) is deep and wide enough; otherwise it is a pure step/barrier
 * and a NoBoundStatesError is thrown.
 *
 * (An earlier version used E_n = −(ℏ²/2ma²)(s₂ − n)² with s₂ = −½ + √(¼ + a√(2mV₀)/ℏ − …), which is
 * not the spectrum of this potential; it reported bound states below the minimum of V.)
 */

import { NoBoundStatesError } from "../NoBoundStatesError.js";
import type { BoundStateResult, GridConfig, PotentialFunction } from "../PotentialFunction.js";
import { AnalyticalSolution } from "./AnalyticalSolution.js";
import { RosenMorsePotentialSolution } from "./rosen-morse-potential.js";

/** The Rosen-Morse problem equivalent to an Eckart potential, and the energy shift between them. */
function toRosenMorse(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
  mass: number,
): { rosenMorse: RosenMorsePotentialSolution; shift: number } {
  return {
    rosenMorse: new RosenMorsePotentialSolution(
      potentialDepth / 4,
      (barrierHeight - potentialDepth) / 2,
      2 * wellWidth,
      mass,
    ),
    shift: (potentialDepth - barrierHeight) / 2,
  };
}

/**
 * Class-based implementation of the Eckart analytical solution.
 */
export class EckartPotentialSolution extends AnalyticalSolution {
  private readonly potentialDepth: number;
  private readonly barrierHeight: number;
  private readonly wellWidth: number;
  private readonly mass: number;
  private readonly rosenMorse: RosenMorsePotentialSolution;
  private readonly shift: number;

  constructor(potentialDepth: number, barrierHeight: number, wellWidth: number, mass: number) {
    super();
    this.potentialDepth = potentialDepth;
    this.barrierHeight = barrierHeight;
    this.wellWidth = wellWidth;
    this.mass = mass;
    const { rosenMorse, shift } = toRosenMorse(potentialDepth, barrierHeight, wellWidth, mass);
    this.rosenMorse = rosenMorse;
    this.shift = shift;
  }

  solve(numStates: number, gridConfig: GridConfig): BoundStateResult {
    return solveEckartPotential(
      this.potentialDepth,
      this.barrierHeight,
      this.wellWidth,
      this.mass,
      numStates,
      gridConfig,
    );
  }

  createPotential(): PotentialFunction {
    return createEckartPotential(this.potentialDepth, this.barrierHeight, this.wellWidth);
  }

  override calculateClassicalProbability(energy: number, mass: number, xGrid: number[]): number[] {
    return this.rosenMorse.calculateClassicalProbability(energy - this.shift, mass, xGrid);
  }

  calculateTurningPoints(energy: number): Array<{ left: number; right: number }> {
    return this.rosenMorse.calculateTurningPoints(energy - this.shift);
  }

  calculateWavefunctionFirstDerivative(stateIndex: number, xGrid: number[]): number[] {
    return this.rosenMorse.calculateWavefunctionFirstDerivative(stateIndex, xGrid);
  }

  calculateWavefunctionSecondDerivative(stateIndex: number, xGrid: number[]): number[] {
    return this.rosenMorse.calculateWavefunctionSecondDerivative(stateIndex, xGrid);
  }

  calculateWavefunctionMinMax(
    stateIndex: number,
    xMin: number,
    xMax: number,
    numPoints?: number,
  ): { min: number; max: number; extremaPositions: number[] } {
    return this.rosenMorse.calculateWavefunctionMinMax(stateIndex, xMin, xMax, numPoints);
  }
}

/**
 * Bound states of V(x) = V_0/(1 + e^(x/a))² − V_1/(1 + e^(x/a)).
 *
 * @param potentialDepth - V_0 in Joules
 * @param barrierHeight - V_1 in Joules
 * @param wellWidth - Width parameter a in meters
 * @param mass - Particle mass in kg
 * @param numStates - Number of energy levels to calculate
 * @param gridConfig - Grid configuration for wavefunction evaluation
 * @returns Bound state results with exact energies and wavefunctions
 */
export function solveEckartPotential(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
): BoundStateResult {
  const { rosenMorse, shift } = toRosenMorse(potentialDepth, barrierHeight, wellWidth, mass);
  let result: BoundStateResult;
  try {
    result = rosenMorse.solve(numStates, gridConfig);
  } catch (error) {
    if (error instanceof NoBoundStatesError) {
      throw new NoBoundStatesError("Eckart potential has no bound states for these parameters");
    }
    throw error;
  }
  return { ...result, energies: result.energies.map((energy) => energy + shift) };
}

/**
 * Create the potential function V(x) = V_0/(1 + e^(x/a))² − V_1/(1 + e^(x/a)) (Joules; x in meters).
 */
export function createEckartPotential(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
): (x: number) => number {
  return (x: number) => {
    const z = 1 / (1 + Math.exp(x / wellWidth));
    return potentialDepth * z * z - barrierHeight * z;
  };
}

/**
 * Classical turning points for energy E. (The mass does not enter; any positive value will do.)
 */
export function calculateEckartPotentialTurningPoints(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
  energy: number,
): { left: number; right: number } {
  const solution = new EckartPotentialSolution(potentialDepth, barrierHeight, wellWidth, 1);
  return solution.calculateTurningPoints(energy)[0]!;
}

/**
 * d²ψ_n/dx² (1/m^(5/2)) at each x (m).
 */
export function calculateEckartPotentialWavefunctionSecondDerivative(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
  mass: number,
  stateIndex: number,
  xGrid: number[],
): number[] {
  return new EckartPotentialSolution(
    potentialDepth,
    barrierHeight,
    wellWidth,
    mass,
  ).calculateWavefunctionSecondDerivative(stateIndex, xGrid);
}
