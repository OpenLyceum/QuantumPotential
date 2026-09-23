/**
 * ManyWellsModel represents the physics model for multiple quantum potential wells.
 * Similar to TwoWellsModel but generalized to N wells (1-10).
 * Supports multi-square wells and multi-Coulomb 1D potentials.
 */

import { NumberProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { BaseModel } from "../../common/model/BaseModel.js";
import { NoBoundStatesError } from "../../common/model/NoBoundStatesError.js";
import { PotentialType } from "../../common/model/PotentialFunction.js";
import QuantumConstants from "../../common/model/QuantumConstants.js";
import type { NumericalMethod, WellParameters } from "../../common/model/Schrodinger1DSolver.js";
import { SuperpositionType } from "../../common/model/SuperpositionType.js";
import Logger from "../../common/utils/Logger.js";
import QPPWPreferences from "../../preferences/QPPWPreferencesModel.js";

export class ManyWellsModel extends BaseModel {
  // ==================== CONSTANTS ====================

  /**
   * Default well width in nanometers for multi-square well.
   */
  private static readonly DEFAULT_WELL_WIDTH = 1.0;

  /**
   * Minimum well width in nanometers for multi-square well.
   */
  private static readonly MANY_WELL_WIDTH_MIN = 0.1;

  /**
   * Maximum well width in nanometers for multi-square well.
   */
  private static readonly MANY_WELL_WIDTH_MAX = 3.0;

  /**
   * Default number of wells in the potential.
   */
  private static readonly DEFAULT_NUMBER_OF_WELLS = 3;

  /**
   * Minimum number of wells.
   */
  private static readonly NUMBER_OF_WELLS_MIN = 1;

  /**
   * Maximum number of wells.
   */
  private static readonly NUMBER_OF_WELLS_MAX = 10;

  /**
   * Default well separation in nanometers.
   * Distance between the centers of adjacent wells.
   */
  private static readonly DEFAULT_WELL_SEPARATION = 0.2;

  /**
   * Minimum well separation in nanometers.
   */
  private static readonly WELL_SEPARATION_MIN = 0.05;

  /**
   * Maximum well separation in nanometers.
   */
  private static readonly WELL_SEPARATION_MAX = 0.7;

  /**
   * Default electric field in eV/nm.
   * No field applied by default.
   */
  private static readonly DEFAULT_ELECTRIC_FIELD = 0.0;

  /**
   * Minimum electric field in eV/nm.
   * Corresponds to -5 eV tilt over 8 nm chart range.
   */
  private static readonly ELECTRIC_FIELD_MIN = -0.625;

  /**
   * Maximum electric field in eV/nm.
   * Corresponds to +5 eV tilt over 8 nm chart range.
   */
  private static readonly ELECTRIC_FIELD_MAX = 0.625;

  /**
   * Default amplitude for superposition states.
   * Normalized value for equal superposition (1/√2).
   */
  private static readonly DEFAULT_SUPERPOSITION_AMPLITUDE = 0.7;

  /**
   * Number of states to calculate for multi-well potentials.
   * Larger value needed due to energy level splitting.
   */
  private static readonly NUM_STATES = 80;

  /**
   * Chart display range in nanometers (extends from -RANGE to +RANGE).
   */
  private static readonly CHART_DISPLAY_RANGE_NM = 4;

  /**
   * Coulomb's constant in N·m²/C².
   * Used for multi-Coulomb potential calculations: k = 1/(4πε₀).
   */
  private static readonly COULOMB_CONSTANT = 8.9875517923e9;

  /**
   * Minimum distance for Coulomb potential calculations in meters.
   * Prevents singularity at centers (r = 0).
   */
  private static readonly COULOMB_MIN_DISTANCE = 1e-12;

  /**
   * Half divisor for position calculations.
   * Used to calculate midpoints and half-widths.
   */
  private static readonly HALF_DIVISOR = 2;

  // ==================== PROPERTIES ====================

  // Number of wells (1-10)
  public readonly numberOfWellsProperty: NumberProperty;

  // Model-specific well parameters
  public readonly wellSeparationProperty: NumberProperty;

  // Electric field (eV/nm) - creates a linear tilt in the potential
  public readonly electricFieldProperty: NumberProperty;

  public constructor() {
    super({
      potentialType: PotentialType.MULTI_SQUARE_WELL,
      wellWidth: ManyWellsModel.DEFAULT_WELL_WIDTH,
      wellWidthRange: new Range(ManyWellsModel.MANY_WELL_WIDTH_MIN, ManyWellsModel.MANY_WELL_WIDTH_MAX),
      // Default to an equal superposition of the first two states
      superpositionConfig: {
        type: SuperpositionType.PSI_I_PSI_J,
        amplitudes: [ManyWellsModel.DEFAULT_SUPERPOSITION_AMPLITUDE, ManyWellsModel.DEFAULT_SUPERPOSITION_AMPLITUDE],
        phases: [0, 0],
      },
    });

    // Initialize number of wells
    this.numberOfWellsProperty = new NumberProperty(ManyWellsModel.DEFAULT_NUMBER_OF_WELLS, {
      range: new Range(ManyWellsModel.NUMBER_OF_WELLS_MIN, ManyWellsModel.NUMBER_OF_WELLS_MAX),
    });

    // Initialize model-specific well parameters
    this.wellSeparationProperty = new NumberProperty(ManyWellsModel.DEFAULT_WELL_SEPARATION, {
      range: new Range(ManyWellsModel.WELL_SEPARATION_MIN, ManyWellsModel.WELL_SEPARATION_MAX),
    }); // in nanometers (spacing between wells)

    // Initialize electric field
    this.electricFieldProperty = new NumberProperty(ManyWellsModel.DEFAULT_ELECTRIC_FIELD, {
      range: new Range(ManyWellsModel.ELECTRIC_FIELD_MIN, ManyWellsModel.ELECTRIC_FIELD_MAX),
    }); // in eV/nm

    // Setup cache invalidation after all properties are initialized
    this.setupCacheInvalidation();
  }

  /**
   * Setup cache invalidation listeners, including model-specific properties.
   * Extends the base implementation to add ManyWellsModel-specific invalidation.
   */
  protected override setupCacheInvalidation(): void {
    super.setupCacheInvalidation();

    const invalidateCache = () => {
      this.boundStateResult = null;
    };

    this.numberOfWellsProperty.lazyLink(invalidateCache);
    this.wellSeparationProperty.lazyLink(invalidateCache);
    this.electricFieldProperty.lazyLink(invalidateCache);
  }

  /**
   * Called when the solver method changes.
   * Invalidates the cached bound state results.
   * @param _method - The new numerical method (unused but required by interface)
   */
  protected override onSolverMethodChanged(_method: NumericalMethod): void {
    this.boundStateResult = null; // Invalidate cache
  }

  /**
   * Resets all properties to their initial state.
   * Override from BaseModel to reset model-specific properties.
   */
  public override reset(): void {
    super.reset();
    this.numberOfWellsProperty.reset();
    this.wellSeparationProperty.reset();
    this.electricFieldProperty.reset();
  }

  /**
   * Steps the model forward in time.
   * @param dt - The time step in seconds (can be negative for backward stepping)
   * @param forced - If true, steps even when paused (for manual stepping buttons)
   */
  public override step(dt: number, forced = false): void {
    super.step(dt, forced);
    // Add dynamics here if needed
  }

  /**
   * Calculate bound states using the Schrödinger solver.
   * Results are cached until well parameters change.
   * Override from BaseModel.
   */
  protected override calculateBoundStates(): void {
    const wellWidth = this.wellWidthProperty.value * QuantumConstants.NM_TO_M;
    const mass = this.particleMassProperty.value * QuantumConstants.ELECTRON_MASS;

    // Calculate number of states based on potential type
    const numStates = ManyWellsModel.NUM_STATES; // Default for multi-well potentials

    // Grid configuration
    const method = this.solver.getNumericalMethod();
    let numGridPoints = QPPWPreferences.gridPointsProperty.value;

    if (method === "fgh") {
      // FGH: round to nearest power of 2 for FFT efficiency
      numGridPoints = ManyWellsModel.HALF_DIVISOR ** Math.round(Math.log2(numGridPoints));
    }

    const gridConfig = {
      xMin: -ManyWellsModel.CHART_DISPLAY_RANGE_NM * QuantumConstants.NM_TO_M,
      xMax: ManyWellsModel.CHART_DISPLAY_RANGE_NM * QuantumConstants.NM_TO_M,
      numPoints: numGridPoints,
    };

    try {
      // Build potential parameters based on type
      const potentialParams: WellParameters = {
        type: this.potentialTypeProperty.value,
        numberOfWells: this.numberOfWellsProperty.value,
        wellWidth: wellWidth,
      };

      // Add type-specific parameters
      switch (this.potentialTypeProperty.value) {
        case PotentialType.MULTI_SQUARE_WELL: {
          potentialParams.wellDepth = this.wellDepthProperty.value * QuantumConstants.EV_TO_JOULES;
          potentialParams.wellSeparation = this.wellSeparationProperty.value * QuantumConstants.NM_TO_M;
          break;
        }
        case PotentialType.MULTI_COULOMB_1D: {
          // For Coulomb potentials, use coulombStrength parameter α = k*e²
          potentialParams.coulombStrength =
            ManyWellsModel.COULOMB_CONSTANT * QuantumConstants.ELEMENTARY_CHARGE * QuantumConstants.ELEMENTARY_CHARGE;
          potentialParams.wellSeparation = this.wellSeparationProperty.value * QuantumConstants.NM_TO_M;
          break;
        }
        default:
          break;
      }

      // Solve using the analytical (or numerical) solution
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
    if (!this.boundStateResult) {
      this.calculateBoundStates();
    }

    if (!this.boundStateResult || energyIndex < 0 || energyIndex >= this.boundStateResult.energies.length) {
      return null;
    }

    const energy = this.boundStateResult.energies[energyIndex]!;
    const xGrid = this.boundStateResult.xGrid;
    const mass = this.particleMassProperty.value * QuantumConstants.ELECTRON_MASS;

    // Calculate potential at each grid point
    const potential = this.calculatePotentialEnergy(xGrid);

    // Use BaseModel's common method to calculate classical probability density
    return this.calculateClassicalProbabilityDensity(potential, energy, mass, xGrid);
  }

  /**
   * Calculate the potential energy at given positions.
   * @param xGrid - Array of x positions in meters
   * @returns Array of potential energy values in Joules
   */
  private calculatePotentialEnergy(xGrid: number[]): number[] {
    const numberOfWells = this.numberOfWellsProperty.value;
    const wellWidth = this.wellWidthProperty.value * QuantumConstants.NM_TO_M;
    const wellDepth = this.wellDepthProperty.value * QuantumConstants.EV_TO_JOULES;
    const wellSeparation = this.wellSeparationProperty.value * QuantumConstants.NM_TO_M;

    const potential: number[] = [];

    for (let i = 0; i < xGrid.length; i++) {
      const x = xGrid[i]!;
      let V: number;

      switch (this.potentialTypeProperty.value) {
        case PotentialType.MULTI_SQUARE_WELL: {
          // Multiple square wells arranged periodically
          const halfWellWidth = wellWidth / ManyWellsModel.HALF_DIVISOR;
          const period = wellWidth + wellSeparation;

          // Calculate total extent of the well array
          const totalExtent = numberOfWells * wellWidth + (numberOfWells - 1) * wellSeparation;
          const arrayStart = -totalExtent / ManyWellsModel.HALF_DIVISOR;

          let inWell = false;

          // Check if x is inside any of the wells
          for (let wellIndex = 0; wellIndex < numberOfWells; wellIndex++) {
            const wellCenter = arrayStart + wellIndex * period + wellWidth / ManyWellsModel.HALF_DIVISOR;
            const wellStart = wellCenter - halfWellWidth;
            const wellEnd = wellCenter + halfWellWidth;

            if (x >= wellStart && x <= wellEnd) {
              inWell = true;
              break;
            }
          }

          V = inWell ? 0 : wellDepth;
          break;
        }

        case PotentialType.MULTI_COULOMB_1D: {
          // Multiple Coulomb centers arranged periodically
          const coulombStrength =
            ManyWellsModel.COULOMB_CONSTANT * QuantumConstants.ELEMENTARY_CHARGE * QuantumConstants.ELEMENTARY_CHARGE;

          // Calculate total extent of the Coulomb centers
          const totalExtent = (numberOfWells - 1) * wellSeparation;
          const arrayStart = -totalExtent / ManyWellsModel.HALF_DIVISOR;

          // Sum contributions from all Coulomb centers
          V = 0;
          for (let wellIndex = 0; wellIndex < numberOfWells; wellIndex++) {
            const centerPosition = arrayStart + wellIndex * wellSeparation;
            const r = Math.abs(x - centerPosition);

            if (r > ManyWellsModel.COULOMB_MIN_DISTANCE) {
              // Avoid singularity at center
              V += -coulombStrength / r;
            } else {
              V += -coulombStrength / ManyWellsModel.COULOMB_MIN_DISTANCE;
            }
          }
          break;
        }

        default:
          V = 0;
          break;
      }

      potential.push(V);
    }

    return potential;
  }
}
