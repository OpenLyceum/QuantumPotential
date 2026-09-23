/**
 * Multi-Coulomb 1D potential - generalization of Coulomb 1D to N centers.
 *
 * V(x) = -α * Σ(1/|x - x_i|)
 *
 * This represents multiple Coulomb attractive centers arranged in a line,
 * like a 1D model of a molecular chain or crystal lattice.
 *
 * Geometry:
 * - N Coulomb centers evenly spaced
 * - Centers are at positions x_i
 * - All centers have the same strength α
 *
 * For N centers, they are distributed symmetrically around x = 0:
 * - N odd: center at x = 0, others at ±d, ±2d, ...
 * - N even: centers at ±d/2, ±3d/2, ±5d/2, ...
 *
 * where d is the spacing between adjacent centers.
 */

import Logger from "../../utils/Logger.js";
import type { BoundStateResult, GridConfig } from "../PotentialFunction.js";
import type Schrodinger1DSolver from "../Schrodinger1DSolver.js";
import { withElectricField } from "./multi-square-well.js";

/**
 * Create a multi-Coulomb 1D potential function.
 * (Internal helper)
 *
 * @param numberOfCenters - Number of Coulomb centers (1 to 10)
 * @param centerSpacing - Spacing between adjacent centers in meters
 * @param coulombStrength - Coulomb strength parameter α in J·m
 * @returns Potential function V(x) in Joules
 */
function createMultiCoulomb1DPotential(
  numberOfCenters: number,
  centerSpacing: number,
  coulombStrength: number,
): (x: number) => number {
  // Calculate positions of Coulomb centers
  // Centers are distributed symmetrically around x = 0
  const centerPositions: number[] = [];

  if (numberOfCenters === 1) {
    centerPositions.push(0);
  } else if (numberOfCenters % 2 === 1) {
    // Odd number: center at x = 0
    centerPositions.push(0);
    for (let i = 1; i <= Math.floor(numberOfCenters / 2); i++) {
      centerPositions.push(i * centerSpacing);
      centerPositions.push(-i * centerSpacing);
    }
  } else {
    // Even number: symmetric around x = 0
    for (let i = 0; i < numberOfCenters / 2; i++) {
      const pos = (i + 0.5) * centerSpacing;
      centerPositions.push(pos);
      centerPositions.push(-pos);
    }
  }

  // Return potential function
  return (x: number): number => {
    let potential = 0;

    for (const centerPos of centerPositions) {
      const distance = Math.abs(x - centerPos);

      // Avoid singularity at center position
      // Use a small cutoff to prevent infinite potential
      const cutoff = 1e-12; // Small cutoff distance
      const effectiveDistance = Math.max(distance, cutoff);

      potential -= coulombStrength / effectiveDistance;
    }

    return potential;
  };
}

/**
 * Solve multi-Coulomb 1D potential numerically.
 *
 * The multi-center Coulomb problem doesn't have a simple analytical solution, so the bound states
 * come from the solver's numerical method.
 *
 * @param numberOfCenters - Number of Coulomb centers (1 to 10)
 * @param centerSpacing - Spacing between centers in meters
 * @param coulombStrength - Coulomb strength parameter α in J·m
 * @param mass - Particle mass in kg
 * @param numStates - Number of energy levels to calculate
 * @param gridConfig - Grid configuration for wavefunction evaluation
 * @param solver - Reference to the numerical solver to use
 * @param electricField - Uniform electric field in V/m (0 for no tilt)
 * @returns Bound state results with energies and wavefunctions
 */
export function solveMultiCoulomb1D(
  numberOfCenters: number,
  centerSpacing: number,
  coulombStrength: number,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
  solver: Schrodinger1DSolver, // Numerical solver instance
  electricField = 0,
): BoundStateResult {
  const potential = withElectricField(
    createMultiCoulomb1DPotential(numberOfCenters, centerSpacing, coulombStrength),
    electricField,
  );

  try {
    return solver.solveNumerical(potential, mass, numStates, gridConfig);
  } catch (error) {
    Logger.error("Error solving multi-Coulomb 1D:", error);

    // Return empty result on error
    const xGrid: number[] = [];
    const dx = (gridConfig.xMax - gridConfig.xMin) / (gridConfig.numPoints - 1);
    for (let i = 0; i < gridConfig.numPoints; i++) {
      xGrid.push(gridConfig.xMin + i * dx);
    }

    return {
      energies: [],
      wavefunctions: [],
      xGrid,
      method: "numerov",
    };
  }
}
