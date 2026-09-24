/**
 * Main solver for the 1D time-independent Schrödinger equation.
 * Provides a unified interface for analytical and numerical solutions.
 *
 * Usage:
 *   const solver = new Schrodinger1DSolver();
 *   const result = solver.solveAnalyticalIfPossible(wellParams, mass, numStates, gridConfig);
 *   const numeric = solver.solveNumerical(potential, mass, numStates, gridConfig);
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
import QuantumConstants from "./QuantumConstants.js";

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
   * The closed-form solution used by the last solveAnalyticalIfPossible call, or null when that call took a
   * numerical path. Models use it for turning points, derivatives, V(x) and the momentum-space transform.
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
        return this.solveNumerical(
          createMultiPoschlTellerPotential(
            2,
            wellParams.wellWidth,
            wellParams.wellDepth,
            wellParams.wellSeparation,
            wellParams.electricField ?? 0,
          ),
          mass,
          numStates,
          gridConfig,
        );
      case PotentialType.MULTI_POSCHL_TELLER:
        return this.solveNumerical(
          createMultiPoschlTellerPotential(
            wellParams.numberOfWells,
            wellParams.wellWidth,
            wellParams.wellDepth,
            wellParams.wellSeparation,
            wellParams.electricField ?? 0,
          ),
          mass,
          numStates,
          gridConfig,
        );
      case PotentialType.DOUBLE_SQUARE_WELL:
        return solveDoubleSquareWellAnalytical(
          wellParams.wellWidth,
          wellParams.wellDepth,
          wellParams.wellSeparation,
          mass,
          numStates,
          gridConfig,
        );
      case PotentialType.MULTI_SQUARE_WELL:
        return solveMultiSquareWell(
          wellParams.numberOfWells,
          wellParams.wellWidth,
          wellParams.wellDepth,
          wellParams.wellSeparation,
          mass,
          numStates,
          gridConfig,
          this,
          wellParams.electricField ?? 0,
        );
      case PotentialType.MULTI_COULOMB_1D:
        return solveMultiCoulomb1D(
          wellParams.numberOfWells,
          wellParams.wellSeparation,
          wellParams.coulombStrength,
          mass,
          numStates,
          gridConfig,
          this,
          wellParams.electricField ?? 0,
        );
      default:
        return null;
    }
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
}

qppw.register("Schrodinger1DSolver", Schrodinger1DSolver);

export default Schrodinger1DSolver;
