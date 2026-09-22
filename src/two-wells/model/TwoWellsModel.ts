/**
 * TwoWellsModel represents the physics model for a double quantum potential well.
 * It handles quantum tunneling and double-well dynamics.
 */

import { NumberProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { BaseModel } from "../../common/model/BaseModel.js";
import { type GridConfig, PotentialType } from "../../common/model/PotentialFunction.js";
import QuantumConstants from "../../common/model/QuantumConstants.js";
import type { NumericalMethod, WellParameters } from "../../common/model/Schrodinger1DSolver.js";
import { SuperpositionType } from "../../common/model/SuperpositionType.js";
import Logger from "../../common/utils/Logger.js";
import QPPWPreferences from "../../preferences/QPPWPreferencesModel.js";

export class TwoWellsModel extends BaseModel {
  // ==================== CONSTANTS ====================

  /**
   * Default well width in nanometers for double square well.
   */
  private static readonly DEFAULT_WELL_WIDTH = 1.0;

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
   * Distance between the centers of the two wells.
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
   * Number of states for Coulomb 1D potential.
   */
  private static readonly NUM_STATES_COULOMB = 80;

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
   * Coulomb's constant in N·m²/C².
   * Used for Coulomb potential calculations: k = 1/(4πε₀).
   */
  private static readonly COULOMB_CONSTANT = 8.9875517923e9;

  /**
   * Minimum distance for Coulomb potential calculations in meters.
   * Prevents singularity at the origin (r = 0).
   */
  private static readonly COULOMB_MIN_DISTANCE = 1e-12;

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
    super();

    // Override potential type to default to double square well
    this.potentialTypeProperty.value = PotentialType.DOUBLE_SQUARE_WELL;

    // Override well width range for double square well
    this.wellWidthProperty.setValueAndRange(
      TwoWellsModel.DEFAULT_WELL_WIDTH,
      new Range(TwoWellsModel.TWO_WELL_WIDTH_MIN, TwoWellsModel.TWO_WELL_WIDTH_MAX),
    );

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

    // Override superposition config default
    this.superpositionConfigProperty.value = {
      type: SuperpositionType.PSI_I_PSI_J,
      amplitudes: [TwoWellsModel.DEFAULT_SUPERPOSITION_AMPLITUDE, TwoWellsModel.DEFAULT_SUPERPOSITION_AMPLITUDE], // Default to equal superposition of first two states (normalized)
      phases: [0, 0],
    };

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
      this.boundStateResult = null;
    };

    this.wellSeparationProperty.lazyLink(invalidateCache);
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

    const selectedIndex = this.selectedEnergyLevelIndexProperty.value;
    const energyJoules = boundStates.energies[selectedIndex]!;
    const energy = energyJoules * 6.241509074e18; // Convert from Joules to eV
    const barrierHeight = this.barrierHeightProperty.value;
    const barrierWidth = this.barrierWidthProperty.value * 1e-9; // Convert to meters

    if (energy >= barrierHeight) {
      // Classical regime - particle goes over the barrier
      this.tunnelingProbabilityProperty.value = 1.0;
    } else {
      // Quantum tunneling regime
      const hbar = 1.054571817e-34; // Reduced Planck constant (J·s)
      const electronMass = 9.10938356e-31; // Electron mass (kg)
      const eV = 1.602176634e-19; // Electron volt in joules

      const V0 = barrierHeight * eV;
      const E = energy * eV;
      const kappa = Math.sqrt((2 * electronMass * (V0 - E)) / (hbar * hbar));

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
    } else if (this.potentialTypeProperty.value === PotentialType.COULOMB_1D) {
      numStates = TwoWellsModel.NUM_STATES_COULOMB; // Use more states for Coulomb potential
    } else if (this.potentialTypeProperty.value === PotentialType.DOUBLE_SQUARE_WELL) {
      numStates = TwoWellsModel.NUM_STATES_DOUBLE_WELL; // Use more states for double well to capture splitting
    }

    // Grid configuration
    let gridConfig: GridConfig;

    if (this.potentialTypeProperty.value === PotentialType.DOUBLE_SQUARE_WELL) {
      // For double square well, use analytical solution with fixed high-resolution grid
      // spanning the full chart range
      gridConfig = {
        xMin: -TwoWellsModel.CHART_DISPLAY_RANGE_NM * QuantumConstants.NM_TO_M,
        xMax: TwoWellsModel.CHART_DISPLAY_RANGE_NM * QuantumConstants.NM_TO_M,
        numPoints: TwoWellsModel.DOUBLE_WELL_GRID_POINTS,
      };
    } else {
      const method = this.solver.getNumericalMethod();
      let numGridPoints = QPPWPreferences.gridPointsProperty.value;

      if (method === "fgh") {
        // FGH: round to nearest power of 2 for FFT efficiency
        numGridPoints = TwoWellsModel.HALF_DIVISOR ** Math.round(Math.log2(numGridPoints));
      }

      gridConfig = {
        xMin: -TwoWellsModel.CHART_DISPLAY_RANGE_NM * QuantumConstants.NM_TO_M,
        xMax: TwoWellsModel.CHART_DISPLAY_RANGE_NM * QuantumConstants.NM_TO_M,
        numPoints: numGridPoints,
      };
    }

    try {
      // Build potential parameters based on type
      const potentialParams: WellParameters = {
        type: this.potentialTypeProperty.value,
        wellWidth: wellWidth,
      };

      // Add type-specific parameters
      switch (this.potentialTypeProperty.value) {
        case PotentialType.INFINITE_WELL:
          // No additional parameters needed
          break;
        case PotentialType.COULOMB_1D: {
          // For Coulomb potentials, use coulombStrength parameter α = k*e²
          // where k = 1/(4πε₀) ≈ 8.9875517923e9 N·m²/C²
          // α ≈ 2.307e-28 J·m for electron charge
          potentialParams.coulombStrength =
            TwoWellsModel.COULOMB_CONSTANT * QuantumConstants.ELEMENTARY_CHARGE * QuantumConstants.ELEMENTARY_CHARGE;
          break;
        }
        case PotentialType.DOUBLE_SQUARE_WELL: {
          // For double square well, we need width, depth, and separation
          potentialParams.wellDepth = this.wellDepthProperty.value * QuantumConstants.EV_TO_JOULES;
          potentialParams.wellSeparation = this.wellSeparationProperty.value * QuantumConstants.NM_TO_M;
          break;
        }
        default:
          // For other potential types, use numerical solution
          break;
      }

      // Attempt analytical solution first
      this.boundStateResult = this.solver.solveAnalyticalIfPossible(potentialParams, mass, numStates, gridConfig);

      // Ensure selected energy level index is within bounds
      if (this.boundStateResult) {
        const maxIndex = this.boundStateResult.energies.length - 1;
        if (this.selectedEnergyLevelIndexProperty.value > maxIndex) {
          this.selectedEnergyLevelIndexProperty.value = Math.max(0, maxIndex);
        }
      }
    } catch (error) {
      Logger.error("Error calculating bound states:", error);
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
    const wellWidth = this.wellWidthProperty.value * QuantumConstants.NM_TO_M;
    const wellDepth = this.wellDepthProperty.value * QuantumConstants.EV_TO_JOULES;
    const wellSeparation = this.wellSeparationProperty.value * QuantumConstants.NM_TO_M;

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
          // Double square well: two wells separated by a barrier
          const halfWellWidth = wellWidth / TwoWellsModel.HALF_DIVISOR;
          const halfSeparation = wellSeparation / TwoWellsModel.HALF_DIVISOR;

          // Left well: centered at -halfSeparation
          const leftWellStart = -halfSeparation - halfWellWidth;
          const leftWellEnd = -halfSeparation + halfWellWidth;

          // Right well: centered at +halfSeparation
          const rightWellStart = halfSeparation - halfWellWidth;
          const rightWellEnd = halfSeparation + halfWellWidth;

          if ((x >= leftWellStart && x <= leftWellEnd) || (x >= rightWellStart && x <= rightWellEnd)) {
            V = 0; // Inside wells
          } else {
            V = wellDepth; // Outside wells (barrier or exterior)
          }
          break;
        }

        case PotentialType.COULOMB_1D: {
          // V(x) = -α/|x| where α = ke²
          const coulombStrength =
            TwoWellsModel.COULOMB_CONSTANT * QuantumConstants.ELEMENTARY_CHARGE * QuantumConstants.ELEMENTARY_CHARGE;
          const r = Math.abs(x);
          if (r > TwoWellsModel.COULOMB_MIN_DISTANCE) {
            // Avoid singularity at origin
            V = -coulombStrength / r;
          } else {
            V = -coulombStrength / TwoWellsModel.COULOMB_MIN_DISTANCE;
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
