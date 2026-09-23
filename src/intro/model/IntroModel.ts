/**
 * IntroModel represents the physics model for the intro screen.
 * It extends BaseModel and provides a simplified interface for introductory exploration.
 */

import { NumberProperty } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { BaseModel } from "../../common/model/BaseModel.js";
import { NoBoundStatesError } from "../../common/model/NoBoundStatesError.js";
import { PotentialType } from "../../common/model/PotentialFunction.js";
import {
  PotentialParameterPresets,
  SINGLE_WELL_PARAMETER_PRESETS,
} from "../../common/model/PotentialParameterPresets.js";
import QuantumConstants from "../../common/model/QuantumConstants.js";
import type { WellParameters } from "../../common/model/Schrodinger1DSolver.js";
import Logger from "../../common/utils/Logger.js";

export class IntroModel extends BaseModel {
  // ==================== CONSTANTS ====================

  /**
   * Default barrier height in electron volts.
   * Used for Rosen-Morse and Eckart potentials.
   */
  private static readonly DEFAULT_BARRIER_HEIGHT = 4;

  /**
   * Minimum barrier height in electron volts.
   */
  private static readonly BARRIER_HEIGHT_MIN = 0.0;

  /**
   * Maximum barrier height in electron volts.
   */
  private static readonly BARRIER_HEIGHT_MAX = 10.0;

  /**
   * Default potential offset in electron volts.
   * Used for triangular potential configuration.
   */
  private static readonly DEFAULT_POTENTIAL_OFFSET = 0.0;

  /**
   * Minimum potential offset in electron volts.
   */
  private static readonly POTENTIAL_OFFSET_MIN = -5.0;

  /**
   * Maximum potential offset in electron volts.
   */
  private static readonly POTENTIAL_OFFSET_MAX = 15.0;

  /**
   * Default number of bound states to calculate.
   */
  private static readonly DEFAULT_NUM_STATES = 10;

  /**
   * Number of states for asymmetric triangle potential.
   * Larger value needed due to dense energy spectrum.
   */
  private static readonly NUM_STATES_ASYMMETRIC_TRIANGLE = 80;

  /**
   * Number of states for triangular potential.
   */
  private static readonly NUM_STATES_TRIANGULAR = 50;

  /**
   * Number of states for other complex potentials.
   */
  private static readonly NUM_STATES_COMPLEX = 80;

  /**
   * Maximum energy in electron volts for state calculations.
   * Limits the energy range for harmonic oscillator and infinite well.
   */
  private static readonly MAX_ENERGY_EV = 15;

  /**
   * Maximum number of states (safety cap).
   * Prevents excessive computation time.
   */
  private static readonly MAX_NUM_STATES = 100;

  /**
   * Chart display range in nanometers (extends from -RANGE to +RANGE).
   * Defines the spatial extent of the visualization.
   */
  private static readonly CHART_DISPLAY_RANGE_NM = 4;

  /**
   * Number of grid points for analytical solution evaluation.
   * High resolution ensures smooth wavefunction plots.
   */
  private static readonly ANALYTICAL_GRID_POINTS = 1024;

  /**
   * Spring constant multiplier for harmonic oscillator.
   * Factor used to convert well depth and width to spring constant: k = 8*V₀/L².
   */
  private static readonly SPRING_CONSTANT_MULTIPLIER = 8;

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
   * Half divisor for trapezoidal integration.
   * Used to calculate midpoint: (x[i+1] - x[i]) / 2.
   */
  private static readonly HALF_DIVISOR = 2;

  // ==================== PROPERTIES ====================

  // Model-specific well parameters
  public readonly barrierHeightProperty: NumberProperty;
  public readonly potentialOffsetProperty: NumberProperty;
  private readonly parameterPresets: PotentialParameterPresets<"wellWidth" | "wellDepth" | "barrierHeight">;

  public constructor() {
    super({ wellWidth: 5.5, wellDepth: 12 });

    // Initialize model-specific well parameters
    this.barrierHeightProperty = new NumberProperty(IntroModel.DEFAULT_BARRIER_HEIGHT, {
      range: new Range(IntroModel.BARRIER_HEIGHT_MIN, IntroModel.BARRIER_HEIGHT_MAX),
    });
    this.potentialOffsetProperty = new NumberProperty(IntroModel.DEFAULT_POTENTIAL_OFFSET, {
      range: new Range(IntroModel.POTENTIAL_OFFSET_MIN, IntroModel.POTENTIAL_OFFSET_MAX),
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

    // Setup cache invalidation after all properties are initialized
    this.setupCacheInvalidation();
  }

  /**
   * Setup cache invalidation listeners, including model-specific properties.
   * Extends the base implementation to add IntroModel-specific invalidation.
   */
  protected override setupCacheInvalidation(): void {
    super.setupCacheInvalidation();

    const invalidateCache = () => {
      this.boundStateResult = null;
    };

    this.barrierHeightProperty.lazyLink(invalidateCache);
    this.potentialOffsetProperty.lazyLink(invalidateCache);
  }

  /**
   * Resets all properties to their initial state.
   * Override from BaseModel to reset model-specific properties.
   */
  public override reset(): void {
    this.parameterPresets.reset(() => {
      super.reset();
      this.barrierHeightProperty.reset();
      this.potentialOffsetProperty.reset();
    });
  }

  /**
   * Calculate bound states using the Schrödinger solver.
   * Override from BaseModel.
   */
  protected override calculateBoundStates(): void {
    const wellWidth = this.wellWidthProperty.value * QuantumConstants.NM_TO_M;
    const wellDepth = this.wellDepthProperty.value * QuantumConstants.EV_TO_JOULES;
    const mass = this.particleMassProperty.value * QuantumConstants.ELECTRON_MASS;

    // Calculate number of states based on potential type and energy range
    let numStates: number;

    // For harmonic oscillator, calculate states up to MAX_ENERGY_EV
    if (this.potentialTypeProperty.value === PotentialType.HARMONIC_OSCILLATOR) {
      const springConstant = (IntroModel.SPRING_CONSTANT_MULTIPLIER * wellDepth) / (wellWidth * wellWidth);
      const omega = Math.sqrt(springConstant / mass);
      const maxEnergy = IntroModel.MAX_ENERGY_EV * QuantumConstants.EV_TO_JOULES;
      // E_n = ℏω(n + 1/2), solve for n: n = E/(ℏω) - 1/2
      const maxN = Math.floor(maxEnergy / (QuantumConstants.HBAR * omega) - 0.5);
      numStates = Math.max(1, Math.min(maxN + 1, IntroModel.MAX_NUM_STATES)); // Cap at MAX_NUM_STATES for safety
    }
    // For infinite well, calculate states up to MAX_ENERGY_EV
    else if (this.potentialTypeProperty.value === PotentialType.INFINITE_WELL) {
      const maxEnergy = IntroModel.MAX_ENERGY_EV * QuantumConstants.EV_TO_JOULES;
      // E_n = (ℏ²π²n²)/(2mL²), solve for n
      const maxN = Math.floor(
        Math.sqrt(
          (2 * mass * wellWidth * wellWidth * maxEnergy) /
            (QuantumConstants.HBAR * QuantumConstants.HBAR * Math.PI * Math.PI),
        ),
      );
      numStates = Math.max(1, Math.min(maxN, IntroModel.MAX_NUM_STATES)); // Cap at MAX_NUM_STATES for safety
    }
    // For finite well, estimate maximum number of bound states
    else if (this.potentialTypeProperty.value === PotentialType.FINITE_WELL) {
      // Approximate number of bound states: n_max ≈ (1/π) * sqrt(2mV₀L²/ℏ²)
      // Use generous estimate to ensure we get all states
      const estimatedMax = Math.ceil(
        (1 / Math.PI) *
          Math.sqrt((2 * mass * wellDepth * wellWidth * wellWidth) / (QuantumConstants.HBAR * QuantumConstants.HBAR)),
      );
      // Request more states than estimated to ensure we capture all bound states
      numStates = Math.max(IntroModel.DEFAULT_NUM_STATES, Math.min(estimatedMax * 2, IntroModel.MAX_NUM_STATES)); // At least DEFAULT_NUM_STATES, cap at MAX_NUM_STATES
    }
    // For asymmetric triangle, calculate states that fit in the energy range
    else if (this.potentialTypeProperty.value === PotentialType.ASYMMETRIC_TRIANGLE) {
      numStates = IntroModel.NUM_STATES_ASYMMETRIC_TRIANGLE; // Asymmetric triangle may have many states
    }
    // For triangular potential, calculate states based on well depth
    else if (this.potentialTypeProperty.value === PotentialType.TRIANGULAR) {
      numStates = IntroModel.NUM_STATES_TRIANGULAR; // Triangular well typically has fewer states than asymmetric
    } else {
      numStates = IntroModel.NUM_STATES_COMPLEX; // Use more states for other potentials
    }

    const gridConfig = {
      xMin: -IntroModel.CHART_DISPLAY_RANGE_NM * QuantumConstants.NM_TO_M,
      xMax: IntroModel.CHART_DISPLAY_RANGE_NM * QuantumConstants.NM_TO_M,
      numPoints: IntroModel.ANALYTICAL_GRID_POINTS,
    };

    try {
      const potentialParams: WellParameters = {
        type: this.potentialTypeProperty.value,
        wellWidth: wellWidth,
      };

      // Add type-specific parameters
      switch (this.potentialTypeProperty.value) {
        case PotentialType.FINITE_WELL:
          potentialParams.wellDepth = wellDepth;
          break;
        case PotentialType.HARMONIC_OSCILLATOR:
          potentialParams.springConstant =
            (IntroModel.SPRING_CONSTANT_MULTIPLIER * wellDepth) / (wellWidth * wellWidth);
          break;
        case PotentialType.MORSE:
          potentialParams.dissociationEnergy = wellDepth;
          potentialParams.equilibriumPosition = 0;
          potentialParams.wellWidth = wellWidth;
          break;
        case PotentialType.POSCHL_TELLER:
          potentialParams.potentialDepth = wellDepth;
          potentialParams.wellWidth = wellWidth;
          break;
        case PotentialType.ROSEN_MORSE:
          potentialParams.potentialDepth = wellDepth;
          potentialParams.barrierHeight = this.barrierHeightProperty.value * QuantumConstants.EV_TO_JOULES;
          potentialParams.wellWidth = wellWidth;
          break;
        case PotentialType.ECKART:
          potentialParams.potentialDepth = wellDepth;
          potentialParams.barrierHeight = this.barrierHeightProperty.value * QuantumConstants.EV_TO_JOULES;
          potentialParams.wellWidth = wellWidth;
          break;
        case PotentialType.ASYMMETRIC_TRIANGLE:
          potentialParams.slope = wellDepth / wellWidth;
          potentialParams.wellWidth = wellWidth;
          break;
        case PotentialType.TRIANGULAR:
          potentialParams.wellDepth = wellDepth;
          potentialParams.wellWidth = wellWidth;
          potentialParams.energyOffset = this.potentialOffsetProperty.value * QuantumConstants.EV_TO_JOULES;
          break;
        case PotentialType.COULOMB_1D: {
          potentialParams.coulombStrength =
            IntroModel.COULOMB_CONSTANT * QuantumConstants.ELEMENTARY_CHARGE * QuantumConstants.ELEMENTARY_CHARGE;
          break;
        }
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

    // Use the analytical solution's method if available
    const analyticalSolution = this.solver.getAnalyticalSolution();
    if (analyticalSolution) {
      try {
        return analyticalSolution.calculateClassicalProbability(energy, mass, xGrid);
      } catch (error) {
        Logger.warn("Failed to use analytical classical probability, falling back to numerical:", error);
      }
    }

    // Fallback: numerical calculation using potential function
    const potential = this.getPotentialEnergy(xGrid);

    // Use BaseModel's common method to calculate classical probability density
    return this.calculateClassicalProbabilityDensity(potential, energy, mass, xGrid);
  }

  /**
   * Calculates the classical turning points for a given energy level.
   */
  public getClassicalTurningPoints(energyLevel: number): {
    left: number;
    right: number;
  } | null {
    if (!this.boundStateResult) {
      this.calculateBoundStates();
    }

    if (!this.boundStateResult || energyLevel < 0 || energyLevel >= this.boundStateResult.energies.length) {
      return null;
    }

    const energy = this.boundStateResult.energies[energyLevel]!;

    // Try to use analytical solution's turning point calculation
    const analyticalSolution = this.solver.getAnalyticalSolution();
    if (analyticalSolution) {
      try {
        const turningPointsPairs = analyticalSolution.calculateTurningPoints(energy);
        if (turningPointsPairs && turningPointsPairs.length > 0) {
          // For simple single-well potentials, use the first pair
          // Convert from meters to nanometers
          const leftNm = turningPointsPairs[0]!.left * QuantumConstants.M_TO_NM;
          const rightNm = turningPointsPairs[0]!.right * QuantumConstants.M_TO_NM;

          // Clamp turning points to chart's X-axis range
          const minX = -IntroModel.CHART_DISPLAY_RANGE_NM;
          const maxX = IntroModel.CHART_DISPLAY_RANGE_NM;
          const left = Math.max(minX, Math.min(maxX, leftNm));
          const right = Math.max(minX, Math.min(maxX, rightNm));

          return { left, right };
        }
      } catch (error) {
        Logger.warn("Failed to use analytical turning points, falling back to numerical:", error);
      }
    }

    // Fallback: numerical calculation using potential
    const energyEV = energy * QuantumConstants.JOULES_TO_EV;
    const xGrid = this.boundStateResult.xGrid;

    let leftTurningPoint: number | null = null;
    let rightTurningPoint: number | null = null;

    // Handle infinite well directly (classical turning points at well edges)
    if (this.potentialTypeProperty.value === PotentialType.INFINITE_WELL) {
      const halfWidth = this.wellWidthProperty.value / 2;
      return { left: -halfWidth, right: halfWidth };
    }

    // Loop to find turning points numerically
    for (let i = 0; i < xGrid.length - 1; i++) {
      const x = xGrid[i]! * QuantumConstants.M_TO_NM;
      const V = this.getPotentialAtPosition(x);

      const xNext = xGrid[i + 1]! * QuantumConstants.M_TO_NM;
      const VNext = this.getPotentialAtPosition(xNext);

      if ((V <= energyEV && VNext >= energyEV) || (V >= energyEV && VNext <= energyEV)) {
        // Avoid division by zero when V and VNext are equal
        if (VNext === V) {
          continue; // skip this segment
        }
        const t = (energyEV - V) / (VNext - V);
        const turningPoint = x + t * (xNext - x);

        if (leftTurningPoint === null) {
          leftTurningPoint = turningPoint;
        } else {
          rightTurningPoint = turningPoint;
        }
      }
    }

    if (leftTurningPoint !== null && rightTurningPoint !== null) {
      // Clamp turning points to chart's X-axis range
      const minX = -IntroModel.CHART_DISPLAY_RANGE_NM;
      const maxX = IntroModel.CHART_DISPLAY_RANGE_NM;
      leftTurningPoint = Math.max(minX, Math.min(maxX, leftTurningPoint));
      rightTurningPoint = Math.max(minX, Math.min(maxX, rightTurningPoint));
      return { left: leftTurningPoint, right: rightTurningPoint };
    }

    return null;
  }

  /**
   * Calculates the probability of finding the particle in the classically forbidden region.
   */
  public getClassicallyForbiddenProbability(energyLevel: number): number {
    if (!this.boundStateResult) {
      this.calculateBoundStates();
    }

    if (!this.boundStateResult || energyLevel < 0 || energyLevel >= this.boundStateResult.energies.length) {
      return 0;
    }

    const turningPoints = this.getClassicalTurningPoints(energyLevel);
    if (!turningPoints) {
      return 0;
    }

    const wavefunction = this.boundStateResult.wavefunctions[energyLevel]!;
    const xGrid = this.boundStateResult.xGrid;

    let forbiddenProbability = 0;
    let totalProbability = 0;

    for (let i = 0; i < xGrid.length; i++) {
      const x = xGrid[i]! * QuantumConstants.M_TO_NM;
      const psi = wavefunction[i]!;
      const probabilityDensity = psi * psi;

      let dx: number;
      if (i === 0) {
        dx = ((xGrid[1]! - xGrid[0]!) / IntroModel.HALF_DIVISOR) * QuantumConstants.M_TO_NM;
      } else if (i === xGrid.length - 1) {
        dx = ((xGrid[i]! - xGrid[i - 1]!) / IntroModel.HALF_DIVISOR) * QuantumConstants.M_TO_NM;
      } else {
        dx = ((xGrid[i + 1]! - xGrid[i - 1]!) / IntroModel.HALF_DIVISOR) * QuantumConstants.M_TO_NM;
      }

      totalProbability += probabilityDensity * dx;

      if (x < turningPoints.left || x > turningPoints.right) {
        forbiddenProbability += probabilityDensity * dx;
      }
    }

    return totalProbability > 0 ? (forbiddenProbability / totalProbability) * 100 : 0;
  }

  /**
   * Calculate the potential energy at given positions.
   */
  protected override calculatePotentialEnergy(xGrid: readonly number[]): number[] {
    const wellWidth = this.wellWidthProperty.value * QuantumConstants.NM_TO_M;
    const wellDepth = this.wellDepthProperty.value * QuantumConstants.EV_TO_JOULES;

    const potential: number[] = [];

    for (let i = 0; i < xGrid.length; i++) {
      const x = xGrid[i]!;
      let V: number;

      switch (this.potentialTypeProperty.value) {
        case PotentialType.INFINITE_WELL:
          V = Math.abs(x) <= wellWidth / 2 ? 0 : Infinity;
          break;

        case PotentialType.FINITE_WELL:
          V = Math.abs(x) <= wellWidth / 2 ? 0 : wellDepth;
          break;

        case PotentialType.HARMONIC_OSCILLATOR: {
          const springConstant = (IntroModel.SPRING_CONSTANT_MULTIPLIER * wellDepth) / (wellWidth * wellWidth);
          V = 0.5 * springConstant * x * x;
          break;
        }

        case PotentialType.MORSE: {
          const a = 1 / wellWidth;
          const exponential = Math.exp(-a * x);
          V = wellDepth * (1 - exponential) ** 2;
          break;
        }

        case PotentialType.POSCHL_TELLER: {
          const coshPT = Math.cosh(x / wellWidth);
          V = -wellDepth / (coshPT * coshPT);
          break;
        }

        case PotentialType.ROSEN_MORSE: {
          const barrierHeight = this.barrierHeightProperty.value * QuantumConstants.EV_TO_JOULES;
          const coshRM = Math.cosh(x / wellWidth);
          const tanhRM = Math.tanh(x / wellWidth);
          V = -wellDepth / (coshRM * coshRM) + barrierHeight * tanhRM;
          break;
        }

        case PotentialType.ECKART: {
          const barrierHeightE = this.barrierHeightProperty.value * QuantumConstants.EV_TO_JOULES;
          const expE = Math.exp(x / wellWidth);
          const denomE = 1 + expE;
          V = wellDepth / (denomE * denomE) - barrierHeightE / denomE;
          break;
        }

        case PotentialType.ASYMMETRIC_TRIANGLE: {
          const slope = wellDepth / wellWidth;
          V = slope * x;
          break;
        }

        case PotentialType.TRIANGULAR: {
          const energyOffset = this.potentialOffsetProperty.value * QuantumConstants.EV_TO_JOULES;
          if (x < 0) {
            V = wellDepth + energyOffset;
          } else if (x < wellWidth) {
            V = energyOffset + (wellDepth / wellWidth) * x;
          } else {
            V = wellDepth + energyOffset;
          }
          break;
        }

        case PotentialType.COULOMB_1D: {
          const coulombStrength =
            IntroModel.COULOMB_CONSTANT * QuantumConstants.ELEMENTARY_CHARGE * QuantumConstants.ELEMENTARY_CHARGE;
          const r = Math.abs(x);
          if (r > IntroModel.COULOMB_MIN_DISTANCE) {
            V = -coulombStrength / r;
          } else {
            V = -coulombStrength / IntroModel.COULOMB_MIN_DISTANCE;
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

  /**
   * Get the potential energy at a specific position (in nm).
   */
  private getPotentialAtPosition(xNm: number): number {
    const x = xNm * QuantumConstants.NM_TO_M;
    const potential = this.getPotentialEnergy([x]);
    return potential[0]! * QuantumConstants.JOULES_TO_EV;
  }
}
