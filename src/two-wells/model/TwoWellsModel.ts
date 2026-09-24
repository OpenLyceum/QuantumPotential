/**
 * TwoWellsModel represents the physics model for a double quantum potential well.
 * It handles quantum tunneling and double-well dynamics.
 */

import { NumberProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { BaseModel } from "../../common/model/BaseModel.js";
import { createMultiPoschlTellerPotential } from "../../common/model/multiPoschlTellerPotential.js";
import { NoBoundStatesError } from "../../common/model/NoBoundStatesError.js";
import type { WellParameters } from "../../common/model/PotentialFunction.js";
import { type GridConfig, PotentialType } from "../../common/model/PotentialFunction.js";
import QuantumConstants from "../../common/model/QuantumConstants.js";
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
   * Default amplitude for superposition states.
   * Normalized value for equal superposition (1/√2).
   */
  private static readonly DEFAULT_SUPERPOSITION_AMPLITUDE = 0.7;

  /**
   * Number of states for double square well.
   * Higher value needed to capture energy level splitting.
   */
  private static readonly NUM_STATES_DOUBLE_WELL = 80;

  /**
   * Number of grid points for double square well analytical solution.
   * High resolution needed for accurate wavefunction representation.
   */
  private static readonly DOUBLE_WELL_GRID_POINTS = 2000;

  // ==================== PROPERTIES ====================

  // Model-specific well parameters
  public readonly wellSeparationProperty: NumberProperty;

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
  }

  /**
   * Calculate bound states using the Schrödinger solver.
   * Results are cached until well parameters change.
   * Override from BaseModel.
   */
  protected override calculateBoundStates(): void {
    const wellWidth = this.wellWidthProperty.value * QuantumConstants.NM_TO_M;
    const mass = this.particleMassProperty.value * QuantumConstants.ELECTRON_MASS;

    // Many states, so that the tunnelling splitting is resolved all the way up the spectrum
    const numStates = TwoWellsModel.NUM_STATES_DOUBLE_WELL;

    // Grid configuration
    let gridConfig: GridConfig;

    if (this.potentialTypeProperty.value === PotentialType.DOUBLE_SQUARE_WELL) {
      // Keep both wells inside the solution grid even when their separation exceeds the chart.
      const halfSpanNm = Math.max(
        BaseModel.CHART_HALF_RANGE_NM,
        this.wellSeparationProperty.value / 2 + this.wellWidthProperty.value + 1.5,
      );
      const scaledPoints = Math.round(
        (TwoWellsModel.DOUBLE_WELL_GRID_POINTS * halfSpanNm) / BaseModel.CHART_HALF_RANGE_NM,
      );
      gridConfig = {
        xMin: -halfSpanNm * QuantumConstants.NM_TO_M,
        xMax: halfSpanNm * QuantumConstants.NM_TO_M,
        numPoints: scaledPoints % 2 === 1 ? scaledPoints : scaledPoints + 1,
      };
    } else if (this.potentialTypeProperty.value === PotentialType.DOUBLE_POSCHL_TELLER) {
      // Smooth wells need room for their exponential tails beyond the visible chart.
      const halfSpanNm = Math.max(
        BaseModel.CHART_HALF_RANGE_NM,
        (this.wellWidthProperty.value + this.wellSeparationProperty.value) / 2 + (5 * this.wellWidthProperty.value) / 2,
      );
      const scaledPoints = Math.round(
        (qppwQueryParameters.numberOfPoints * halfSpanNm) / BaseModel.CHART_HALF_RANGE_NM,
      );
      gridConfig = {
        xMin: -halfSpanNm * QuantumConstants.NM_TO_M,
        xMax: halfSpanNm * QuantumConstants.NM_TO_M,
        numPoints: scaledPoints % 2 === 1 ? scaledPoints : scaledPoints + 1,
      };
    } else {
      gridConfig = {
        xMin: -BaseModel.CHART_HALF_RANGE_NM * QuantumConstants.NM_TO_M,
        xMax: BaseModel.CHART_HALF_RANGE_NM * QuantumConstants.NM_TO_M,
        numPoints: qppwQueryParameters.numberOfPoints,
      };
    }

    try {
      // Build potential parameters based on type
      const type = this.potentialTypeProperty.value;
      if (type !== PotentialType.DOUBLE_SQUARE_WELL && type !== PotentialType.DOUBLE_POSCHL_TELLER) {
        throw new Error(`Unsupported two-well potential: ${type}`);
      }
      const potentialParams: WellParameters = {
        type,
        wellWidth,
        wellDepth: this.wellDepthProperty.value * QuantumConstants.EV_TO_JOULES,
        wellSeparation: this.wellSeparationProperty.value * QuantumConstants.NM_TO_M,
      };

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

    for (const x of xGrid) {
      let V: number;

      switch (this.potentialTypeProperty.value) {
        case PotentialType.DOUBLE_SQUARE_WELL: {
          // Double square well: two wells of width w with a barrier of width d (edge to edge) between them,
          // the convention of solveDoubleSquareWellAnalytical: wells on d/2 ≤ |x| ≤ d/2 + w
          const halfSeparation = wellSeparation / 2;
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
