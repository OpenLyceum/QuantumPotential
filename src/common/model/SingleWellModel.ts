/**
 * SingleWellModel is the shared model for the screens that show one closed-form potential (Intro and One Well).
 * Every potential it offers has an AnalyticalSolution, so V(x), turning points and the classical probability
 * all come from the same solution the solver used; nothing here re-derives a potential.
 */

import { NumberProperty } from "scenerystack/axon";
import { clamp, Range } from "scenerystack/dot";
import Logger from "../utils/Logger.js";
import { BaseModel, type BaseModelOptions } from "./BaseModel.js";
import { NoBoundStatesError } from "./NoBoundStatesError.js";
import { PotentialFactory } from "./PotentialFactory.js";
import { PotentialType, type SingleWellParameters } from "./PotentialFunction.js";
import { PotentialParameterPresets, SINGLE_WELL_PARAMETER_PRESETS } from "./PotentialParameterPresets.js";
import QuantumConstants from "./QuantumConstants.js";
import { createSingleWellParameters } from "./SingleWellParameters.js";

export type SingleWellModelOptions = BaseModelOptions & {
  /** Number of points on which the analytical wave functions are evaluated. */
  analyticalGridPoints: number;
};

export abstract class SingleWellModel extends BaseModel {
  // ==================== CONSTANTS ====================

  /** Default barrier height (eV) for the Rosen–Morse and Eckart potentials. */
  private static readonly DEFAULT_BARRIER_HEIGHT = 4;
  private static readonly BARRIER_HEIGHT_RANGE = new Range(0, 10);

  /** Default energy offset (eV) of the triangular potential. */
  private static readonly DEFAULT_POTENTIAL_OFFSET = 0;
  private static readonly POTENTIAL_OFFSET_RANGE = new Range(-5, 15);

  /** Minimum number of states requested for the finite well. */
  private static readonly DEFAULT_NUM_STATES = 10;

  /** States requested for the asymmetric triangle, whose spectrum is dense. */
  private static readonly NUM_STATES_ASYMMETRIC_TRIANGLE = 80;

  /** States requested for the triangular potential. */
  private static readonly NUM_STATES_TRIANGULAR = 50;

  /** States requested for the other potentials. */
  private static readonly NUM_STATES_OTHER = 80;

  /** The harmonic oscillator and infinite well are cut off at this energy (eV); they have infinitely many states. */
  private static readonly MAX_ENERGY_EV = 15;

  /**
   * Cap for the 1D Coulomb potential: each of its states needs its own Laguerre recurrence at every grid point,
   * and its high levels crowd against E = 0 and spread far past the chart anyway.
   */
  private static readonly MAX_NUM_STATES_COULOMB = 200;

  /** Safety cap on the number of states (a 50 mₑ particle in a deep, wide well binds several hundred). */
  private static readonly MAX_NUM_STATES = 800;

  /** The harmonic oscillator's spring constant is k = SPRING_CONSTANT_MULTIPLIER · V₀ / L². */
  protected static readonly SPRING_CONSTANT_MULTIPLIER = 8;

  /** Coulomb's constant k = 1/(4πε₀) in N·m²/C²; the 1D Coulomb strength is k e². */
  private static readonly COULOMB_CONSTANT = 8.9875517923e9;

  // ==================== PROPERTIES ====================

  public readonly barrierHeightProperty: NumberProperty; // eV, for Rosen–Morse and Eckart
  public readonly potentialOffsetProperty: NumberProperty; // eV, for the triangular potential
  private readonly parameterPresets: PotentialParameterPresets<"wellWidth" | "wellDepth" | "barrierHeight">;
  private readonly analyticalGridPoints: number;

  protected constructor(options: SingleWellModelOptions) {
    super(options);
    this.analyticalGridPoints = options.analyticalGridPoints;

    this.barrierHeightProperty = new NumberProperty(SingleWellModel.DEFAULT_BARRIER_HEIGHT, {
      range: SingleWellModel.BARRIER_HEIGHT_RANGE,
    });
    this.potentialOffsetProperty = new NumberProperty(SingleWellModel.DEFAULT_POTENTIAL_OFFSET, {
      range: SingleWellModel.POTENTIAL_OFFSET_RANGE,
    });

    this.parameterPresets = new PotentialParameterPresets(
      this.potentialTypeProperty,
      {
        wellWidth: this.wellWidthProperty,
        wellDepth: this.wellDepthProperty,
        barrierHeight: this.barrierHeightProperty,
      },
      SINGLE_WELL_PARAMETER_PRESETS,
    );
  }

  protected override setupCacheInvalidation(): void {
    super.setupCacheInvalidation();
    const invalidateCache = () => this.invalidateBoundStates();
    this.barrierHeightProperty.lazyLink(invalidateCache);
    this.potentialOffsetProperty.lazyLink(invalidateCache);
  }

  /** Resets every Property; the presets are restored for the reset potential type. */
  public override reset(): void {
    this.parameterPresets.reset(() => {
      super.reset();
      this.resetSingleWellProperties();
    });
  }

  /** Resets the Properties this class and its subclasses add. Subclasses extend it and call super. */
  protected resetSingleWellProperties(): void {
    this.barrierHeightProperty.reset();
    this.potentialOffsetProperty.reset();
  }

  /** Spring constant (N/m) of the harmonic oscillator for the current width and depth. */
  protected getSpringConstant(): number {
    const wellWidth = this.wellWidthProperty.value * QuantumConstants.NM_TO_M;
    const wellDepth = this.wellDepthProperty.value * QuantumConstants.EV_TO_JOULES;
    return (SingleWellModel.SPRING_CONSTANT_MULTIPLIER * wellDepth) / (wellWidth * wellWidth);
  }

  /** The current controls as the solver's typed SI parameters. */
  private getWellParameters(): SingleWellParameters {
    return createSingleWellParameters(
      this.potentialTypeProperty.value,
      this.wellWidthProperty.value * QuantumConstants.NM_TO_M,
      this.wellDepthProperty.value * QuantumConstants.EV_TO_JOULES,
      this.barrierHeightProperty.value * QuantumConstants.EV_TO_JOULES,
      this.potentialOffsetProperty.value * QuantumConstants.EV_TO_JOULES,
      SingleWellModel.SPRING_CONSTANT_MULTIPLIER,
      SingleWellModel.COULOMB_CONSTANT * QuantumConstants.ELEMENTARY_CHARGE ** 2,
    );
  }

  /**
   * How many states to request: every state below MAX_ENERGY_EV when there are infinitely many.
   * The fixed counts are for an electron; the number of bound states grows as √m, so they scale with it.
   */
  private getNumberOfStatesToRequest(mass: number): number {
    const massScale = Math.sqrt(Math.max(1, mass / QuantumConstants.ELECTRON_MASS));
    const scaled = (numStates: number) => Math.min(Math.ceil(numStates * massScale), SingleWellModel.MAX_NUM_STATES);
    const wellWidth = this.wellWidthProperty.value * QuantumConstants.NM_TO_M;
    const wellDepth = this.wellDepthProperty.value * QuantumConstants.EV_TO_JOULES;
    const maxEnergy = SingleWellModel.MAX_ENERGY_EV * QuantumConstants.EV_TO_JOULES;
    const { HBAR } = QuantumConstants;

    switch (this.potentialTypeProperty.value) {
      case PotentialType.HARMONIC_OSCILLATOR: {
        // E_n = ℏω(n + 1/2)
        const omega = Math.sqrt(this.getSpringConstant() / mass);
        const maxN = Math.floor(maxEnergy / (HBAR * omega) - 0.5);
        return clamp(maxN + 1, 1, SingleWellModel.MAX_NUM_STATES);
      }
      case PotentialType.INFINITE_WELL: {
        // E_n = ℏ²π²n² / (2mL²)
        const maxN = Math.floor(
          Math.sqrt((2 * mass * wellWidth * wellWidth * maxEnergy) / (HBAR * HBAR * Math.PI ** 2)),
        );
        return clamp(maxN, 1, SingleWellModel.MAX_NUM_STATES);
      }
      case PotentialType.FINITE_WELL: {
        // n_max ≈ (1/π)·√(2mV₀L²/ℏ²); ask for twice that so no bound state is missed
        const estimatedMax = Math.ceil(
          (1 / Math.PI) * Math.sqrt((2 * mass * wellDepth * wellWidth * wellWidth) / (HBAR * HBAR)),
        );
        return clamp(estimatedMax * 2, SingleWellModel.DEFAULT_NUM_STATES, SingleWellModel.MAX_NUM_STATES);
      }
      case PotentialType.ASYMMETRIC_TRIANGLE:
        return scaled(SingleWellModel.NUM_STATES_ASYMMETRIC_TRIANGLE);
      case PotentialType.TRIANGULAR:
        return scaled(SingleWellModel.NUM_STATES_TRIANGULAR);
      case PotentialType.COULOMB_1D:
        return Math.min(scaled(SingleWellModel.NUM_STATES_OTHER), SingleWellModel.MAX_NUM_STATES_COULOMB);
      default:
        return scaled(SingleWellModel.NUM_STATES_OTHER);
    }
  }

  protected override calculateBoundStates(): void {
    const mass = this.particleMassProperty.value * QuantumConstants.ELECTRON_MASS;
    const gridConfig = {
      xMin: -BaseModel.CHART_HALF_RANGE_NM * QuantumConstants.NM_TO_M,
      xMax: BaseModel.CHART_HALF_RANGE_NM * QuantumConstants.NM_TO_M,
      numPoints: this.analyticalGridPoints,
    };

    try {
      this.boundStateResult = this.solver.solveAnalyticalIfPossible(
        this.getWellParameters(),
        mass,
        this.getNumberOfStatesToRequest(mass),
        gridConfig,
      );
    } catch (error) {
      if (error instanceof NoBoundStatesError) {
        Logger.debug(error.message);
      } else {
        Logger.error("Error calculating bound states:", error);
      }
      this.boundStateResult = null;
    }
  }

  /** V(x) from the potential's closed-form solution, the same one the solver uses. */
  protected override calculatePotentialEnergy(xGrid: readonly number[]): number[] {
    const mass = this.particleMassProperty.value * QuantumConstants.ELECTRON_MASS;
    const solution = PotentialFactory.createAnalyticalSolution(this.getWellParameters(), mass);
    if (!solution) {
      throw new Error(`No closed-form solution for single-well potential ${this.potentialTypeProperty.value}`);
    }
    const potential = solution.createPotential();
    return xGrid.map((x) => potential(x));
  }

  /** Classical probability density (m⁻¹) of the given level, from the analytical solution when possible. */
  public override getClassicalProbabilityDensity(energyIndex: number): number[] | null {
    const states = this.getBoundStates();
    if (!states || energyIndex < 0 || energyIndex >= states.energies.length) {
      return null;
    }

    const energy = states.energies[energyIndex]!;
    const mass = this.particleMassProperty.value * QuantumConstants.ELECTRON_MASS;
    const analyticalSolution = this.solver.getAnalyticalSolution();
    if (analyticalSolution) {
      try {
        return analyticalSolution.calculateClassicalProbability(energy, mass, states.xGrid);
      } catch (error) {
        Logger.warn("Failed to use analytical classical probability, falling back to numerical:", error);
      }
    }
    return this.calculateClassicalProbabilityDensity(this.getPotentialEnergy(states.xGrid), energy, mass, states.xGrid);
  }

  /**
   * The classical turning points (nm) of the given level, clamped to the chart, or null if there are none.
   * Uses the analytical solution's turning points, falling back to where the solved V(x) crosses E.
   */
  public getClassicalTurningPoints(energyLevel: number): { left: number; right: number } | null {
    const states = this.getBoundStates();
    if (!states || energyLevel < 0 || energyLevel >= states.energies.length) {
      return null;
    }
    const energy = states.energies[energyLevel]!;
    const clampToChart = (xNm: number) => clamp(xNm, -BaseModel.CHART_HALF_RANGE_NM, BaseModel.CHART_HALF_RANGE_NM);

    const analyticalSolution = this.solver.getAnalyticalSolution();
    if (analyticalSolution) {
      try {
        // A single well has one classically allowed region
        const first = analyticalSolution.calculateTurningPoints(energy)[0];
        if (first) {
          return {
            left: clampToChart(first.left * QuantumConstants.M_TO_NM),
            right: clampToChart(first.right * QuantumConstants.M_TO_NM),
          };
        }
      } catch (error) {
        Logger.warn("Failed to use analytical turning points, falling back to numerical:", error);
      }
    }

    // Fallback: the outermost crossings of E by the sampled V(x)
    const xGrid = states.xGrid;
    const potential = this.getPotentialEnergy(xGrid);
    let left: number | null = null;
    let right: number | null = null;
    for (let i = 0; i < xGrid.length - 1; i++) {
      const v = potential[i]!;
      const vNext = potential[i + 1]!;
      if (v !== vNext && (v - energy) * (vNext - energy) <= 0) {
        const t = (energy - v) / (vNext - v);
        const crossingNm = (xGrid[i]! + t * (xGrid[i + 1]! - xGrid[i]!)) * QuantumConstants.M_TO_NM;
        if (left === null) {
          left = crossingNm;
        } else {
          right = crossingNm;
        }
      }
    }
    return left !== null && right !== null ? { left: clampToChart(left), right: clampToChart(right) } : null;
  }

  /** Probability (%) of finding the particle of the given level outside its turning points. */
  public getClassicallyForbiddenProbability(energyLevel: number): number {
    const states = this.getBoundStates();
    const turningPoints = this.getClassicalTurningPoints(energyLevel);
    if (!(states && turningPoints)) {
      return 0;
    }

    const wavefunction = states.wavefunctions[energyLevel]!;
    const xNm = states.xGrid.map((x) => x * QuantumConstants.M_TO_NM);
    let forbiddenProbability = 0;
    let totalProbability = 0;
    for (let i = 0; i < xNm.length; i++) {
      // Trapezoidal weight: half the distance between the neighbouring samples
      const dx = (xNm[Math.min(i + 1, xNm.length - 1)]! - xNm[Math.max(i - 1, 0)]!) / 2;
      const weight = wavefunction[i]! * wavefunction[i]! * dx;
      totalProbability += weight;
      if (xNm[i]! < turningPoints.left || xNm[i]! > turningPoints.right) {
        forbiddenProbability += weight;
      }
    }
    return totalProbability > 0 ? (forbiddenProbability / totalProbability) * 100 : 0;
  }
}
