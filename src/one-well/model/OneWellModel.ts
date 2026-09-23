/**
 * OneWellModel represents the physics model for a single quantum potential well.
 * It handles the quantum mechanical calculations for a particle in a single well.
 */

import { NumberProperty } from "scenerystack/axon";
import { clamp, Range } from "scenerystack/dot";
import {
  calculateFiniteWellClassicalProbability,
  createFiniteWellPotential,
} from "../../common/model/analytical-solutions/finite-square-well.js";
import {
  calculateCoherentStateCoefficients,
  calculateHarmonicOscillatorClassicalProbability,
  createHarmonicOscillatorPotential,
} from "../../common/model/analytical-solutions/harmonic-oscillator.js";
import {
  calculateInfiniteWellClassicalProbability,
  createInfiniteWellPotential,
} from "../../common/model/analytical-solutions/infinite-square-well.js";
import { BaseModel } from "../../common/model/BaseModel.js";
import { createProjectedWavePacket, isSpatialPresetType } from "../../common/model/LocalizedWavePacket.js";
import { NoBoundStatesError } from "../../common/model/NoBoundStatesError.js";
import { PotentialType } from "../../common/model/PotentialFunction.js";
import {
  PotentialParameterPresets,
  SINGLE_WELL_PARAMETER_PRESETS,
} from "../../common/model/PotentialParameterPresets.js";
import QuantumConstants from "../../common/model/QuantumConstants.js";
import type { WellParameters } from "../../common/model/Schrodinger1DSolver.js";
import { SuperpositionType } from "../../common/model/SuperpositionType.js";
import Logger from "../../common/utils/Logger.js";

export class OneWellModel extends BaseModel {
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
   * Default coherent state displacement in nanometers.
   */
  private static readonly DEFAULT_COHERENT_DISPLACEMENT = 0.5;

  /**
   * Minimum coherent state displacement in nanometers.
   */
  private static readonly COHERENT_DISPLACEMENT_MIN = -4.0;

  /**
   * Maximum coherent state displacement in nanometers.
   */
  private static readonly COHERENT_DISPLACEMENT_MAX = 4.0;

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
  private static readonly ANALYTICAL_GRID_POINTS = 1000;

  /**
   * Spring constant multiplier for harmonic oscillator.
   * Factor used to convert well depth and width to spring constant: k = 8*V₀/L².
   */
  private static readonly SPRING_CONSTANT_MULTIPLIER = 8;

  /**
   * Alternative spring constant multiplier.
   * Used in some calculations: k = 4*V₀/L².
   */
  private static readonly SPRING_CONSTANT_MULTIPLIER_ALT = 4;

  /**
   * Coulomb's constant in N·m²/C².
   * Used for Coulomb potential calculations: k = 1/(4πε₀).
   */
  private static readonly COULOMB_CONSTANT = 8.9875517923e9;

  /**
   * Minimum distance for Coulomb potential calculations in nanometers.
   * Prevents singularity at the origin (r = 0) in getPotentialAtPosition.
   */
  private static readonly COULOMB_MIN_DISTANCE_NM = 0.01;

  /**
   * Minimum distance for Coulomb potential calculations in meters.
   * Prevents singularity at the origin (r = 0) in calculatePotentialEnergy.
   */
  private static readonly COULOMB_MIN_DISTANCE_M = 1e-12;

  /**
   * Infinite wall potential value in electron volts.
   * Large value representing impenetrable barrier.
   */
  private static readonly INFINITE_WALL_VALUE = 1000;

  /**
   * Gaussian width parameter for coherent state construction.
   * Controls localization in eigenstate space.
   */
  private static readonly COHERENT_GAUSSIAN_SIGMA = 3.0;

  /**
   * Center eigenstate index for coherent state construction.
   * Default center for Gaussian envelope.
   */
  private static readonly COHERENT_CENTER_EIGENSTATE = 5;

  /**
   * Phase gradient for coherent state momentum.
   * Small phase increment per eigenstate to create momentum.
   */
  private static readonly COHERENT_PHASE_GRADIENT = 0.1;

  /**
   * Number of states for narrow localized superposition.
   */
  private static readonly NUM_STATES_NARROW = 5;

  /**
   * Number of states for wide localized superposition.
   */
  private static readonly NUM_STATES_WIDE = 10;

  /**
   * Half divisor for trapezoidal integration.
   * Used to calculate midpoint: (x[i+1] - x[i]) / 2.
   */
  private static readonly HALF_DIVISOR = 2;

  // ==================== PROPERTIES ====================

  // Model-specific well parameters
  public readonly barrierHeightProperty: NumberProperty; // For Rosen-Morse and Eckart potentials
  public readonly potentialOffsetProperty: NumberProperty; // For triangular potential

  // Coherent state parameter
  public readonly coherentDisplacementProperty: NumberProperty; // Displacement in nm
  private readonly parameterPresets: PotentialParameterPresets<"wellWidth" | "wellDepth" | "barrierHeight">;

  public constructor() {
    super({ wellWidth: 5.5, wellDepth: 12 });

    // Initialize model-specific well parameters
    this.barrierHeightProperty = new NumberProperty(OneWellModel.DEFAULT_BARRIER_HEIGHT, {
      range: new Range(OneWellModel.BARRIER_HEIGHT_MIN, OneWellModel.BARRIER_HEIGHT_MAX),
    }); // in eV (for Rosen-Morse and Eckart)
    this.potentialOffsetProperty = new NumberProperty(OneWellModel.DEFAULT_POTENTIAL_OFFSET, {
      range: new Range(OneWellModel.POTENTIAL_OFFSET_MIN, OneWellModel.POTENTIAL_OFFSET_MAX),
    }); // in eV (for triangular potential)

    this.parameterPresets = new PotentialParameterPresets(
      this.potentialTypeProperty,
      {
        wellWidth: this.wellWidthProperty,
        wellDepth: this.wellDepthProperty,
        barrierHeight: this.barrierHeightProperty,
      },
      SINGLE_WELL_PARAMETER_PRESETS,
    );

    // Initialize coherent state displacement
    this.coherentDisplacementProperty = new NumberProperty(OneWellModel.DEFAULT_COHERENT_DISPLACEMENT, {
      range: new Range(OneWellModel.COHERENT_DISPLACEMENT_MIN, OneWellModel.COHERENT_DISPLACEMENT_MAX),
    });

    // Update superposition coefficients when superposition type or coherent displacement changes
    this.superpositionTypeProperty.link(() => this.updateSuperpositionCoefficients());
    this.coherentDisplacementProperty.link(() => {
      if (this.superpositionTypeProperty.value === SuperpositionType.COHERENT) {
        this.updateSuperpositionCoefficients();
      }
    });

    // Setup cache invalidation after all properties are initialized
    this.setupCacheInvalidation();
  }

  /**
   * Setup cache invalidation listeners, including model-specific properties.
   * Extends the base implementation to add OneWellModel-specific invalidation.
   */
  protected override setupCacheInvalidation(): void {
    super.setupCacheInvalidation();

    const invalidateCache = () => {
      this.boundStateResult = null;
      // Also update superposition coefficients when bound states change
      this.updateSuperpositionCoefficients();
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
      this.coherentDisplacementProperty.reset();
    });

    // The superposition config is derived from the superposition type; rebuild it for the reset state
    this.updateSuperpositionCoefficients();
  }

  /**
   * Calculates the classical turning points for a given energy level.
   * Returns the x positions (in nm) where the potential energy equals the eigenstate energy.
   * Returns null if turning points cannot be calculated.
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

    const energy = this.boundStateResult.energies[energyLevel]!; // in Joules
    const energyEV = energy * QuantumConstants.JOULES_TO_EV; // in eV
    const xGrid = this.boundStateResult.xGrid; // in meters

    // Find the turning points by finding where V(x) ≈ E
    let leftTurningPoint: number | null = null;
    let rightTurningPoint: number | null = null;

    for (let i = 0; i < xGrid.length - 1; i++) {
      const x = xGrid[i]! * QuantumConstants.M_TO_NM; // Convert to nm
      const V = this.getPotentialAtPosition(x); // in eV

      const xNext = xGrid[i + 1]! * QuantumConstants.M_TO_NM;
      const VNext = this.getPotentialAtPosition(xNext);

      // Check if energy crosses potential between these two points
      if ((V <= energyEV && VNext >= energyEV) || (V >= energyEV && VNext <= energyEV)) {
        // Linear interpolation to find crossing point
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
      return { left: leftTurningPoint, right: rightTurningPoint };
    }

    return null;
  }

  /**
   * Helper method to get potential energy at a given position (in nm).
   * Returns potential in eV.
   * Uses the analytical solver's potential function when available.
   */
  private getPotentialAtPosition(xNm: number): number {
    const potentialType = this.potentialTypeProperty.value;
    const wellWidth = this.wellWidthProperty.value * QuantumConstants.NM_TO_M;
    const wellDepth = this.wellDepthProperty.value;
    const xMeters = xNm * QuantumConstants.NM_TO_M;

    // Try to use analytical solver potential functions
    let potentialFunction: ((x: number) => number) | null = null;

    switch (potentialType) {
      case PotentialType.INFINITE_WELL:
        potentialFunction = createInfiniteWellPotential(wellWidth);
        break;

      case PotentialType.FINITE_WELL:
        potentialFunction = createFiniteWellPotential(wellWidth, wellDepth * QuantumConstants.EV_TO_JOULES);
        break;

      case PotentialType.HARMONIC_OSCILLATOR: {
        const wellDepthJoules = wellDepth * QuantumConstants.EV_TO_JOULES;
        const springConstant = (OneWellModel.SPRING_CONSTANT_MULTIPLIER * wellDepthJoules) / (wellWidth * wellWidth);
        potentialFunction = createHarmonicOscillatorPotential(springConstant);
        break;
      }

      default:
        // Fall through to legacy implementation for other potentials
        break;
    }

    // If we have an analytical potential function, use it
    if (potentialFunction) {
      const VJoules = potentialFunction(xMeters);
      return VJoules * QuantumConstants.JOULES_TO_EV;
    }

    // Legacy implementation for potentials without analytical solver support
    if (potentialType === PotentialType.ASYMMETRIC_TRIANGLE) {
      if (xNm < 0) {
        return OneWellModel.INFINITE_WALL_VALUE; // Infinite wall
      } else {
        const FEVPerNm = wellDepth / (wellWidth * QuantumConstants.M_TO_NM);
        return FEVPerNm * xNm;
      }
    } else if (potentialType === PotentialType.TRIANGULAR) {
      const offset = this.potentialOffsetProperty.value;
      const height = wellDepth;
      const widthNm = wellWidth * QuantumConstants.M_TO_NM;
      if (xNm < 0) {
        return height + offset;
      } else if (xNm < widthNm) {
        return offset + (height / widthNm) * xNm;
      } else {
        return height + offset;
      }
    } else if (potentialType === PotentialType.COULOMB_1D) {
      const widthNm = wellWidth * QuantumConstants.M_TO_NM;
      const k = wellDepth * (widthNm / OneWellModel.HALF_DIVISOR);
      const distance = Math.max(Math.abs(xNm), OneWellModel.COULOMB_MIN_DISTANCE_NM);
      return -k / distance;
    } else if (potentialType === PotentialType.MORSE) {
      const widthNm = wellWidth * QuantumConstants.M_TO_NM;
      const exponent = Math.exp(-xNm / widthNm);
      return wellDepth * (1 - exponent) ** 2 - wellDepth;
    } else if (potentialType === PotentialType.POSCHL_TELLER) {
      const widthNm = wellWidth * QuantumConstants.M_TO_NM;
      const coshVal = Math.cosh(xNm / widthNm);
      return -wellDepth / (coshVal * coshVal);
    } else if (potentialType === PotentialType.ROSEN_MORSE) {
      const widthNm = wellWidth * QuantumConstants.M_TO_NM;
      const barrierHeight = this.barrierHeightProperty.value;
      const coshVal = Math.cosh(xNm / widthNm);
      const tanhVal = Math.tanh(xNm / widthNm);
      return -wellDepth / (coshVal * coshVal) + barrierHeight * tanhVal;
    } else if (potentialType === PotentialType.ECKART) {
      const widthNm = wellWidth * QuantumConstants.M_TO_NM;
      const barrierHeight = this.barrierHeightProperty.value;
      const expVal = Math.exp(xNm / widthNm);
      const denom = 1 + expVal;
      return wellDepth / (denom * denom) - barrierHeight / denom;
    }

    // Default case
    return 0;
  }

  /**
   * Calculates the probability of finding the particle in the classically forbidden region.
   * Returns a percentage (0-100).
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
      const x = xGrid[i]! * QuantumConstants.M_TO_NM; // Convert to nm
      const psi = wavefunction[i]!;
      const probabilityDensity = psi * psi;

      // Calculate dx for integration (using trapezoidal rule)
      let dx: number;
      if (i === 0) {
        dx = ((xGrid[1]! - xGrid[0]!) / OneWellModel.HALF_DIVISOR) * QuantumConstants.M_TO_NM;
      } else if (i === xGrid.length - 1) {
        dx = ((xGrid[i]! - xGrid[i - 1]!) / OneWellModel.HALF_DIVISOR) * QuantumConstants.M_TO_NM;
      } else {
        dx = ((xGrid[i + 1]! - xGrid[i - 1]!) / OneWellModel.HALF_DIVISOR) * QuantumConstants.M_TO_NM;
      }

      totalProbability += probabilityDensity * dx;

      // Check if we're in the classically forbidden region
      if (x < turningPoints.left || x > turningPoints.right) {
        forbiddenProbability += probabilityDensity * dx;
      }
    }

    // Return as percentage
    return totalProbability > 0 ? (forbiddenProbability / totalProbability) * 100 : 0;
  }

  /**
   * Calculate bound states using the Schrödinger solver.
   * Results are cached until well parameters change.
   * Override from BaseModel.
   */
  protected override calculateBoundStates(): void {
    // All potentials now use wellWidth as a width parameter in nanometers (converted to meters)
    const wellWidth = this.wellWidthProperty.value * QuantumConstants.NM_TO_M; // width in meters
    const wellDepth = this.wellDepthProperty.value * QuantumConstants.EV_TO_JOULES;
    const mass = this.particleMassProperty.value * QuantumConstants.ELECTRON_MASS;

    // Calculate number of states based on potential type and energy range
    let numStates: number;

    // For harmonic oscillator, calculate states up to MAX_ENERGY_EV
    if (this.potentialTypeProperty.value === PotentialType.HARMONIC_OSCILLATOR) {
      const springConstant = (OneWellModel.SPRING_CONSTANT_MULTIPLIER * wellDepth) / (wellWidth * wellWidth);
      const omega = Math.sqrt(springConstant / mass);
      const maxEnergy = OneWellModel.MAX_ENERGY_EV * QuantumConstants.EV_TO_JOULES;
      // E_n = ℏω(n + 1/2), solve for n: n = E/(ℏω) - 1/2
      const maxN = Math.floor(maxEnergy / (QuantumConstants.HBAR * omega) - 0.5);
      numStates = clamp(maxN + 1, 1, OneWellModel.MAX_NUM_STATES); // Cap at MAX_NUM_STATES for safety
    }
    // For infinite well, calculate states up to MAX_ENERGY_EV
    else if (this.potentialTypeProperty.value === PotentialType.INFINITE_WELL) {
      const maxEnergy = OneWellModel.MAX_ENERGY_EV * QuantumConstants.EV_TO_JOULES;
      // E_n = (ℏ²π²n²)/(2mL²), solve for n
      const maxN = Math.floor(
        Math.sqrt(
          (2 * mass * wellWidth * wellWidth * maxEnergy) /
            (QuantumConstants.HBAR * QuantumConstants.HBAR * Math.PI * Math.PI),
        ),
      );
      numStates = clamp(maxN, 1, OneWellModel.MAX_NUM_STATES); // Cap at MAX_NUM_STATES for safety
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
      numStates = clamp(estimatedMax * 2, OneWellModel.DEFAULT_NUM_STATES, OneWellModel.MAX_NUM_STATES); // At least DEFAULT_NUM_STATES, cap at MAX_NUM_STATES
    }
    // For asymmetric triangle, calculate states that fit in the energy range
    else if (this.potentialTypeProperty.value === PotentialType.ASYMMETRIC_TRIANGLE) {
      numStates = OneWellModel.NUM_STATES_ASYMMETRIC_TRIANGLE; // Asymmetric triangle may have many states
    }
    // For triangular potential, calculate states based on well depth
    else if (this.potentialTypeProperty.value === PotentialType.TRIANGULAR) {
      numStates = OneWellModel.NUM_STATES_TRIANGULAR; // Triangular well typically has fewer states than asymmetric
    } else {
      numStates = OneWellModel.NUM_STATES_COMPLEX; // Use more states for other potentials
    }

    // Grid configuration spans the full chart display range
    // This ensures wavefunctions are calculated across the entire visible area
    const gridConfig = {
      xMin: -OneWellModel.CHART_DISPLAY_RANGE_NM * QuantumConstants.NM_TO_M,
      xMax: OneWellModel.CHART_DISPLAY_RANGE_NM * QuantumConstants.NM_TO_M,
      numPoints: OneWellModel.ANALYTICAL_GRID_POINTS, // Use fixed high-resolution grid for analytical solutions
    };

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
        case PotentialType.FINITE_WELL:
          potentialParams.wellDepth = wellDepth;
          break;
        case PotentialType.HARMONIC_OSCILLATOR:
          // Convert well depth to spring constant: k = mω² = m(4V₀/mL²) = 4V₀/L²
          potentialParams.springConstant =
            (OneWellModel.SPRING_CONSTANT_MULTIPLIER * wellDepth) / (wellWidth * wellWidth);
          break;
        case PotentialType.MORSE:
          // Morse potential: V(x) = D_e * (1 - exp(-(x - x_e)/a))^2
          // wellWidth is the width parameter 'a' in meters
          potentialParams.dissociationEnergy = wellDepth;
          potentialParams.equilibriumPosition = 0; // Center of the well
          potentialParams.wellWidth = wellWidth; // width in meters
          break;
        case PotentialType.POSCHL_TELLER:
          // Pöschl-Teller potential: V(x) = -V_0 / cosh²(x/a)
          // wellWidth is the width parameter 'a' in meters
          potentialParams.potentialDepth = wellDepth;
          potentialParams.wellWidth = wellWidth; // width in meters
          break;
        case PotentialType.ROSEN_MORSE:
          // Rosen-Morse potential: V(x) = -V_0 / cosh²(x/a) + V_1 * tanh(x/a)
          // wellWidth is the width parameter 'a' in meters
          potentialParams.potentialDepth = wellDepth;
          potentialParams.barrierHeight = this.barrierHeightProperty.value * QuantumConstants.EV_TO_JOULES;
          potentialParams.wellWidth = wellWidth; // width in meters
          break;
        case PotentialType.ECKART:
          // Eckart potential: V(x) = V_0 / (1 + exp(x/a))² - V_1 / (1 + exp(x/a))
          // wellWidth is the width parameter 'a' in meters
          potentialParams.potentialDepth = wellDepth;
          potentialParams.barrierHeight = this.barrierHeightProperty.value * QuantumConstants.EV_TO_JOULES;
          potentialParams.wellWidth = wellWidth; // width in meters
          break;
        case PotentialType.ASYMMETRIC_TRIANGLE:
          // Slope is the field strength
          potentialParams.slope = wellDepth / wellWidth;
          potentialParams.wellWidth = wellWidth;
          break;
        case PotentialType.TRIANGULAR:
          // Triangular potential:
          // V(x) = height + offset for x < 0
          // V(x) = offset at x = 0
          // V(x) = offset + (height/width) * x for 0 < x < width
          // V(x) = height + offset for x > width
          potentialParams.wellDepth = wellDepth; // height in Joules
          potentialParams.wellWidth = wellWidth; // width in meters
          potentialParams.energyOffset = this.potentialOffsetProperty.value * QuantumConstants.EV_TO_JOULES; // offset in Joules
          break;
        case PotentialType.COULOMB_1D: {
          // For Coulomb potentials, use coulombStrength parameter α = k*e²
          // where k = 1/(4πε₀) ≈ 8.9875517923e9 N·m²/C²
          // α ≈ 2.307e-28 J·m for electron charge
          // Energy then scales naturally with mass: E_n = -mα²/(2ℏ²n²)
          // With electron mass, this gives E_1 = -13.6 eV
          potentialParams.coulombStrength =
            OneWellModel.COULOMB_CONSTANT * QuantumConstants.ELEMENTARY_CHARGE * QuantumConstants.ELEMENTARY_CHARGE;
          break;
        }
        default:
          // For other potential types, use numerical solution
          break;
      }

      // Attempt analytical solution first
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
   * For many potentials, the analytical solver provides an exact normalized solution.
   *
   * @param energyIndex - Index of the energy level (0-indexed)
   * @returns Array of classical probability density values, or null if unavailable
   */
  public override getClassicalProbabilityDensity(energyIndex: number): number[] | null {
    Logger.debug("getClassicalProbabilityDensity called:", {
      energyIndex,
      potentialType: this.potentialTypeProperty.value,
      hasBoundStates: !!this.boundStateResult,
    });

    if (!this.boundStateResult) {
      this.calculateBoundStates();
    }

    if (!this.boundStateResult || energyIndex < 0 || energyIndex >= this.boundStateResult.energies.length) {
      Logger.debug("Returning null - no bound states or invalid index");
      return null;
    }

    const energy = this.boundStateResult.energies[energyIndex]!;
    const xGrid = this.boundStateResult.xGrid;
    const mass = this.particleMassProperty.value * QuantumConstants.ELECTRON_MASS;
    const wellWidth = this.wellWidthProperty.value * QuantumConstants.NM_TO_M;
    const wellDepth = this.wellDepthProperty.value * QuantumConstants.EV_TO_JOULES;

    // Use analytical solver methods when available
    const potentialType = this.potentialTypeProperty.value;
    Logger.debug("Processing potential type:", potentialType);

    try {
      switch (potentialType) {
        case PotentialType.INFINITE_WELL:
          return calculateInfiniteWellClassicalProbability(wellWidth, energy, mass, xGrid);

        case PotentialType.FINITE_WELL:
          return calculateFiniteWellClassicalProbability(wellWidth, wellDepth, energy, mass, xGrid);

        case PotentialType.HARMONIC_OSCILLATOR: {
          const springConstant = (OneWellModel.SPRING_CONSTANT_MULTIPLIER * wellDepth) / (wellWidth * wellWidth);
          return calculateHarmonicOscillatorClassicalProbability(springConstant, energy, mass, xGrid);
        }

        default:
          // Fall back to numerical calculation for other potentials
          break;
      }
    } catch (error) {
      Logger.warn(
        `Failed to use analytical classical probability for ${potentialType}, falling back to numerical:`,
        error,
      );
    }

    // Fallback: numerical calculation using potential function
    const potential = this.getPotentialEnergy(xGrid);

    // Use BaseModel's common method to calculate classical probability density
    const result = this.calculateClassicalProbabilityDensity(potential, energy, mass, xGrid);

    Logger.debug(`Classical probability for ${potentialType}:`, {
      energyEV: energy * QuantumConstants.JOULES_TO_EV,
      potentialType,
      samplePotential: potential.slice(0, 5).map((v) => v * QuantumConstants.JOULES_TO_EV),
      sampleResult: result.slice(0, 5),
      nonZeroCount: result.filter((p) => p > 0).length,
    });

    return result;
  }

  /**
   * Calculate the potential energy at given positions.
   * Uses the analytical solver's potential function when available.
   * @param xGrid - Array of x positions in meters
   * @returns Array of potential energy values in Joules
   */
  protected override calculatePotentialEnergy(xGrid: readonly number[]): number[] {
    const wellWidth = this.wellWidthProperty.value * QuantumConstants.NM_TO_M;
    const wellDepth = this.wellDepthProperty.value * QuantumConstants.EV_TO_JOULES;

    // Try to use analytical solver potential functions
    let potentialFunction: ((x: number) => number) | null = null;

    switch (this.potentialTypeProperty.value) {
      case PotentialType.INFINITE_WELL:
        potentialFunction = createInfiniteWellPotential(wellWidth);
        break;

      case PotentialType.FINITE_WELL:
        potentialFunction = createFiniteWellPotential(wellWidth, wellDepth);
        break;

      case PotentialType.HARMONIC_OSCILLATOR: {
        const springConstant = (OneWellModel.SPRING_CONSTANT_MULTIPLIER * wellDepth) / (wellWidth * wellWidth);
        potentialFunction = createHarmonicOscillatorPotential(springConstant);
        break;
      }

      default:
        // Fall through to legacy implementation for other potentials
        break;
    }

    // If we have an analytical potential function, use it
    if (potentialFunction) {
      return xGrid.map((x) => potentialFunction!(x));
    }

    // Legacy implementation for potentials without analytical solver support
    const potential: number[] = [];

    for (let i = 0; i < xGrid.length; i++) {
      const x = xGrid[i]!;
      let V: number;

      switch (this.potentialTypeProperty.value) {
        case PotentialType.MORSE: {
          // V(x) = D_e * (1 - exp(-a(x - x_e)))^2
          const a = 1 / wellWidth;
          const exponential = Math.exp(-a * x);
          V = wellDepth * (1 - exponential) ** 2;
          break;
        }

        case PotentialType.POSCHL_TELLER: {
          // V(x) = -V_0 / cosh^2(x/a)
          const coshPT = Math.cosh(x / wellWidth);
          V = -wellDepth / (coshPT * coshPT);
          break;
        }

        case PotentialType.ROSEN_MORSE: {
          // V(x) = -V_0 / cosh^2(x/a) + V_1 * tanh(x/a)
          const barrierHeight = this.barrierHeightProperty.value * QuantumConstants.EV_TO_JOULES;
          const coshRM = Math.cosh(x / wellWidth);
          const tanhRM = Math.tanh(x / wellWidth);
          V = -wellDepth / (coshRM * coshRM) + barrierHeight * tanhRM;
          break;
        }

        case PotentialType.ECKART: {
          // V(x) = V_0 / (1 + exp(x/a))^2 - V_1 / (1 + exp(x/a))
          const barrierHeightE = this.barrierHeightProperty.value * QuantumConstants.EV_TO_JOULES;
          const expE = Math.exp(x / wellWidth);
          const denomE = 1 + expE;
          V = wellDepth / (denomE * denomE) - barrierHeightE / denomE;
          break;
        }

        case PotentialType.ASYMMETRIC_TRIANGLE: {
          // V(x) = F * x (linear potential with electric field)
          const slope = wellDepth / wellWidth;
          V = slope * x;
          break;
        }

        case PotentialType.TRIANGULAR: {
          // Triangular potential
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
          // V(x) = -α/|x| where α = ke²
          const coulombStrength =
            OneWellModel.COULOMB_CONSTANT * QuantumConstants.ELEMENTARY_CHARGE * QuantumConstants.ELEMENTARY_CHARGE;
          const r = Math.abs(x);
          if (r > OneWellModel.COULOMB_MIN_DISTANCE_M) {
            // Avoid singularity at origin
            V = -coulombStrength / r;
          } else {
            V = -coulombStrength / OneWellModel.COULOMB_MIN_DISTANCE_M;
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
   * Get the superposition wavefunction based on current superposition config.
   * Returns the real-space wavefunction: ψ(x) = Σ c_n * e^(iφ_n) * ψ_n(x)
   * Since we're returning real values for display, this returns the real part at t=0.
   *
   * @returns Object with wavefunction array and energy (weighted average), or null
   */
  public getSuperpositionWavefunction(): {
    wavefunction: number[];
    energy: number;
  } | null {
    if (!this.boundStateResult) {
      this.calculateBoundStates();
    }

    if (!this.boundStateResult) {
      return null;
    }

    const config = this.superpositionConfigProperty.value;
    const numPoints = this.boundStateResult.xGrid.length;
    const wavefunction = new Array(numPoints).fill(0);
    let weightedEnergy = 0;

    // Compute superposition: ψ(x) = Σ c_n * e^(iφ_n) * ψ_n(x)
    // At t=0, this is: ψ(x) = Σ c_n * (cos(φ_n) + i*sin(φ_n)) * ψ_n(x)
    // We return the real part: Σ c_n * cos(φ_n) * ψ_n(x)
    for (let n = 0; n < config.amplitudes.length; n++) {
      const amplitude = config.amplitudes[n]!;
      const phase = config.phases[n]!;

      if (amplitude === 0) {
        continue;
      }

      if (n < this.boundStateResult.wavefunctions.length) {
        const eigenfunction = this.boundStateResult.wavefunctions[n]!;
        const coeff = amplitude * Math.cos(phase);

        for (let i = 0; i < numPoints; i++) {
          wavefunction[i] += coeff * eigenfunction[i]!;
        }

        // Add weighted energy contribution
        weightedEnergy += amplitude * amplitude * this.boundStateResult.energies[n]!;
      }
    }

    return {
      wavefunction,
      energy: weightedEnergy,
    };
  }

  /**
   * Updates the superposition coefficients based on the selected superposition type.
   * This method computes the amplitudes and phases for predefined superposition types.
   */
  public updateSuperpositionCoefficients(): void {
    const type = this.superpositionTypeProperty.value;

    // Skip CUSTOM type - coefficients are set manually by the user
    if (type === SuperpositionType.CUSTOM) {
      return;
    }

    // Ensure we have bound states
    if (!this.boundStateResult) {
      this.calculateBoundStates();
    }

    if (!this.boundStateResult) {
      return;
    }

    // Extract to local constant for type narrowing
    const boundStates = this.boundStateResult;
    const numStates = boundStates.energies.length;
    if (isSpatialPresetType(type)) {
      const config = this.superpositionConfigProperty.value;
      this.superpositionConfigProperty.value = createProjectedWavePacket(boundStates, { ...config, type });
      return;
    }
    let amplitudes: number[];
    let phases: number[];
    let selectedPair: [number, number] | undefined;

    switch (type) {
      case SuperpositionType.PSI_I_PSI_J:
        // Equal superposition of the chosen pair, defaulting to the first two states.
        amplitudes = new Array(numStates).fill(0);
        phases = new Array(numStates).fill(0);
        if (numStates >= 2) {
          const [first, second] = this.superpositionConfigProperty.value.stateIndices ?? [0, 1];
          const firstIndex = clamp(first, 0, numStates - 1);
          const secondIndex = clamp(second, 0, numStates - 1);
          selectedPair = [firstIndex, secondIndex === firstIndex ? (firstIndex + 1) % numStates : secondIndex];
          amplitudes[firstIndex] = 1 / Math.sqrt(2);
          amplitudes[selectedPair[1]] = 1 / Math.sqrt(2);
        }
        break;

      case SuperpositionType.SINGLE:
        // Single eigenstate (ground state)
        amplitudes = new Array(numStates).fill(0);
        phases = new Array(numStates).fill(0);
        amplitudes[0] = 1;
        break;

      case SuperpositionType.LOCALIZED_NARROW: {
        // Narrow localized state: superposition of first few states
        amplitudes = new Array(numStates).fill(0);
        phases = new Array(numStates).fill(0);
        const numStatesNarrow = Math.min(OneWellModel.NUM_STATES_NARROW, numStates);
        for (let i = 0; i < numStatesNarrow; i++) {
          amplitudes[i] = 1;
        }
        // Normalize
        const normNarrow = Math.sqrt(amplitudes.reduce((sum, a) => sum + a * a, 0));
        amplitudes = amplitudes.map((a) => a / normNarrow);
        break;
      }

      case SuperpositionType.LOCALIZED_WIDE: {
        // Wide localized state: superposition of more states
        amplitudes = new Array(numStates).fill(0);
        phases = new Array(numStates).fill(0);
        const numStatesWide = Math.min(OneWellModel.NUM_STATES_WIDE, numStates);
        for (let i = 0; i < numStatesWide; i++) {
          amplitudes[i] = 1;
        }
        // Normalize
        const normWide = Math.sqrt(amplitudes.reduce((sum, a) => sum + a * a, 0));
        amplitudes = amplitudes.map((a) => a / normWide);
        break;
      }

      case SuperpositionType.COHERENT: {
        const wellWidth = this.wellWidthProperty.value * QuantumConstants.NM_TO_M;
        const displacement = this.coherentDisplacementProperty.value * QuantumConstants.NM_TO_M;

        if (this.potentialTypeProperty.value === PotentialType.HARMONIC_OSCILLATOR) {
          // True coherent state for harmonic oscillator
          const wellDepth = this.wellDepthProperty.value * QuantumConstants.EV_TO_JOULES;
          const mass = this.particleMassProperty.value * QuantumConstants.ELECTRON_MASS;
          const springConstant = (OneWellModel.SPRING_CONSTANT_MULTIPLIER_ALT * wellDepth) / (wellWidth * wellWidth);

          const result = calculateCoherentStateCoefficients(displacement, springConstant, mass, numStates);
          amplitudes = result.amplitudes;
          phases = result.phases;
        } else {
          // Coherent-state-like wavepacket for other potentials
          // Create a localized superposition centered at the displacement position
          // using a Gaussian envelope in eigenstate space
          amplitudes = new Array(numStates).fill(0);
          phases = new Array(numStates).fill(0);

          // For each eigenstate, compute its overlap with a position-localized state
          // We use the eigenfunction values at the displacement position as weights
          const displacementIndex = Math.round(
            ((displacement + 4 * QuantumConstants.NM_TO_M) / (8 * QuantumConstants.NM_TO_M)) *
              (boundStates.xGrid.length - 1),
          );
          const clampedIndex = clamp(displacementIndex, 0, boundStates.xGrid.length - 1);

          // Weight each eigenstate by its wavefunction value at the displacement position
          // and apply a Gaussian envelope in eigenstate index to create localization
          const sigma = OneWellModel.COHERENT_GAUSSIAN_SIGMA; // Width of Gaussian in eigenstate space
          const n0 = Math.min(
            OneWellModel.COHERENT_CENTER_EIGENSTATE,
            Math.floor(numStates / OneWellModel.HALF_DIVISOR),
          ); // Center around a middle eigenstate

          for (let n = 0; n < numStates; n++) {
            if (n < boundStates.wavefunctions.length) {
              const psiNAtX = boundStates.wavefunctions[n]![clampedIndex]!;

              // Gaussian envelope in eigenstate space
              const gaussianWeight = Math.exp(-((n - n0) ** 2) / (OneWellModel.HALF_DIVISOR * sigma * sigma));

              // Combine position-based and Gaussian weights
              amplitudes[n] = psiNAtX * gaussianWeight;
            }
          }

          // Normalize the amplitudes
          const norm = Math.sqrt(amplitudes.reduce((sum, a) => sum + a * a, 0));
          if (norm > 0) {
            amplitudes = amplitudes.map((a) => a / norm);
          } else {
            // Fallback: if all amplitudes are zero, just use ground state
            amplitudes[0] = 1;
          }

          // Set phases based on momentum (for a wavepacket moving toward the center)
          // Phase increases linearly with eigenstate index to create momentum
          const momentumDirection = displacement > 0 ? -1 : 1; // Move toward center
          for (let n = 0; n < numStates; n++) {
            phases[n] = momentumDirection * n * OneWellModel.COHERENT_PHASE_GRADIENT; // Small phase gradient
          }
        }
        break;
      }

      default:
        // Default to ground state
        amplitudes = new Array(numStates).fill(0);
        phases = new Array(numStates).fill(0);
        amplitudes[0] = 1;
        break;
    }

    // Update the superposition config
    this.superpositionConfigProperty.value = {
      type,
      amplitudes,
      phases,
      ...(type === SuperpositionType.COHERENT && { displacement: this.coherentDisplacementProperty.value }),
      ...(selectedPair && { stateIndices: selectedPair }),
    };
  }
}
