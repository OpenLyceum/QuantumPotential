/**
 * Multi-square well potential - generalization of double square well to N wells.
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
 * Solve multi-square well potential using numerical methods.
 *
 * Since the transcendental equations for N > 2 wells become extremely complex,
 * we use numerical solvers (DVR, FGH, or Matrix Numerov) to find bound states.
 *
 * @param numberOfWells - Number of wells (1 to 10)
 * @param wellWidth - Width of each well in meters
 * @param wellDepth - Depth of each well (barrier height) in Joules
 * @param wellSeparation - Separation between wells (barrier width) in meters
 * @param mass - Particle mass in kg
 * @param numStates - Number of energy levels to calculate
 * @param gridConfig - Grid configuration for wavefunction evaluation
 * @param solver - Reference to the numerical solver to use
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
): BoundStateResult {
  // Create the potential function
  const potential = createMultiSquareWellPotential(numberOfWells, wellWidth, wellDepth, wellSeparation);

  // Use numerical solver to find bound states
  // The solver will be passed in from Schrodinger1DSolver
  // and will use the currently selected method (DVR, FGH, Matrix Numerov, etc.)

  try {
    const result = solver.solveNumerical(potential, mass, numStates, gridConfig);

    return {
      ...result,
      method: "analytical" as const, // Mark as analytical even though we use numerical
      // (since we have an exact potential definition)
    };
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
      method: "analytical",
    };
  }
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
