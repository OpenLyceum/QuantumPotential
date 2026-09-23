/**
 * Main solver for the 1D time-independent Schrödinger equation.
 * Provides a unified interface for analytical and numerical solutions.
 *
 * Usage:
 *   const solver = new Schrodinger1DSolver();
 *   const result = solver.solve(potential, mass, numStates, gridConfig);
 */

import qppw from "../../QPPWNamespace.js";
import Logger from "../utils/Logger.js";
import { type AnalyticalSolution, solveDoubleSquareWellAnalytical } from "./analytical-solutions/index.js";
import { solveMultiCoulomb1D } from "./analytical-solutions/multi-coulomb-1d.js";
import { solveMultiSquareWell } from "./analytical-solutions/multi-square-well.js";
import { solveFGH } from "./FGHSolver.js";
import { createMultiPoschlTellerPotential } from "./multiPoschlTellerPotential.js";
import { NumericalMethod } from "./NumericalMethod.js";
import NumerovSolver from "./numerov/NumerovSolver.js";
import XGrid from "./numerov/XGrid.js";
import { PotentialFactory } from "./PotentialFactory.js";
import {
  type BoundStateResult,
  type GridConfig,
  type PotentialFunction,
  PotentialType,
  type WellParameters,
} from "./PotentialFunction.js";
import type { AnalyticalPotential, BasePotential } from "./potentials/index.js";
import QuantumConstants from "./QuantumConstants.js";

// Re-export potential classes for external use
export {
  AnalyticalPotential,
  BasePotential,
  NumericalPotential,
} from "./potentials/index.js";
// Re-export WellParameters for backward compatibility
export type { WellParameters };
// Re-export NumericalMethod for backward compatibility
export { NumericalMethod };

/** Samples per cell for cellAveragedPotential (midpoint rule). */
const CELL_AVERAGE_SAMPLES = 16;

/** Grid size for the FGH cross-check: dense diagonalization is O(N³), so it cannot use the Numerov grid. */
const FGH_GRID_POINTS = 256;

/** Largest grid spacing (nm) the Numerov solver is run with. */
const NUMEROV_MAX_SPACING_NM = 0.008;

/**
 * Relative tolerance for deciding that a sampled potential is mirror-symmetric about x = 0, which lets the
 * Numerov solver construct states of definite parity.
 */
const SYMMETRY_RELATIVE_TOLERANCE = 1e-9;

/** Converts a wave function from nm^(-1/2) to m^(-1/2), preserving ∫|ψ|² dx = 1. */
const NM_TO_M_WAVEFUNCTION_SCALE = Math.sqrt(1 / QuantumConstants.NM_TO_M);

/**
 * The potential averaged over a cell of the given width centred on x (midpoint rule). Used for the
 * numerical solvers so a discontinuous potential is represented by its correct weight in every cell.
 */
function cellAveragedPotential(potential: PotentialFunction, cellWidth: number): PotentialFunction {
  return (x: number) => {
    let sum = 0;
    for (let k = 0; k < CELL_AVERAGE_SAMPLES; k++) {
      sum += potential(x + ((k + 0.5) / CELL_AVERAGE_SAMPLES - 0.5) * cellWidth);
    }
    return sum / CELL_AVERAGE_SAMPLES;
  };
}

/**
 * Main class for solving the 1D time-independent Schrödinger equation.
 */
export class Schrodinger1DSolver {
  private numericalMethod: NumericalMethod;
  private analyticalSolution: AnalyticalSolution | null = null;

  /**
   * Create a new solver instance.
   * @param method - Numerical method to use (default: Numerov)
   */
  constructor(method: NumericalMethod = NumericalMethod.NUMEROV) {
    this.numericalMethod = method;
  }

  /**
   * Get the current numerical method setting.
   */
  public getNumericalMethod(): NumericalMethod {
    return this.numericalMethod;
  }

  /**
   * Get the current analytical solution instance (if one has been created).
   * This provides access to additional methods like calculateTurningPoints,
   * calculateWavefunctionZeros, etc.
   */
  public getAnalyticalSolution(): AnalyticalSolution | null {
    return this.analyticalSolution;
  }

  /**
   * Solve the Schrödinger equation using analytical solution if available,
   * otherwise use numerical method.
   *
   * @param wellParams - Parameters defining the potential well (for analytical solutions)
   * @param mass - Particle mass in kg
   * @param numStates - Number of bound states to calculate
   * @param gridConfig - Grid configuration for spatial discretization
   * @returns Bound state results with energies and wavefunctions
   */
  public solveAnalyticalIfPossible(
    wellParams: WellParameters,
    mass: number,
    numStates: number,
    gridConfig: GridConfig,
  ): BoundStateResult {
    // Try to create analytical solution instance and solve
    this.analyticalSolution = this.createAnalyticalSolution(wellParams, mass);

    if (this.analyticalSolution) {
      return this.analyticalSolution.solve(numStates, gridConfig);
    }

    // Handle special cases that don't have classes yet (multi-well potentials)
    const specialCaseResult = this.handleSpecialCases(wellParams, mass, numStates, gridConfig);
    if (specialCaseResult) {
      return specialCaseResult;
    }

    // If no analytical solution available, throw error
    throw new Error(
      `No analytical solution available for potential type: ${wellParams.type}. Use solve() method with a custom potential function instead.`,
    );
  }

  /**
   * Create an analytical solution instance based on well parameters.
   * Returns null if the potential type doesn't have an analytical solution
   * or if required parameters are missing.
   *
   * @param wellParams - Parameters defining the potential well
   * @param mass - Particle mass in kg
   * @returns AnalyticalSolution instance or null
   */
  private createAnalyticalSolution(wellParams: WellParameters, mass: number): AnalyticalSolution | null {
    return PotentialFactory.createAnalyticalSolution(wellParams, mass);
  }

  /**
   * Handle special cases that don't have analytical solution classes yet.
   * These are typically multi-well potentials that still use standalone functions.
   *
   * @returns BoundStateResult if handled, null otherwise
   */
  private handleSpecialCases(
    wellParams: WellParameters,
    mass: number,
    numStates: number,
    gridConfig: GridConfig,
  ): BoundStateResult | null {
    switch (wellParams.type) {
      case PotentialType.DOUBLE_POSCHL_TELLER:
      case PotentialType.MULTI_POSCHL_TELLER:
        if (
          wellParams.wellWidth !== undefined &&
          wellParams.wellDepth !== undefined &&
          wellParams.wellSeparation !== undefined &&
          (wellParams.type === PotentialType.DOUBLE_POSCHL_TELLER || wellParams.numberOfWells !== undefined)
        ) {
          return this.solveNumerical(
            createMultiPoschlTellerPotential(
              wellParams.type === PotentialType.DOUBLE_POSCHL_TELLER ? 2 : wellParams.numberOfWells!,
              wellParams.wellWidth,
              wellParams.wellDepth,
              wellParams.wellSeparation,
              wellParams.electricField ?? 0,
            ),
            mass,
            numStates,
            gridConfig,
          );
        }
        break;

      case PotentialType.DOUBLE_SQUARE_WELL:
        if (
          wellParams.wellWidth !== undefined &&
          wellParams.wellDepth !== undefined &&
          wellParams.wellSeparation !== undefined
        ) {
          // Always use analytical solution for double square well
          // Solves the transcendental equations from boundary conditions exactly
          return solveDoubleSquareWellAnalytical(
            wellParams.wellWidth,
            wellParams.wellDepth,
            wellParams.wellSeparation,
            mass,
            numStates,
            gridConfig,
          );
        }
        break;

      case PotentialType.MULTI_SQUARE_WELL:
        if (
          wellParams.numberOfWells !== undefined &&
          wellParams.wellWidth !== undefined &&
          wellParams.wellDepth !== undefined &&
          wellParams.wellSeparation !== undefined
        ) {
          return solveMultiSquareWell(
            wellParams.numberOfWells,
            wellParams.wellWidth,
            wellParams.wellDepth,
            wellParams.wellSeparation,
            mass,
            numStates,
            gridConfig,
            this, // Pass solver instance for numerical methods
            wellParams.electricField ?? 0,
          );
        }
        break;

      case PotentialType.MULTI_COULOMB_1D:
        if (
          wellParams.numberOfWells !== undefined &&
          wellParams.wellSeparation !== undefined &&
          wellParams.coulombStrength !== undefined
        ) {
          return solveMultiCoulomb1D(
            wellParams.numberOfWells,
            wellParams.wellSeparation,
            wellParams.coulombStrength,
            mass,
            numStates,
            gridConfig,
            this, // Pass solver instance for numerical methods
            wellParams.electricField ?? 0,
          );
        }
        break;
    }

    return null;
  }

  /**
   * Solve the Schrödinger equation numerically for an arbitrary potential.
   *
   * Numerov (the default) finds every bound state in the energy window by node counting, so it resolves
   * the closely spaced minibands of the multi-well potentials. FGH is a dense-matrix cross-check.
   *
   * @param pointPotential - Function V(x) returning potential energy in Joules (x in meters)
   * @param mass - Particle mass in kg
   * @param numStates - Maximum number of bound states to return
   * @param gridConfig - Grid configuration for spatial discretization (meters)
   * @param energyRange - Optional energy window [min, max] in Joules. Defaults to [min V, lower of the two
   *   boundary values of V], i.e. states bound below the asymptotic potential on both sides.
   * @returns Bound state results with energies and wavefunctions
   */
  public solveNumerical(
    pointPotential: PotentialFunction,
    mass: number,
    numStates: number,
    gridConfig: GridConfig,
    energyRange?: [number, number],
  ): BoundStateResult {
    return this.numericalMethod === NumericalMethod.FGH
      ? this.solveFGH(pointPotential, mass, numStates, gridConfig)
      : this.solveNumerov(pointPotential, mass, numStates, gridConfig, energyRange);
  }

  private solveNumerov(
    pointPotential: PotentialFunction,
    mass: number,
    numStates: number,
    gridConfig: GridConfig,
    energyRange?: [number, number],
  ): BoundStateResult {
    // The Numerov solver works in nm, eV and electron masses (see NumerovConstants). Shooting needs a fine
    // grid (h²k²/12 ≪ 1 even in deep wells), so a coarser request is refined; the count is odd so that
    // x = 0 is a grid point.
    const rangeNm = (gridConfig.xMax - gridConfig.xMin) / QuantumConstants.NM_TO_M;
    const requestedPoints = Math.max(gridConfig.numPoints, Math.ceil(rangeNm / NUMEROV_MAX_SPACING_NM) + 1);
    const numberOfPoints = requestedPoints % 2 === 1 ? requestedPoints : requestedPoints + 1;
    const xGrid = new XGrid(
      gridConfig.xMin / QuantumConstants.NM_TO_M,
      gridConfig.xMax / QuantumConstants.NM_TO_M,
      numberOfPoints,
    );
    const cellAveraged = cellAveragedPotential(pointPotential, xGrid.dx * QuantumConstants.NM_TO_M);
    const potentialEv = (xNm: number) => cellAveraged(xNm * QuantumConstants.NM_TO_M) * QuantumConstants.JOULES_TO_EV;

    const values = xGrid.xCoordinates.map(potentialEv);
    const [energyMinEv, energyMaxEv] = energyRange
      ? [energyRange[0] * QuantumConstants.JOULES_TO_EV, energyRange[1] * QuantumConstants.JOULES_TO_EV]
      : [Math.min(...values), Math.min(values[0]!, values[values.length - 1]!)];

    const empty: BoundStateResult = {
      energies: [],
      wavefunctions: [],
      xGrid: xGrid.xCoordinates.map((x) => x * QuantumConstants.NM_TO_M),
      method: "numerov",
    };
    if (!(energyMaxEv > energyMinEv)) {
      return empty;
    }

    const solution = NumerovSolver.solve(
      potentialEv,
      Math.abs(xGrid.xMin + xGrid.xMax) < 1e-9 * xGrid.dx && Schrodinger1DSolver.isSymmetric(values),
      xGrid,
      mass / QuantumConstants.ELECTRON_MASS,
      energyMinEv,
      energyMaxEv,
    );

    // Drop any state whose wave function could not be normalized. This only happens for the grid-limited
    // states that collapse onto a bare 1D Coulomb singularity (see tests/accuracy/README.md).
    const energies: number[] = [];
    const wavefunctions: number[][] = [];
    solution.eigenvalues.forEach((energyEv, n) => {
      const psi = solution.waveFunctionSolutions[n]!;
      if (energies.length < numStates && psi.every(Number.isFinite) && psi.some((value) => value !== 0)) {
        energies.push(energyEv * QuantumConstants.EV_TO_JOULES);
        wavefunctions.push(psi.map((value) => value * NM_TO_M_WAVEFUNCTION_SCALE));
      } else if (energies.length < numStates) {
        Logger.debug(`Numerov: dropped unnormalizable state at ${energyEv.toFixed(3)} eV`);
      }
    });
    return { ...empty, energies, wavefunctions };
  }

  private solveFGH(
    pointPotential: PotentialFunction,
    mass: number,
    numStates: number,
    gridConfig: GridConfig,
  ): BoundStateResult {
    const fghGridConfig: GridConfig = { xMin: gridConfig.xMin, xMax: gridConfig.xMax, numPoints: FGH_GRID_POINTS };

    // Evaluate the potential as its average over each grid cell rather than at the grid point, so the
    // effective width of a step potential does not depend on where its edges fall between samples.
    const cellWidth = (gridConfig.xMax - gridConfig.xMin) / (FGH_GRID_POINTS - 1);
    return solveFGH(cellAveragedPotential(pointPotential, cellWidth), mass, numStates, fghGridConfig, false);
  }

  /**
   * Whether sampled potential values on a grid symmetric about x = 0 satisfy V(-x) = V(x).
   */
  private static isSymmetric(values: readonly number[]): boolean {
    const scale = Math.max(...values.map((v) => (Number.isFinite(v) ? Math.abs(v) : 0)), 1e-12);
    const n = values.length;
    for (let i = 0; i < n / 2; i++) {
      const left = values[i]!;
      const right = values[n - 1 - i]!;
      if (left !== right && !(Math.abs(left - right) <= SYMMETRY_RELATIVE_TOLERANCE * scale)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Create a potential class instance from well parameters.
   * This is the new class-based approach that separates analytical and numerical potentials.
   *
   * @param wellParams - Parameters defining the potential well
   * @param mass - Particle mass in kg
   * @returns BasePotential instance (AnalyticalPotential or NumericalPotential)
   */
  public createPotential(wellParams: WellParameters, mass: number): BasePotential | null {
    return PotentialFactory.createPotential(wellParams, mass);
  }

  /**
   * Solve the Schrödinger equation using a potential class instance.
   * This method automatically uses analytical or numerical methods based on
   * the potential type.
   *
   * @param potential - Potential class instance (AnalyticalPotential or NumericalPotential)
   * @param numStates - Number of bound states to calculate
   * @param gridConfig - Grid configuration for spatial discretization
   * @returns Bound state results with energies and wavefunctions
   */
  public solvePotential(potential: BasePotential, numStates: number, gridConfig: GridConfig): BoundStateResult {
    if (potential.hasAnalyticalSolution()) {
      // Use analytical solution
      const analyticalPotential = potential as AnalyticalPotential;
      return analyticalPotential.solve(numStates, gridConfig);
    } else {
      // Use numerical solution
      const potentialFunction = potential.createPotential();
      return this.solveNumerical(potentialFunction, potential.getMass(), numStates, gridConfig);
    }
  }

  /**
   * Create a potential function for an infinite square well.
   * Centered at x=0, extending from -wellWidth/2 to +wellWidth/2.
   * @param wellWidth - Width of the well in meters
   * @param wellDepth - Depth of the well in Joules (0 inside, depth outside)
   * @returns Potential function V(x)
   */
  public static createInfiniteWellPotential(wellWidth: number, wellDepth = 1e100): PotentialFunction {
    const halfWidth = wellWidth / 2;
    return (x: number) => {
      if (x >= -halfWidth && x <= halfWidth) {
        return 0;
      } else {
        return wellDepth; // Very large value to approximate infinity
      }
    };
  }

  /**
   * Create a potential function for a finite square well.
   * @param wellWidth - Width of the well in meters
   * @param wellDepth - Depth of the well in Joules (V=0 outside, V=-depth inside)
   * @param center - Center position of well in meters (default 0)
   * @returns Potential function V(x)
   */
  public static createFiniteWellPotential(wellWidth: number, wellDepth: number, center = 0): PotentialFunction {
    const halfWidth = wellWidth / 2;
    return (x: number) => {
      const xShifted = x - center;
      if (Math.abs(xShifted) <= halfWidth) {
        return -wellDepth;
      } else {
        return 0;
      }
    };
  }

  /**
   * Convert energy from eV to Joules.
   */
  public static eVToJoules(eV: number): number {
    return eV * QuantumConstants.EV_TO_JOULES;
  }

  /**
   * Convert energy from Joules to eV.
   */
  public static joulesToEV(joules: number): number {
    return joules * QuantumConstants.JOULES_TO_EV;
  }
}

qppw.register("Schrodinger1DSolver", Schrodinger1DSolver);

export default Schrodinger1DSolver;
