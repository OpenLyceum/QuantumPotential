/**
 * BaseModel is an abstract base class for all physics models in QPPW.
 * It provides common functionality for time evolution, simulation control, and solver configuration.
 */

import { NumberProperty, Property } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import qppwQueryParameters from "../../preferences/qppwQueryParameters.js";
import { convertToWavenumber } from "./analytical-solutions/fourier-transform-helper.js";
import { createProjectedWavePacket, isSpatialPresetType } from "./LocalizedWavePacket.js";
import { type BoundStateResult, PotentialType, type WavenumberTransformResult } from "./PotentialFunction.js";
import QuantumConstants from "./QuantumConstants.js";
import Schrodinger1DSolver, { type NumericalMethod } from "./Schrodinger1DSolver.js";
import { type SuperpositionConfig, SuperpositionType } from "./SuperpositionType.js";

/**
 * Per-screen initial values. They are passed to the constructor (rather than assigned after
 * super()) so that each Property's reset() returns to the screen's own default.
 */
export type BaseModelOptions = {
  potentialType?: PotentialType;
  wellWidth?: number; // nm
  wellWidthRange?: Range; // nm
  superpositionConfig?: SuperpositionConfig;
};

export abstract class BaseModel {
  // ==================== CONSTANTS ====================

  /**
   * Default time step for manual stepping (in seconds).
   * Corresponds to approximately 1 frame at 60 FPS.
   */
  public static readonly MANUAL_STEP_SIZE = 0.016;

  /**
   * Minimum value for well width in nanometers.
   * Ensures the well is large enough for meaningful quantum behavior.
   */
  private static readonly WELL_WIDTH_MIN = 0.1;

  /**
   * Maximum value for well width in nanometers.
   * Limits the computational domain to reasonable sizes.
   */
  private static readonly WELL_WIDTH_MAX = 6.0;

  /**
   * Minimum value for well depth in electron volts.
   * Ensures at least one bound state can exist.
   */
  private static readonly WELL_DEPTH_MIN = 0.1;

  /**
   * Maximum value for well depth in electron volts.
   * Limits energy to reasonable values for atomic-scale systems.
   */
  private static readonly WELL_DEPTH_MAX = 15.0;

  /**
   * Minimum value for well offset (normalized position).
   * Used for asymmetric potential configurations.
   */
  private static readonly WELL_OFFSET_MIN = 0.0;

  /**
   * Maximum value for well offset (normalized position).
   * Used for asymmetric potential configurations.
   */
  private static readonly WELL_OFFSET_MAX = 1.0;

  /**
   * Minimum particle mass in units of electron mass.
   * Allows lighter particles (e.g., 0.5 m_e).
   */
  private static readonly PARTICLE_MASS_MIN = 0.5;

  /**
   * Maximum particle mass in units of electron mass.
   * Limits to slightly heavier than electron mass.
   */
  private static readonly PARTICLE_MASS_MAX = 1.1;

  /**
   * Minimum energy level index (0 = ground state).
   * Energy levels are 0-indexed internally.
   */
  private static readonly ENERGY_LEVEL_INDEX_MIN = 0;

  /**
   * Maximum energy level index.
   * Caps the number of accessible quantum states.
   */
  private static readonly ENERGY_LEVEL_INDEX_MAX = 99;

  /**
   * Minimum kinetic energy threshold as fraction of maximum kinetic energy.
   * Used in classical probability calculations to prevent singularities at turning points.
   * Value of 0.01 (1%) prevents infinities while preserving probability distribution shape.
   */
  private static readonly MIN_KINETIC_ENERGY_FRACTION = 0.01;

  /** Available animation rates, relative to the original normal speed. */
  public static readonly TIME_SPEED_MULTIPLIERS = [0.1, 0.25, 0.5, 1, 2, 4] as const;

  /**
   * Divisor for trapezoidal integration (averaging adjacent values).
   * Used in numerical integration: (f(x_i) + f(x_{i+1})) / 2.
   */
  private static readonly TRAPEZOIDAL_DIVISOR = 2;

  // ==================== PROPERTIES ====================

  // Simulation state properties
  public readonly isPlayingProperty: Property<boolean>;
  public readonly timeProperty: NumberProperty; // In femtoseconds
  public readonly timeSpeedProperty: NumberProperty;

  // Potential type selection
  public readonly potentialTypeProperty: Property<PotentialType>;

  // Well parameters (used for different potential types)
  public readonly wellWidthProperty: NumberProperty;
  public readonly wellDepthProperty: NumberProperty;
  public readonly wellOffsetProperty: NumberProperty; // For asymmetric wells

  // Particle properties
  public readonly particleMassProperty: NumberProperty; // In units of electron mass

  // Energy level selection
  public readonly selectedEnergyLevelIndexProperty: NumberProperty; // 0-indexed

  // Superposition state
  public readonly superpositionTypeProperty: Property<SuperpositionType>;
  public readonly superpositionConfigProperty: Property<SuperpositionConfig>;

  // Cached bound state results
  protected boundStateResult: BoundStateResult | null = null;
  private wavePacketProjection: {
    states: BoundStateResult;
    key: string;
    config: SuperpositionConfig;
  } | null = null;

  // Solver for quantum calculations
  protected readonly solver: Schrodinger1DSolver;

  // Guard flag to prevent reentry in step method
  private isStepping: boolean = false;

  protected constructor(options?: BaseModelOptions) {
    // Initialize simulation state
    this.isPlayingProperty = new Property<boolean>(false);
    this.timeProperty = new NumberProperty(0); // in femtoseconds
    this.timeSpeedProperty = new NumberProperty(1, { range: new Range(0.1, 4) });

    // Initialize potential type
    this.potentialTypeProperty = new Property<PotentialType>(options?.potentialType ?? PotentialType.INFINITE_WELL);

    // Initialize well parameters with default values
    this.wellWidthProperty = new NumberProperty(options?.wellWidth ?? 4.0, {
      range: options?.wellWidthRange ?? new Range(BaseModel.WELL_WIDTH_MIN, BaseModel.WELL_WIDTH_MAX),
    }); // in nanometers
    this.wellDepthProperty = new NumberProperty(5.0, {
      range: new Range(BaseModel.WELL_DEPTH_MIN, BaseModel.WELL_DEPTH_MAX),
    }); // in eV
    this.wellOffsetProperty = new NumberProperty(0.5, {
      range: new Range(BaseModel.WELL_OFFSET_MIN, BaseModel.WELL_OFFSET_MAX),
    }); // normalized position

    // Initialize particle mass (1.0 = electron mass)
    this.particleMassProperty = new NumberProperty(1.0, {
      range: new Range(BaseModel.PARTICLE_MASS_MIN, BaseModel.PARTICLE_MASS_MAX),
    }); // 0.5 to 1.1 times electron mass

    // Initialize energy level selection (ground state by default)
    this.selectedEnergyLevelIndexProperty = new NumberProperty(0, {
      range: new Range(BaseModel.ENERGY_LEVEL_INDEX_MIN, BaseModel.ENERGY_LEVEL_INDEX_MAX),
    });

    // Initialize superposition state
    this.superpositionTypeProperty = new Property<SuperpositionType>(SuperpositionType.SINGLE);
    this.superpositionConfigProperty = new Property<SuperpositionConfig>(
      options?.superpositionConfig ?? {
        type: SuperpositionType.SINGLE,
        amplitudes: [1.0],
        phases: [0],
      },
    );

    // Numerov by default; ?numericalMethod=fgh selects the FGH cross-check
    this.solver = new Schrodinger1DSolver(qppwQueryParameters.numericalMethod as NumericalMethod);

    // Note: setupCacheInvalidation() must be called by subclasses
    // after all their properties are initialized
  }

  /**
   * Setup cache invalidation listeners for common properties.
   * Subclasses can override this to add additional invalidation listeners.
   */
  protected setupCacheInvalidation(): void {
    const invalidateCache = () => {
      this.boundStateResult = null;
    };

    this.potentialTypeProperty.lazyLink(invalidateCache);
    this.wellWidthProperty.lazyLink(invalidateCache);
    this.wellDepthProperty.lazyLink(invalidateCache);
    this.wellOffsetProperty.lazyLink(invalidateCache);
    this.particleMassProperty.lazyLink(invalidateCache);
  }

  /**
   * Releases any listeners this model registered on global Properties, so a disposed model can be
   * garbage collected. The model currently links to no global Property; keep this in sync if one is added.
   */
  public dispose(): void {
    // Nothing to unlink.
  }

  /**
   * Resets all properties to their initial state.
   * Subclasses should override this method and call super.reset().
   */
  public reset(): void {
    this.isPlayingProperty.reset();
    this.timeProperty.reset();
    this.timeSpeedProperty.reset();
    this.potentialTypeProperty.reset();
    this.wellWidthProperty.reset();
    this.wellDepthProperty.reset();
    this.wellOffsetProperty.reset();
    this.particleMassProperty.reset();
    this.selectedEnergyLevelIndexProperty.reset();
    this.superpositionTypeProperty.reset();
    this.superpositionConfigProperty.reset();
  }

  /**
   * Steps the model forward in time.
   * @param dt - The time step in seconds (can be negative for backward stepping)
   * @param forced - If true, steps even when paused (for manual stepping buttons)
   */
  public step(dt: number, forced = false): void {
    // Prevent reentry
    if (this.isStepping) {
      return;
    }

    this.isStepping = true;
    try {
      this.clampSelectedEnergyLevel();

      if (this.isPlayingProperty.value || forced) {
        // Convert dt to femtoseconds and apply speed multiplier (only when playing normally)
        const speedMultiplier = forced ? 1 : this.timeSpeedProperty.value;
        const dtFemtoseconds = dt * speedMultiplier; // seconds to femtoseconds
        this.timeProperty.value += dtFemtoseconds;
        // Quantum mechanical time evolution is handled in the view layer
      }
    } finally {
      this.isStepping = false;
    }
  }

  /**
   * Keeps the selected energy level within the current bound states. Bound states are computed
   * lazily, often from inside a listener of selectedEnergyLevelIndexProperty itself, so the
   * calculation must not write the selection (that re-enters the Property's notification).
   * Instead the selection is clamped here, at the start of each step(); until then views treat an
   * out-of-range index as "no level selected".
   */
  private clampSelectedEnergyLevel(): void {
    if (this.boundStateResult) {
      const maxIndex = Math.max(0, this.boundStateResult.energies.length - 1);
      if (this.selectedEnergyLevelIndexProperty.value > maxIndex) {
        this.selectedEnergyLevelIndexProperty.value = maxIndex;
      }
    }
  }

  /**
   * Calculate classical probability density from potential energy and energy level.
   * This is a common calculation used by all model classes to compute the classical
   * probability density for display alongside quantum probability.
   *
   * The classical probability density is P(x) ∝ 1/v(x) where v(x) is the classical velocity.
   * For a particle with total energy E in potential V(x):
   *   v(x) = √[2(E - V(x))/m]
   *   P(x) = 1/v(x) = √[m/(2(E - V(x)))] = 1/√[2(E - V(x))/m]
   *
   * To prevent singularities at turning points (where E ≈ V(x) and v → 0), we use a
   * minimum kinetic energy threshold (5% of total energy). This prevents display issues
   * when classical probability is plotted with quantum probability on the same scale.
   *
   * @param potential - Array of potential energy values at each grid point (in Joules)
   * @param energy - Total energy of the particle (in Joules)
   * @param mass - Particle mass (in kg)
   * @param xGrid - Array of x positions (in meters)
   * @returns Normalized classical probability density array (in 1/meters)
   */
  protected calculateClassicalProbabilityDensity(
    potential: number[],
    energy: number,
    mass: number,
    xGrid: number[],
  ): number[] {
    const classicalProbability: number[] = [];
    let integralSum = 0;

    // First pass: find maximum kinetic energy to set appropriate threshold
    let maxKE = 0;
    for (let i = 0; i < xGrid.length; i++) {
      const ke = energy - potential[i]!;
      if (ke > maxKE) {
        maxKE = ke;
      }
    }

    // Use minimum kinetic energy threshold to prevent singularities
    // This preserves the shape while avoiding infinities at turning points
    const minKE = BaseModel.MIN_KINETIC_ENERGY_FRACTION * maxKE;

    // Second pass: calculate probability with threshold
    for (let i = 0; i < xGrid.length; i++) {
      const kineticEnergy = energy - potential[i]!;

      let probability = 0;
      if (kineticEnergy > 0) {
        // Use minimum kinetic energy to prevent singularities at turning points
        // This prevents display issues when classical probability is plotted with quantum probability
        const safeKE = Math.max(kineticEnergy, minKE);
        probability = 1 / Math.sqrt((2 * safeKE) / mass);
      }
      classicalProbability.push(probability);

      // Trapezoidal integration for normalization
      if (i > 0) {
        const dx = xGrid[i]! - xGrid[i - 1]!;
        integralSum += ((probability + classicalProbability[i - 1]!) * dx) / BaseModel.TRAPEZOIDAL_DIVISOR;
      }
    }

    // Normalize so that ∫P(x)dx = 1
    if (integralSum > 0) {
      for (let i = 0; i < classicalProbability.length; i++) {
        classicalProbability[i]! /= integralSum;
      }
    }

    return classicalProbability;
  }

  /**
   * Abstract method for calculating bound states.
   * Subclasses must implement this method to perform the actual bound state calculations.
   */
  protected abstract calculateBoundStates(): void;

  /**
   * Potential energy (J) at the given positions (m): exactly the potential the solver used. For closed-form
   * potentials that is the analytical solution's own V(x); otherwise the screen model's potential. Views draw
   * this and tools use it, so nothing re-derives a potential that could drift from the one being solved.
   */
  public getPotentialEnergy(xGrid: readonly number[]): number[] {
    if (!this.boundStateResult) {
      this.calculateBoundStates();
    }
    const analyticalSolution = this.solver.getAnalyticalSolution();
    if (analyticalSolution) {
      const potential = analyticalSolution.createPotential();
      return xGrid.map((x) => potential(x));
    }
    return this.calculatePotentialEnergy(xGrid);
  }

  /**
   * The screen model's potential energy (J) at the given positions (m), for potentials without a closed-form
   * solution class (double and multi-well). Use getPotentialEnergy, which prefers the solver's own potential.
   */
  protected abstract calculatePotentialEnergy(xGrid: readonly number[]): number[];

  /**
   * Get all bound state energies and wavefunctions for the current well.
   * @returns BoundStateResult with energies (in eV) and wavefunctions
   */
  public getBoundStates(): BoundStateResult | null {
    if (!this.boundStateResult) {
      this.calculateBoundStates();
    }
    return this.boundStateResult;
  }

  /** Reproject a spatial preset when the bound states or its parameters change. */
  public getSuperpositionConfigForBoundStates(states: BoundStateResult): SuperpositionConfig {
    const config = this.superpositionConfigProperty.value;
    const type = this.superpositionTypeProperty.value;
    if (config.type !== type || !isSpatialPresetType(type)) {
      return config;
    }
    const position = config.position ?? 0;
    const width = config.width ?? 0.5;
    const momentum = config.momentum ?? 2;
    const secondPosition = config.secondPosition ?? 1.5;
    const relativePhase = config.relativePhase ?? 0;
    const key = `${type}:${position}:${width}:${momentum}:${secondPosition}:${relativePhase}`;
    const cached = this.wavePacketProjection;
    if (cached && cached.states === states && cached.key === key) {
      return cached.config;
    }
    const projected = createProjectedWavePacket(states, config);
    this.wavePacketProjection = { states, key, config: projected };
    return projected;
  }

  /**
   * Get the Fourier transform of bound state wavefunctions in wavenumber space.
   * Returns the wavenumber grid k and the transformed wavefunctions |φ(k)|.
   *
   * @param numWavenumberPoints - Optional number of points in wavenumber space
   * @param kMax - Optional maximum wavenumber value in rad/m
   * @returns Wavenumber transform result, or null if not available
   */
  public getWavenumberTransform(numWavenumberPoints?: number, kMax?: number): WavenumberTransformResult | null {
    // Ensure bound states are calculated
    const boundStates = this.getBoundStates();
    if (!boundStates) {
      return null;
    }

    // Get the analytical solution from the solver
    const analyticalSolution = this.solver.getAnalyticalSolution();
    if (!analyticalSolution) {
      return null;
    }

    // Calculate Fourier transform in momentum space
    const mass = this.particleMassProperty.value * QuantumConstants.ELECTRON_MASS;

    // Convert kMax to pMax if provided: p = ℏk
    const pMax = kMax ? kMax * QuantumConstants.HBAR : undefined;

    const fourierResult = analyticalSolution.calculateFourierTransform(boundStates, mass, numWavenumberPoints, pMax);

    // Convert to wavenumber space using the helper function
    return convertToWavenumber(fourierResult);
  }

  /**
   * Calculates the energy eigenvalues for the current well parameters.
   * @param n - The quantum number (1, 2, 3, ...)
   * @returns The energy in eV
   */
  public getEnergyLevel(n: number): number {
    // Ensure bound states are calculated
    if (!this.boundStateResult) {
      this.calculateBoundStates();
    }

    // Return energy for quantum number n (1-indexed)
    if (this.boundStateResult && n > 0 && n <= this.boundStateResult.energies.length) {
      const energyJoules = this.boundStateResult.energies[n - 1]!;
      return Schrodinger1DSolver.joulesToEV(energyJoules);
    }

    // Fallback to analytical formula if solver fails
    const L = this.wellWidthProperty.value * QuantumConstants.NM_TO_M;
    const energy =
      (n * n * Math.PI * Math.PI * QuantumConstants.HBAR * QuantumConstants.HBAR) /
      (2 * QuantumConstants.ELECTRON_MASS * L * L);
    return Schrodinger1DSolver.joulesToEV(energy);
  }

  /**
   * Get all energy levels in eV.
   * @returns Array of energy levels in eV
   */
  public getEnergyLevels(): number[] {
    // Ensure bound states are calculated
    if (!this.boundStateResult) {
      this.calculateBoundStates();
    }

    if (!this.boundStateResult?.energies) {
      return [];
    }

    // Convert all energies from Joules to eV
    return this.boundStateResult.energies.map((energyJoules) => Schrodinger1DSolver.joulesToEV(energyJoules));
  }

  /**
   * Get the wavefunction for a specific quantum number.
   * @param n - The quantum number (1, 2, 3, ...)
   * @returns Array of wavefunction values at grid points, or null if unavailable
   */
  public getWavefunction(n: number): number[] | null {
    if (!this.boundStateResult) {
      this.calculateBoundStates();
    }

    if (this.boundStateResult && n > 0 && n <= this.boundStateResult.wavefunctions.length) {
      return this.boundStateResult.wavefunctions[n - 1]!;
    }

    return null;
  }

  /**
   * Get the wavefunction and probability density in nanometer units.
   * Converts from SI units (m^-1/2 and m^-1) to nm units (nm^-1/2 and nm^-1).
   *
   * @param n - The quantum number (1, 2, 3, ...)
   * @returns Object containing:
   *   - wavefunction: Array of wavefunction values in nm^-1/2
   *   - probabilityDensity: Array of probability density values in nm^-1
   *   - null if unavailable
   */
  public getWavefunctionInNmUnits(n: number): {
    wavefunction: number[];
    probabilityDensity: number[];
  } | null {
    const wavefunctionSI = this.getWavefunction(n);
    if (!wavefunctionSI) {
      return null;
    }

    // Convert wavefunction from m^-1/2 to nm^-1/2
    // For normalization to be preserved: ∫|ψ|² dx = 1
    // When dx → dx * M_TO_NM, then ψ → ψ / sqrt(M_TO_NM)
    // ψ(nm^-1/2) = ψ(m^-1/2) / sqrt(M_TO_NM)
    const conversionFactorWavefunction = Math.sqrt(QuantumConstants.M_TO_NM);
    const wavefunction = wavefunctionSI.map((psi) => psi / conversionFactorWavefunction);

    // Convert probability density from m^-1 to nm^-1
    // P(nm^-1) = |ψ(m^-1/2)|^2 / M_TO_NM
    const conversionFactorProbability = QuantumConstants.M_TO_NM;
    const probabilityDensity = wavefunctionSI.map((psi) => (psi * psi) / conversionFactorProbability);

    return {
      wavefunction,
      probabilityDensity,
    };
  }

  /**
   * Get the spatial grid points for wavefunctions.
   * @returns Array of x positions in nanometers
   */
  public getXGrid(): number[] | null {
    if (!this.boundStateResult) {
      this.calculateBoundStates();
    }

    if (this.boundStateResult) {
      // Convert from meters to nanometers
      return this.boundStateResult.xGrid.map((x) => x * QuantumConstants.M_TO_NM);
    }

    return null;
  }

  /**
   * Get the first derivative of the wavefunction for a specific quantum number.
   * Uses the analytical solution when available, which is more accurate than finite difference.
   * @param n - The quantum number (1, 2, 3, ...)
   * @param xGrid - Optional array of x positions in meters where derivatives should be evaluated.
   *                If not provided, uses the default grid from bound states.
   * @returns Array of first derivative values (in m^-3/2), or null if unavailable
   */
  public getWavefunctionFirstDerivative(n: number, xGrid?: number[]): number[] | null {
    if (!this.boundStateResult) {
      this.calculateBoundStates();
    }

    // Get analytical solution from solver
    const analyticalSolution = this.solver.getAnalyticalSolution();

    if (analyticalSolution && n > 0) {
      // Use xGrid parameter or default grid from bound states (converted to meters)
      const gridInMeters = xGrid || (this.boundStateResult?.xGrid ? this.boundStateResult.xGrid : null);

      if (!gridInMeters) {
        return null;
      }

      // Calculate using analytical solution (stateIndex is 0-indexed)
      return analyticalSolution.calculateWavefunctionFirstDerivative(n - 1, gridInMeters);
    }

    return null;
  }

  /**
   * Get the second derivative of the wavefunction for a specific quantum number.
   * Uses the analytical solution when available, which is more accurate than finite difference.
   * @param n - The quantum number (1, 2, 3, ...)
   * @param xGrid - Optional array of x positions in meters where derivatives should be evaluated.
   *                If not provided, uses the default grid from bound states.
   * @returns Array of second derivative values (in m^-5/2), or null if unavailable
   */
  public getWavefunctionSecondDerivative(n: number, xGrid?: number[]): number[] | null {
    if (!this.boundStateResult) {
      this.calculateBoundStates();
    }

    // Get analytical solution from solver
    const analyticalSolution = this.solver.getAnalyticalSolution();

    if (analyticalSolution && n > 0) {
      // Use xGrid parameter or default grid from bound states (converted to meters)
      const gridInMeters = xGrid || (this.boundStateResult?.xGrid ? this.boundStateResult.xGrid : null);

      if (!gridInMeters) {
        return null;
      }

      // Calculate using analytical solution (stateIndex is 0-indexed)
      return analyticalSolution.calculateWavefunctionSecondDerivative(n - 1, gridInMeters);
    }

    return null;
  }

  /**
   * Calculate the minimum and maximum values of a wavefunction in a given region.
   *
   * This method finds the extrema of an eigenstate wavefunction within the specified
   * spatial range. The wavefunction is sampled at multiple points to accurately
   * capture the minimum and maximum values and their x-positions.
   *
   * @param n - The quantum number (1, 2, 3, ...)
   * @param xMinNm - Left boundary of the region in nanometers
   * @param xMaxNm - Right boundary of the region in nanometers
   * @param numPoints - Number of points to sample (default: 1000)
   * @returns Object containing min/max values and extrema positions in nm, or null if unavailable
   */
  public getWavefunctionMinMax(
    n: number,
    xMinNm: number,
    xMaxNm: number,
    numPoints?: number,
  ): { min: number; max: number; extremaPositions: number[] } | null {
    if (!this.boundStateResult) {
      this.calculateBoundStates();
    }

    // Get analytical solution from solver
    const analyticalSolution = this.solver.getAnalyticalSolution();

    if (analyticalSolution && n > 0) {
      // Convert from nanometers to meters
      const xMinM = xMinNm * QuantumConstants.NM_TO_M;
      const xMaxM = xMaxNm * QuantumConstants.NM_TO_M;

      // Calculate using analytical solution (stateIndex is 0-indexed)
      const result = analyticalSolution.calculateWavefunctionMinMax(n - 1, xMinM, xMaxM, numPoints);

      // Convert extrema positions from meters back to nanometers
      const extremaPositionsNm = result.extremaPositions.map((xM) => xM * QuantumConstants.M_TO_NM);

      return {
        min: result.min,
        max: result.max,
        extremaPositions: extremaPositionsNm,
      };
    }

    return null;
  }

  /**
   * Calculate the minimum and maximum values of a time-evolved superposition.
   *
   * A quantum superposition is a linear combination of energy eigenstates:
   * Ψ(x,t) = Σ cₙ ψₙ(x) exp(-iEₙt/ℏ)
   *
   * This method evaluates the superposition at the given time within the specified
   * spatial region and returns the minimum and maximum values of the real part.
   *
   * @param coefficients - Complex coefficients for each eigenstate (as [real, imag] pairs)
   * @param timeFs - Time in femtoseconds
   * @param xMinNm - Left boundary of the region in nanometers
   * @param xMaxNm - Right boundary of the region in nanometers
   * @param numPoints - Number of points to sample (default: 1000)
   * @returns Object containing min and max values, or null if unavailable
   */
  public getSuperpositionMinMax(
    coefficients: Array<[number, number]>,
    timeFs: number,
    xMinNm: number,
    xMaxNm: number,
    numPoints?: number,
  ): { min: number; max: number } | null {
    if (!this.boundStateResult) {
      this.calculateBoundStates();
    }

    // Get analytical solution from solver
    const analyticalSolution = this.solver.getAnalyticalSolution();

    if (analyticalSolution && this.boundStateResult) {
      // Convert from nanometers to meters and femtoseconds to seconds
      const xMinM = xMinNm * QuantumConstants.NM_TO_M;
      const xMaxM = xMaxNm * QuantumConstants.NM_TO_M;
      const timeS = timeFs * 1e-15; // Convert femtoseconds to seconds

      // Use energies from bound state results
      const energies = this.boundStateResult.energies;

      // Calculate using analytical solution
      return analyticalSolution.calculateSuperpositionMinMax(coefficients, energies, timeS, xMinM, xMaxM, numPoints);
    }

    return null;
  }

  /**
   * Calculate the classical probability density for a given energy level.
   * This method provides a default implementation that can be overridden by subclasses.
   * @param energyIndex - Index of the energy level (0-indexed)
   * @returns Array of classical probability density values, or null if unavailable
   */
  public getClassicalProbabilityDensity(_energyIndex: number): number[] | null {
    // Subclasses must override this method to provide potential-specific implementations
    return null;
  }

  /**
   * Get the classical probability density in nanometer units.
   * Converts from SI units (m^-1) to nm units (nm^-1).
   *
   * @param energyIndex - Index of the energy level (0-indexed)
   * @returns Array of classical probability density values in nm^-1, or null if unavailable
   */
  public getClassicalProbabilityDensityInNmUnits(energyIndex: number): number[] | null {
    const classicalProbabilitySI = this.getClassicalProbabilityDensity(energyIndex);
    if (!classicalProbabilitySI) {
      return null;
    }

    // Convert classical probability density from m^-1 to nm^-1
    // For a density in units of [length]^-1:
    // P(nm^-1) = P(m^-1) * NM_TO_M = P(m^-1) / M_TO_NM
    // Example: For a 4nm well, P = 1/L = 0.25 nm^-1 = 0.25×10^9 m^-1
    const conversionFactor = QuantumConstants.NM_TO_M;
    return classicalProbabilitySI.map((p) => p * conversionFactor);
  }

  /**
   * Calculate the time-evolved superposition wavefunction.
   * Computes ψ(x,t) = Σ c_n * e^(iφ_n) * ψ_n(x) * e^(-iE_n*t/ℏ)
   *
   * @param timeInSeconds - Current time in seconds
   * @returns Object containing real part, imaginary part, magnitude, probability density arrays,
   *          or null if bound states are not available
   */
  public getTimeEvolvedSuperposition(timeInSeconds: number): {
    realPart: number[];
    imagPart: number[];
    magnitude: number[];
    probabilityDensity: number[];
    maxMagnitude: number;
  } | null {
    const boundStates = this.getBoundStates();
    if (!boundStates) {
      return null;
    }

    const config = this.getSuperpositionConfigForBoundStates(boundStates);
    const numPoints = boundStates.xGrid.length;

    // Initialize arrays
    const realPart = new Array(numPoints).fill(0);
    const imagPart = new Array(numPoints).fill(0);
    const magnitude = new Array(numPoints);
    const probabilityDensity = new Array(numPoints);

    // Compute time-evolved superposition: ψ(x,t) = Σ c_n * e^(iφ_n) * ψ_n(x) * e^(-iE_n*t/ℏ)
    for (let n = 0; n < config.amplitudes.length; n++) {
      const amplitude = config.amplitudes[n]!;
      const initialPhase = config.phases[n]!;

      if (amplitude === 0 || n >= boundStates.wavefunctions.length) {
        continue;
      }

      const eigenfunction = boundStates.wavefunctions[n]!;
      const energy = boundStates.energies[n]!;

      // Time evolution phase for this eigenstate: -E_n*t/ℏ
      const timePhase = -(energy * timeInSeconds) / QuantumConstants.HBAR;

      // Total phase: initial phase + time evolution phase
      const totalPhase = initialPhase + timePhase;

      // Complex coefficient: c_n * e^(i*totalPhase) = c_n * (cos(totalPhase) + i*sin(totalPhase))
      const realCoeff = amplitude * Math.cos(totalPhase);
      const imagCoeff = amplitude * Math.sin(totalPhase);

      // Add contribution to superposition
      for (let i = 0; i < numPoints; i++) {
        realPart[i] += realCoeff * eigenfunction[i]!;
        imagPart[i] += imagCoeff * eigenfunction[i]!;
      }
    }

    // Calculate magnitude and probability density
    let maxMagnitude = 0;
    for (let i = 0; i < numPoints; i++) {
      magnitude[i] = Math.sqrt(realPart[i] * realPart[i] + imagPart[i] * imagPart[i]);
      probabilityDensity[i] = realPart[i] * realPart[i] + imagPart[i] * imagPart[i];
      maxMagnitude = Math.max(maxMagnitude, magnitude[i]);
    }

    return {
      realPart,
      imagPart,
      magnitude,
      probabilityDensity,
      maxMagnitude,
    };
  }

  /**
   * Calculate the time-evolved superposition wavefunction in nanometer units.
   * Converts from SI units (m^-1/2 and m^-1) to nm units (nm^-1/2 and nm^-1).
   *
   * @param timeInSeconds - Current time in seconds
   * @returns Object containing:
   *   - realPart: Real part in nm^-1/2
   *   - imagPart: Imaginary part in nm^-1/2
   *   - magnitude: Magnitude in nm^-1/2
   *   - probabilityDensity: Probability density in nm^-1
   *   - maxMagnitude: Maximum magnitude value in nm^-1/2
   *   - null if bound states are not available
   */
  public getTimeEvolvedSuperpositionInNmUnits(timeInSeconds: number): {
    realPart: number[];
    imagPart: number[];
    magnitude: number[];
    probabilityDensity: number[];
    maxMagnitude: number;
  } | null {
    const result = this.getTimeEvolvedSuperposition(timeInSeconds);
    if (!result) {
      return null;
    }

    // Convert wavefunction components from m^-1/2 to nm^-1/2
    // For normalization: ∫|ψ|² dx = 1, when dx → dx * M_TO_NM, then ψ → ψ / sqrt(M_TO_NM)
    // ψ(nm^-1/2) = ψ(m^-1/2) / sqrt(M_TO_NM)
    const conversionFactorWavefunction = Math.sqrt(QuantumConstants.M_TO_NM);
    const realPart = result.realPart.map((val) => val / conversionFactorWavefunction);
    const imagPart = result.imagPart.map((val) => val / conversionFactorWavefunction);
    const magnitude = result.magnitude.map((val) => val / conversionFactorWavefunction);
    const maxMagnitude = result.maxMagnitude / conversionFactorWavefunction;

    // Convert probability density from m^-1 to nm^-1
    // P(nm^-1) = P(m^-1) / M_TO_NM
    const conversionFactorProbability = QuantumConstants.M_TO_NM;
    const probabilityDensity = result.probabilityDensity.map((val) => val / conversionFactorProbability);

    return {
      realPart,
      imagPart,
      magnitude,
      probabilityDensity,
      maxMagnitude,
    };
  }

  /**
   * Calculate the probability of finding the particle in a specified region.
   * Uses trapezoidal integration of the probability density.
   *
   * For single eigenstate: Uses |ψ_n(x)|²
   * For superposition: Uses time-evolved superposition probability density
   *
   * @param xStartNm - Start x position in nanometers
   * @param xEndNm - End x position in nanometers
   * @param energyIndex - Energy level index (0-indexed) for single eigenstate
   * @param timeInSeconds - Current time in seconds (for superposition)
   * @param isSuperposition - Whether to calculate for superposition or single state
   * @returns Probability as a percentage (0-100), or null if not available
   */
  public getProbabilityInRegion(
    xStartNm: number,
    xEndNm: number,
    energyIndex: number,
    timeInSeconds: number,
    isSuperposition: boolean,
  ): number | null {
    const boundStates = this.getBoundStates();
    if (!boundStates) {
      return null;
    }

    let probabilityDensity: number[];

    if (isSuperposition) {
      // Calculate time-evolved superposition probability density
      const superposition = this.getTimeEvolvedSuperposition(timeInSeconds);
      if (!superposition) {
        return null;
      }
      probabilityDensity = superposition.probabilityDensity;
    } else {
      // Single eigenstate
      if (energyIndex < 0 || energyIndex >= boundStates.wavefunctions.length) {
        return null;
      }

      const wavefunction = boundStates.wavefunctions[energyIndex]!;
      probabilityDensity = wavefunction.map((psi) => psi * psi);
    }

    // Integrate probability density in the region using trapezoidal rule
    const xGrid = boundStates.xGrid;
    let probability = 0;

    for (let i = 0; i < xGrid.length - 1; i++) {
      const x1 = xGrid[i]! * QuantumConstants.M_TO_NM; // Convert to nm
      const x2 = xGrid[i + 1]! * QuantumConstants.M_TO_NM;

      // Check if this segment overlaps with our region
      if (x2 >= xStartNm && x1 <= xEndNm) {
        // Calculate overlap
        const segmentStart = Math.max(x1, xStartNm);
        const segmentEnd = Math.min(x2, xEndNm);

        if (segmentEnd > segmentStart) {
          // Linearly interpolate probability density values at segment boundaries
          const t1 = (segmentStart - x1) / (x2 - x1);
          const t2 = (segmentEnd - x1) / (x2 - x1);

          const p1 = probabilityDensity[i]! * (1 - t1) + probabilityDensity[i + 1]! * t1;
          const p2 = probabilityDensity[i]! * (1 - t2) + probabilityDensity[i + 1]! * t2;

          // Trapezoidal rule
          const dx = segmentEnd - segmentStart;
          probability += 0.5 * (p1 + p2) * dx * QuantumConstants.NM_TO_M;
        }
      }
    }

    // Convert to percentage
    return probability * 100;
  }

  /**
   * Get the wavefunction value and derivatives at a specific position.
   * Uses analytical derivatives when available, falls back to finite difference.
   *
   * @param energyIndex - Energy level index (0-indexed)
   * @param xNm - Position in nanometers
   * @returns Object with wavefunction value and derivatives in nm units, or null if unavailable
   */
  public getWavefunctionAtPosition(
    energyIndex: number,
    xNm: number,
  ): {
    value: number;
    firstDerivative: number;
    secondDerivative: number;
  } | null {
    const boundStates = this.getBoundStates();
    if (!boundStates) {
      return null;
    }

    if (energyIndex < 0 || energyIndex >= boundStates.wavefunctions.length) {
      return null;
    }

    const xGrid = boundStates.xGrid;
    const wavefunction = boundStates.wavefunctions[energyIndex]!;

    // Convert xNm from nm to m
    const xInM = xNm * QuantumConstants.NM_TO_M;

    // Find the grid points surrounding xNm for interpolation
    let i1 = -1;
    for (let i = 0; i < xGrid.length - 1; i++) {
      if (xGrid[i]! <= xInM && xInM <= xGrid[i + 1]!) {
        i1 = i;
        break;
      }
    }

    if (i1 === -1) {
      return null;
    }

    // Need at least one point on each side for derivatives
    if (i1 === 0 || i1 >= xGrid.length - 2) {
      return null;
    }

    // Interpolate wavefunction value at xNm (in SI units: m^-1/2)
    const t = (xInM - xGrid[i1]!) / (xGrid[i1 + 1]! - xGrid[i1]!);
    const valueInM = wavefunction[i1]! * (1 - t) + wavefunction[i1 + 1]! * t;

    // Convert wavefunction value from m^-1/2 to nm^-1/2
    // For normalization: ∫|ψ|² dx = 1, when dx → dx * M_TO_NM, then ψ → ψ / sqrt(M_TO_NM)
    const value = valueInM / Math.sqrt(QuantumConstants.M_TO_NM);

    // Try to use analytical solution for first derivative (more accurate)
    const firstDerivativeArray = this.getWavefunctionFirstDerivative(energyIndex + 1, [xInM]);

    let firstDerivativeInNm: number;

    if (firstDerivativeArray && firstDerivativeArray.length > 0) {
      // Analytical solution available for first derivative
      const firstDerivativeInM = firstDerivativeArray[0]!;

      // Convert derivative: dψ/dx from [m^-3/2] to [nm^-3/2]
      // ψ → ψ / sqrt(M_TO_NM), x → x × M_TO_NM
      // dψ/dx → (dψ/dx) / [sqrt(M_TO_NM) × M_TO_NM] = (dψ/dx) / M_TO_NM^(3/2)
      firstDerivativeInNm = firstDerivativeInM / QuantumConstants.M_TO_NM ** 1.5;
    } else {
      // Fall back to finite difference for first derivative
      // Using forward difference: f'(x) ≈ (f(x+h) - f(x)) / h
      const h = xGrid[1]! - xGrid[0]!;
      const psiLeft = wavefunction[i1]!;
      const psiRight = wavefunction[i1 + 1]!;
      const firstDerivativeInM = (psiRight - psiLeft) / h;

      // Convert derivative: dψ/dx from [m^-3/2] to [nm^-3/2]
      // ψ → ψ / sqrt(M_TO_NM), x → x × M_TO_NM
      // dψ/dx → (dψ/dx) / [sqrt(M_TO_NM) × M_TO_NM] = (dψ/dx) / M_TO_NM^(3/2)
      firstDerivativeInNm = firstDerivativeInM / QuantumConstants.M_TO_NM ** 1.5;
    }

    // Try to use analytical solution for second derivative (more accurate)
    const secondDerivativeArray = this.getWavefunctionSecondDerivative(energyIndex + 1, [xInM]);

    let secondDerivativeInNm: number;

    if (secondDerivativeArray && secondDerivativeArray.length > 0) {
      // Analytical solution available for second derivative
      const secondDerivativeInM = secondDerivativeArray[0]!;

      // Convert second derivative: d²ψ/dx² from [m^-5/2] to [nm^-5/2]
      // ψ → ψ / sqrt(M_TO_NM), x → x × M_TO_NM
      // d²ψ/dx² → (d²ψ/dx²) / [sqrt(M_TO_NM) × M_TO_NM²] = (d²ψ/dx²) / M_TO_NM^(5/2)
      secondDerivativeInNm = secondDerivativeInM / QuantumConstants.M_TO_NM ** 2.5;
    } else {
      // Fall back to finite differences for second derivative: central differences
      // f''(x_i) ≈ (f(x_{i-1}) - 2f(x_i) + f(x_{i+1})) / h² at the two grid points bracketing x,
      // linearly interpolated to x (i1 ≥ 1 and i1 + 2 < length are guaranteed above)
      const h = xGrid[1]! - xGrid[0]!;
      const secondDerivativeAt = (i: number): number =>
        (wavefunction[i - 1]! - 2 * wavefunction[i]! + wavefunction[i + 1]!) / (h * h);
      const secondDerivativeInM = secondDerivativeAt(i1) * (1 - t) + secondDerivativeAt(i1 + 1) * t;

      // Convert second derivative: d²ψ/dx² from [m^-5/2] to [nm^-5/2]
      // ψ → ψ / sqrt(M_TO_NM), x → x × M_TO_NM
      // d²ψ/dx² → (d²ψ/dx²) / [sqrt(M_TO_NM) × M_TO_NM²] = (d²ψ/dx²) / M_TO_NM^(5/2)
      secondDerivativeInNm = secondDerivativeInM / QuantumConstants.M_TO_NM ** 2.5;
    }

    // A degenerate solution (e.g. a collapsed grid) can yield non-finite values; report "unavailable"
    if (!(Number.isFinite(value) && Number.isFinite(firstDerivativeInNm) && Number.isFinite(secondDerivativeInNm))) {
      return null;
    }

    return {
      value,
      firstDerivative: firstDerivativeInNm,
      secondDerivative: secondDerivativeInNm,
    };
  }
}
