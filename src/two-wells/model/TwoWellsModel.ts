/**
 * TwoWellsModel represents the physics model for a double quantum potential well.
 * It handles quantum tunneling and double-well dynamics.
 */

import { NumberProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { BaseModel } from "../../common/model/BaseModel.js";
import { createMultiPoschlTellerPotential } from "../../common/model/multiPoschlTellerPotential.js";
import { NoBoundStatesError } from "../../common/model/NoBoundStatesError.js";
import { type GridConfig, PotentialType } from "../../common/model/PotentialFunction.js";
import QuantumConstants from "../../common/model/QuantumConstants.js";
import type { WellParameters } from "../../common/model/Schrodinger1DSolver.js";
import { SuperpositionType } from "../../common/model/SuperpositionType.js";
import Logger from "../../common/utils/Logger.js";
import qppwQueryParameters from "../../preferences/qppwQueryParameters.js";

export class TwoWellsModel extends BaseModel {
  // ==================== CONSTANTS ====================

  /**
   * Default well width in nanometers for double square well.
   */
  private static readonly DEFAULT_WELL_WIDTH = 2.4;

  /**
   * Minimum well width in nanometers for double square well.
   */
  private static readonly TWO_WELL_WIDTH_MIN = 0.1;

  /**
   * Maximum well width in nanometers for double square well.
   */
  private static readonly TWO_WELL_WIDTH_MAX = 3.0;

  /**
   * Default well separation in nanometers.
   * Edge-to-edge gap between the two wells.
   */
  private static readonly DEFAULT_WELL_SEPARATION = 0.2;

  /**
   * Minimum well separation in nanometers.
   */
  private static readonly WELL_SEPARATION_MIN = 0.05;

  /**
   * Maximum well separation in nanometers.
   */
  private static readonly WELL_SEPARATION_MAX = 4.0;

  /**
   * Default barrier height in electron volts.
   */
  private static readonly DEFAULT_BARRIER_HEIGHT = 3;

  /**
   * Minimum barrier height in electron volts.
   */
  private static readonly BARRIER_HEIGHT_MIN = 0.1;

  /**
   * Maximum barrier height in electron volts.
   */
  private static readonly BARRIER_HEIGHT_MAX = 15.0;

  /**
   * Default barrier width in nanometers.
   */
  private static readonly DEFAULT_BARRIER_WIDTH = 2;

  /**
   * Minimum barrier width in nanometers.
   */
  private static readonly BARRIER_WIDTH_MIN = 0.1;

  /**
   * Maximum barrier width in nanometers.
   */
  private static readonly BARRIER_WIDTH_MAX = 5.0;

  /**
   * Default amplitude for superposition states.
   * Normalized value for equal superposition (1/√2).
   */
  private static readonly DEFAULT_SUPERPOSITION_AMPLITUDE = 0.7;

  /**
   * Default number of states for most potentials.
   */
  private static readonly DEFAULT_NUM_STATES = 10;

  /**
   * Number of states for double square well.
   * Higher value needed to capture energy level splitting.
   */
  private static readonly NUM_STATES_DOUBLE_WELL = 80;

  /**
   * Maximum energy in electron volts for state calculations.
   */
  private static readonly MAX_ENERGY_EV = 15;

  /**
   * Maximum number of states (safety cap).
   */
  private static readonly MAX_NUM_STATES = 100;

  /**
   * Chart display range in nanometers (extends from -RANGE to +RANGE).
   */
  private static readonly CHART_DISPLAY_RANGE_NM = 4;

  /**
   * Number of grid points for double square well analytical solution.
   * High resolution needed for accurate wavefunction representation.
   */
  private static readonly DOUBLE_WELL_GRID_POINTS = 2000;

  /**
   * Half divisor for position calculations.
   * Used to calculate midpoints and half-widths.
   */
  private static readonly HALF_DIVISOR = 2;

  // ==================== PROPERTIES ====================

  // Model-specific well parameters
  public readonly wellSeparationProperty: NumberProperty;

  // Barrier parameters
  public readonly barrierHeightProperty: NumberProperty;
  public readonly barrierWidthProperty: NumberProperty;

  // Tunneling visualization
  public readonly tunnelingProbabilityProperty: NumberProperty;

  public constructor() {
    super({
      screenKind: "twoWells",
      potentialType: PotentialType.DOUBLE_SQUARE_WELL,
      wellWidth: TwoWellsModel.DEFAULT_WELL_WIDTH,
      wellDepth: 13,
      wellWidthRange: new Range(TwoWellsModel.TWO_WELL_WIDTH_MIN, TwoWellsModel.TWO_WELL_WIDTH_MAX),
      // Default to an equal superposition of the first two states
      superpositionConfig: {
        type: SuperpositionType.PSI_I_PSI_J,
        amplitudes: [TwoWellsModel.DEFAULT_SUPERPOSITION_AMPLITUDE, TwoWellsModel.DEFAULT_SUPERPOSITION_AMPLITUDE],
        phases: [0, 0],
      },
    });

    // Initialize model-specific well parameters
    this.wellSeparationProperty = new NumberProperty(TwoWellsModel.DEFAULT_WELL_SEPARATION, {
      range: new Range(TwoWellsModel.WELL_SEPARATION_MIN, TwoWellsModel.WELL_SEPARATION_MAX),
    }); // in nanometers

    // Initialize barrier parameters
    this.barrierHeightProperty = new NumberProperty(TwoWellsModel.DEFAULT_BARRIER_HEIGHT, {
      range: new Range(TwoWellsModel.BARRIER_HEIGHT_MIN, TwoWellsModel.BARRIER_HEIGHT_MAX),
    }); // in eV
    this.barrierWidthProperty = new NumberProperty(TwoWellsModel.DEFAULT_BARRIER_WIDTH, {
      range: new Range(TwoWellsModel.BARRIER_WIDTH_MIN, TwoWellsModel.BARRIER_WIDTH_MAX),
    }); // in nanometers

    // Initialize tunneling probability
    this.tunnelingProbabilityProperty = new NumberProperty(0);

    // Setup cache invalidation after all properties are initialized
    this.setupCacheInvalidation();
  }

  /**
   * Setup cache invalidation listeners, including model-specific properties.
   * Extends the base implementation to add TwoWellsModel-specific invalidation.
   */
  protected override setupCacheInvalidation(): void {
    super.setupCacheInvalidation();

    const invalidateCache = () => {
      this.invalidateBoundStates();
    };

    this.wellSeparationProperty.lazyLink(invalidateCache);
  }

  /**
   * Resets all properties to their initial state.
   * Override from BaseModel to reset model-specific properties.
   */
  public override reset(): void {
    super.reset();
    this.wellSeparationProperty.reset();
    this.barrierHeightProperty.reset();
    this.barrierWidthProperty.reset();
    this.tunnelingProbabilityProperty.reset();
  }

  /**
   * Steps the model forward in time.
   * @param dt - The time step in seconds (can be negative for backward stepping)
   * @param forced - If true, steps even when paused (for manual stepping buttons)
   */
  public override step(dt: number, forced = false): void {
    super.step(dt, forced);
    if (this.isPlayingProperty.value || forced) {
      this.updateTunnelingProbability();
      // Add quantum tunneling dynamics here
    }
  }

  /**
   * Updates the tunneling probability based on current parameters.
   * Uses WKB approximation for quantum tunneling.
   */
  private updateTunnelingProbability(): void {
    // Get energy from selected energy level
    const boundStates = this.getBoundStates();
    if (!boundStates || boundStates.energies.length === 0) {
      this.tunnelingProbabilityProperty.value = 0;
      return;
    }

    // The selection can briefly exceed the level count until step() clamps it; leave the value as is
    const energyJoules = boundStates.energies[this.selectedEnergyLevelIndexProperty.value];
    if (energyJoules === undefined) {
      return;
    }
    const barrierHeightJoules = this.barrierHeightProperty.value * QuantumConstants.EV_TO_JOULES;
    const barrierWidth = this.barrierWidthProperty.value * QuantumConstants.NM_TO_M;

    if (energyJoules >= barrierHeightJoules) {
      // Classical regime - particle goes over the barrier
      this.tunnelingProbabilityProperty.value = 1.0;
    } else {
      // Quantum tunneling regime: T ≈ exp(−2κd), κ = √(2m(V₀ − E))/ℏ
      const mass = this.particleMassProperty.value * QuantumConstants.ELECTRON_MASS;
      const kappa = Math.sqrt(2 * mass * (barrierHeightJoules - energyJoules)) / QuantumConstants.HBAR;
      this.tunnelingProbabilityProperty.value = Math.exp(-2 * kappa * barrierWidth);
    }
  }

  /**
   * Calculate bound states using the Schrödinger solver.
   * Results are cached until well parameters change.
   * Override from BaseModel.
   */
  protected override calculateBoundStates(): void {
    const wellWidth = this.wellWidthProperty.value * QuantumConstants.NM_TO_M;
    const mass = this.particleMassProperty.value * QuantumConstants.ELECTRON_MASS;

    // Calculate number of states based on potential type and energy range
    let numStates = TwoWellsModel.DEFAULT_NUM_STATES; // Default for most potentials

    // For infinite well, calculate states up to MAX_ENERGY_EV
    if (this.potentialTypeProperty.value === PotentialType.INFINITE_WELL) {
      const maxEnergy = TwoWellsModel.MAX_ENERGY_EV * QuantumConstants.EV_TO_JOULES;
      // E_n = (ℏ²π²n²)/(2mL²), solve for n
      const maxN = Math.floor(
        Math.sqrt(
          (2 * mass * wellWidth * wellWidth * maxEnergy) /
            (QuantumConstants.HBAR * QuantumConstants.HBAR * Math.PI * Math.PI),
        ),
      );
      numStates = Math.max(1, Math.min(maxN, TwoWellsModel.MAX_NUM_STATES)); // Cap at MAX_NUM_STATES for safety
    } else if (
      this.potentialTypeProperty.value === PotentialType.DOUBLE_SQUARE_WELL ||
      this.potentialTypeProperty.value === PotentialType.DOUBLE_POSCHL_TELLER
    ) {
      numStates = TwoWellsModel.NUM_STATES_DOUBLE_WELL; // Use more states for double well to capture splitting
    }

    // Grid configuration
    let gridConfig: GridConfig;

    if (this.potentialTypeProperty.value === PotentialType.DOUBLE_SQUARE_WELL) {
      // Keep both wells inside the solution grid even when their separation exceeds the chart.
      const halfSpanNm = Math.max(
        TwoWellsModel.CHART_DISPLAY_RANGE_NM,
        this.wellSeparationProperty.value / 2 + this.wellWidthProperty.value + 1.5,
      );
      const scaledPoints = Math.round(
        (TwoWellsModel.DOUBLE_WELL_GRID_POINTS * halfSpanNm) / TwoWellsModel.CHART_DISPLAY_RANGE_NM,
      );
      gridConfig = {
        xMin: -halfSpanNm * QuantumConstants.NM_TO_M,
        xMax: halfSpanNm * QuantumConstants.NM_TO_M,
        numPoints: scaledPoints % 2 === 1 ? scaledPoints : scaledPoints + 1,
      };
    } else if (this.potentialTypeProperty.value === PotentialType.DOUBLE_POSCHL_TELLER) {
      // Smooth wells need room for their exponential tails beyond the visible chart.
      const halfSpanNm = Math.max(
        TwoWellsModel.CHART_DISPLAY_RANGE_NM,
        (this.wellWidthProperty.value + this.wellSeparationProperty.value) / 2 + (5 * this.wellWidthProperty.value) / 2,
      );
      const scaledPoints = Math.round(
        (qppwQueryParameters.numberOfPoints * halfSpanNm) / TwoWellsModel.CHART_DISPLAY_RANGE_NM,
      );
      gridConfig = {
        xMin: -halfSpanNm * QuantumConstants.NM_TO_M,
        xMax: halfSpanNm * QuantumConstants.NM_TO_M,
        numPoints: scaledPoints % 2 === 1 ? scaledPoints : scaledPoints + 1,
      };
    } else {
      gridConfig = {
        xMin: -TwoWellsModel.CHART_DISPLAY_RANGE_NM * QuantumConstants.NM_TO_M,
        xMax: TwoWellsModel.CHART_DISPLAY_RANGE_NM * QuantumConstants.NM_TO_M,
        numPoints: qppwQueryParameters.numberOfPoints,
      };
    }

    try {
      // Build potential parameters based on type
      const type = this.potentialTypeProperty.value;
      let potentialParams: WellParameters;
      if (type === PotentialType.INFINITE_WELL) {
        potentialParams = { type, wellWidth };
      } else if (type === PotentialType.DOUBLE_SQUARE_WELL || type === PotentialType.DOUBLE_POSCHL_TELLER) {
        potentialParams = {
          type,
          wellWidth,
          wellDepth: this.wellDepthProperty.value * QuantumConstants.EV_TO_JOULES,
          wellSeparation: this.wellSeparationProperty.value * QuantumConstants.NM_TO_M,
        };
      } else {
        throw new Error(`Unsupported two-well potential: ${type}`);
      }

      this.boundStateResult = this.solver.solveAnalyticalIfPossible(potentialParams, mass, numStates, gridConfig);
    } catch (error) {
      if (error instanceof NoBoundStatesError) {
        Logger.debug(error.message);
      } else {
        Logger.error("Error calculating bound states:", error);
      }
      this.boundStateResult = null;
    }
  }

  /**
   * Calculate the classical probability density for a given energy level.
   * Override from BaseModel to provide potential-specific implementations.
   * The classical probability density is inversely proportional to the velocity:
   * P(x) ∝ 1/v(x) = 1/√[2(E - V(x))/m]
   *
   * @param energyIndex - Index of the energy level (0-indexed)
   * @returns Array of classical probability density values, or null if unavailable
   */
  public override getClassicalProbabilityDensity(energyIndex: number): number[] | null {
    if (this.boundStateResult === undefined) {
      this.calculateBoundStates();
    }

    if (!this.boundStateResult || energyIndex < 0 || energyIndex >= this.boundStateResult.energies.length) {
      return null;
    }

    const energy = this.boundStateResult.energies[energyIndex]!;
    const xGrid = this.boundStateResult.xGrid;
    const mass = this.particleMassProperty.value * QuantumConstants.ELECTRON_MASS;

    // Calculate potential at each grid point
    const potential = this.getPotentialEnergy(xGrid);

    // Use BaseModel's common method to calculate classical probability density
    return this.calculateClassicalProbabilityDensity(potential, energy, mass, xGrid);
  }

  /**
   * Calculate the potential energy at given positions.
   * @param xGrid - Array of x positions in meters
   * @returns Array of potential energy values in Joules
   */
  protected override calculatePotentialEnergy(xGrid: readonly number[]): number[] {
    const wellWidth = this.wellWidthProperty.value * QuantumConstants.NM_TO_M;
    const wellDepth = this.wellDepthProperty.value * QuantumConstants.EV_TO_JOULES;
    const wellSeparation = this.wellSeparationProperty.value * QuantumConstants.NM_TO_M;
    const smoothPotential = createMultiPoschlTellerPotential(2, wellWidth, wellDepth, wellSeparation);

    const potential: number[] = [];

    for (let i = 0; i < xGrid.length; i++) {
      const x = xGrid[i]!;
      let V: number;

      switch (this.potentialTypeProperty.value) {
        case PotentialType.INFINITE_WELL:
          // V = 0 inside [-L/2, L/2], infinity outside
          V = Math.abs(x) <= wellWidth / TwoWellsModel.HALF_DIVISOR ? 0 : Infinity;
          break;

        case PotentialType.DOUBLE_SQUARE_WELL: {
          // Double square well: two wells of width w with a barrier of width d (edge to edge) between them,
          // the convention of solveDoubleSquareWellAnalytical: wells on d/2 ≤ |x| ≤ d/2 + w
          const halfSeparation = wellSeparation / TwoWellsModel.HALF_DIVISOR;
          const distanceFromCenter = Math.abs(x);

          if (distanceFromCenter >= halfSeparation && distanceFromCenter <= halfSeparation + wellWidth) {
            V = 0; // Inside wells
          } else {
            V = wellDepth; // Outside wells (barrier or exterior)
          }
          break;
        }

        case PotentialType.DOUBLE_POSCHL_TELLER:
          V = smoothPotential(x);
          break;

        default:
          V = 0;
          break;
      }

      potential.push(V);
    }

    return potential;
  }
}
