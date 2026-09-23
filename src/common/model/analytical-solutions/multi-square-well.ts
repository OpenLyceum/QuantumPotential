/**
 * Multi-square well potential - generalization of double square well to N wells, optionally tilted by a
 * uniform electric field. Solved numerically (Numerov) by Schrodinger1DSolver.
 *
 * Energy reference convention:
 * - Wells: V = 0
 * - Barriers: V = V₀ (positive)
 *
 * Geometry:
 * - N wells of width wellWidth
 * - (N-1) barriers of width wellSeparation and height wellDepth
 * - Wells are centered around x = 0
 *
 * For N wells, the structure is:
 *   [well] [barrier] [well] [barrier] ... [well]
 *
 * Total structure width = N * wellWidth + (N-1) * wellSeparation
 * Center well (if N odd) or center barrier (if N even) at x = 0
 */

import Logger from "../../utils/Logger.js";
import type { BoundStateResult, GridConfig } from "../PotentialFunction.js";
import QuantumConstants from "../QuantumConstants.js";
import type Schrodinger1DSolver from "../Schrodinger1DSolver.js";

/**
 * Create a multi-square well potential function.
 *
 * @param numberOfWells - Number of wells (1 to 10)
 * @param wellWidth - Width of each well in meters
 * @param wellDepth - Depth/height of barriers in Joules (positive value)
 * @param wellSeparation - Width of barriers between wells in meters
 * @returns Potential function V(x) in Joules
 */
export function createMultiSquareWellPotential(
  numberOfWells: number,
  wellWidth: number,
  wellDepth: number,
  wellSeparation: number,
): (x: number) => number {
  // Calculate total structure width
  const totalWidth = numberOfWells * wellWidth + (numberOfWells - 1) * wellSeparation;

  // Calculate positions of well boundaries
  // Wells are centered around x = 0
  const wellBoundaries: Array<{ left: number; right: number }> = [];

  const startX = -totalWidth / 2;

  for (let i = 0; i < numberOfWells; i++) {
    const left = startX + i * (wellWidth + wellSeparation);
    const right = left + wellWidth;
    wellBoundaries.push({ left, right });
  }

  // Return potential function
  return (x: number): number => {
    // Check if x is inside any well
    for (const well of wellBoundaries) {
      if (x >= well.left && x <= well.right) {
        return 0; // Inside well
      }
    }

    // Check if x is between wells (barrier region)
    if (x > wellBoundaries[0]!.left && x < wellBoundaries[numberOfWells - 1]!.right) {
      return wellDepth; // Inside barrier
    }

    // Outside all wells - infinite barrier
    return wellDepth; // Use barrier height for outside regions
  };
}

/**
 * Solve multi-square well potential numerically.
 *
 * The transcendental equations for N > 2 wells (and any tilted well) have no convenient closed form,
 * so the bound states come from the solver's numerical method.
 *
 * @param numberOfWells - Number of wells (1 to 10)
 * @param wellWidth - Width of each well in meters
 * @param wellDepth - Depth of each well (barrier height) in Joules
 * @param wellSeparation - Separation between wells (barrier width) in meters
 * @param mass - Particle mass in kg
 * @param numStates - Number of energy levels to calculate
 * @param gridConfig - Grid configuration for wavefunction evaluation
 * @param solver - Reference to the numerical solver to use
 * @param electricField - Uniform electric field in V/m (0 for no tilt)
 * @returns Bound state results with energies and wavefunctions
 */
export function solveMultiSquareWell(
  numberOfWells: number,
  wellWidth: number,
  wellDepth: number,
  wellSeparation: number,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
  solver: Schrodinger1DSolver, // Numerical solver instance
  electricField = 0,
): BoundStateResult {
  const potential = withElectricField(
    createMultiSquareWellPotential(numberOfWells, wellWidth, wellDepth, wellSeparation),
    electricField,
  );

  try {
    return solver.solveNumerical(potential, mass, numStates, gridConfig);
  } catch (error) {
    Logger.error("Error solving multi-square well:", error);

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

/**
 * Adds the potential energy of an electron (charge −e) in a uniform electric field ℰ along +x: the
 * force is −eℰ, so V(x) = +eℰx. A zero field returns the potential unchanged.
 *
 * @param potential - Potential function V(x) in Joules (x in meters)
 * @param electricField - Electric field in V/m
 */
export function withElectricField(potential: (x: number) => number, electricField: number): (x: number) => number {
  if (electricField === 0) {
    return potential;
  }
  const slope = QuantumConstants.ELEMENTARY_CHARGE * electricField; // J/m
  return (x: number) => potential(x) + slope * x;
}

/**
 * Get the geometry information for visualization.
 * Returns the boundaries of wells and barriers for plotting.
 *
 * @param numberOfWells - Number of wells
 * @param wellWidth - Width of each well in meters
 * @param wellSeparation - Width of barriers between wells in meters
 * @returns Object with well and barrier boundaries
 */
export function getMultiSquareWellGeometry(
  numberOfWells: number,
  wellWidth: number,
  wellSeparation: number,
): {
  wells: Array<{ left: number; right: number }>;
  barriers: Array<{ left: number; right: number }>;
  totalWidth: number;
} {
  const totalWidth = numberOfWells * wellWidth + (numberOfWells - 1) * wellSeparation;
  const startX = -totalWidth / 2;

  const wells: Array<{ left: number; right: number }> = [];
  const barriers: Array<{ left: number; right: number }> = [];

  for (let i = 0; i < numberOfWells; i++) {
    const left = startX + i * (wellWidth + wellSeparation);
    const right = left + wellWidth;
    wells.push({ left, right });

    // Add barrier after this well (if not the last well)
    if (i < numberOfWells - 1) {
      const barrierLeft = right;
      const barrierRight = barrierLeft + wellSeparation;
      barriers.push({ left: barrierLeft, right: barrierRight });
    }
  }

  return { wells, barriers, totalWidth };
}
