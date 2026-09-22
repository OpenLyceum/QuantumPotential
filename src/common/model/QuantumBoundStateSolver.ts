/**
 * Advanced Quantum Bound State Solver for the Time-Independent Schrodinger Equation
 *
 * Features:
 * - Inward-Outward shooting method with adaptive energy bracketing
 * - Logarithmic derivative integration for enhanced stability (y = ψ'/ψ method)
 * - 6th-order accurate Numerov integration (alternative to log derivative)
 * - Automatic symmetry detection and parity-based eigenvalue finding
 * - Automatic matching point optimization
 * - Richardson extrapolation for improved accuracy
 * - Cached computations for performance
 *
 * Algorithm improvements:
 * 1. Logarithmic derivative method: Integrates y = ψ'/ψ using dy/dx = 2m/ℏ²[V(x)-E] - y²
 *    This avoids exponential growth in classically forbidden regions
 * 2. Inward-outward integration: Integrates from both boundaries and matches at x_m
 * 3. Symmetry exploitation: For symmetric potentials, uses parity (even/odd) to improve convergence
 * 4. Node counting: Ground state has 0 nodes, first excited has 1 node, etc.
 *
 * The TISE is: -ℏ²/(2m) d²ψ/dx² + V(x)ψ = Eψ
 * Rearranged as: d²ψ/dx² = -k²(x)ψ where k²(x) = 2m(E - V(x))/ℏ²
 */

import qppw from "../../QPPWNamespace.js";
import PerformanceMonitor from "../utils/PerformanceMonitor.js";
import type { BoundStateResult, GridConfig, PotentialFunction } from "./PotentialFunction.js";
import QuantumConstants from "./QuantumConstants.js";

// ============================================================================
// Constants
// ============================================================================

// Numerical method constants
const DEFAULT_MAX_ITERATIONS = 100;
const DEFAULT_CONVERGENCE_TOLERANCE = 1e-10;
const DEFAULT_ENERGY_TOLERANCE = 1e-12;
const DEFAULT_WAVE_FUNCTION_TOLERANCE = 1e-8;

// Integration constants
const NUMEROV_COEFFICIENT = 1.0 / 12.0; // h^2/12 factor in Numerov method
const MATCHING_POINT_FRACTION = 0.45; // Matching point fraction for shooting method

// Boundary condition constants
const BOUNDARY_PSI_INITIAL = 0.0; // psi(boundary) = 0
const BOUNDARY_PSI_DERIVATIVE = 1.0; // Initial derivative (will be normalized)

// Logarithmic derivative integration constants
const SYMMETRY_TOLERANCE = 1e-10; // Tolerance for detecting symmetric potentials

// Performance constants
const CACHE_SIZE_LIMIT = 100;

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Solver configuration options (internal)
 */
type SolverConfig = {
  maxIterations?: number;
  convergenceTolerance?: number;
  energyTolerance?: number;
  waveFunctionTolerance?: number;
  adaptiveMatching?: boolean;
  useRichardsonExtrapolation?: boolean;
  normalizationMethod?: "max" | "l2";
  enableCaching?: boolean;
  useLogDerivativeMethod?: boolean; // Use logarithmic derivative integration for stability
  useSymmetry?: boolean; // Exploit potential symmetry for better convergence
};

/**
 * Detailed solution information (internal)
 */
type QuantumState = {
  energy: number;
  waveFunction: number[];
  nodes: number;
  normalizationConstant: number;
  matchingPoint: number;
  convergenceMetric: number;
};

/**
 * Integration result with detailed metrics
 */
class IntegrationResult {
  public readonly nodeCount: number;
  public readonly logDerivativeMismatch: number;
  public readonly matchingAmplitude: number;

  constructor(nodeCount: number, logDerivativeMismatch: number, matchingAmplitude: number = 0) {
    this.nodeCount = nodeCount;
    this.logDerivativeMismatch = logDerivativeMismatch;
    this.matchingAmplitude = matchingAmplitude;
  }

  hasTooManyNodes(desiredNodes: number): boolean {
    return this.nodeCount > desiredNodes || (this.nodeCount === desiredNodes && this.logDerivativeMismatch < 0.0);
  }

  get isConverged(): boolean {
    return Math.abs(this.logDerivativeMismatch) < DEFAULT_CONVERGENCE_TOLERANCE;
  }
}

/**
 * Cache entry for memoization
 */
type CacheEntry<T> = {
  value: T;
};

/**
 * Custom exception for solver errors (internal)
 */
class QuantumSolverException extends Error {
  public readonly code: string;

  constructor(message: string, code: string = "QUANTUM_SOLVER_ERROR") {
    super(message);
    this.code = code;
    this.name = "QuantumSolverException";
    Object.setPrototypeOf(this, QuantumSolverException.prototype);
  }
}

/**
 * Exception thrown when attempting to find a bound state that doesn't exist
 * (energy exceeds maximum potential) (internal)
 */
class InvalidBoundStateException extends Error {
  public readonly stateNumber: number;
  public readonly energy: number;
  public readonly maxPotential: number;

  constructor(message: string, stateNumber: number, energy: number, maxPotential: number) {
    super(message);
    this.stateNumber = stateNumber;
    this.energy = energy;
    this.maxPotential = maxPotential;
    this.name = "InvalidBoundStateException";
    Object.setPrototypeOf(this, InvalidBoundStateException.prototype);
  }
}

// ============================================================================
// Main Solver Class
// ============================================================================

export class QuantumBoundStateSolver {
  // Configuration
  private readonly maxIterations: number;
  private readonly convergenceTolerance: number;
  private readonly energyTolerance: number;
  private readonly waveFunctionTolerance: number;
  private readonly adaptiveMatching: boolean;
  private readonly useRichardsonExtrapolation: boolean;
  private readonly normalizationMethod: "max" | "l2";
  private readonly enableCaching: boolean;
  private readonly useLogDerivativeMethod: boolean;

  // Grid properties
  private readonly deltaX: number;
  private readonly gridPositions: number[];
  private readonly potentialEnergies: number[];
  private readonly hbarSquaredOver2m: number;
  private gridPoints: number;

  // Cache
  private readonly cache: Map<string, CacheEntry<unknown>>;
  private readonly numerovFactorCache: Map<number, number>;

  // Cached node transition energies for efficient multi-state solving
  private nodeTransitionEnergies: number[] | null = null;

  // Optimal matching point computed from potential structure
  private optimalMatchPoint: number;

  // Cached maximum potential for bound state validation
  private readonly maxPotential: number;

  // Symmetry properties
  private readonly isSymmetric: boolean;
  private readonly symmetryCenter: number;

  private readonly potentialFunction: PotentialFunction;

  /**
   * Constructor for the Enhanced Quantum Bound State Solver
   *
   * @param mass - Particle mass in kg
   * @param xMin - Minimum x value in meters
   * @param xMax - Maximum x value in meters
   * @param numPoints - Number of grid points
   * @param potentialFunction - Function V(x) returning potential in Joules
   * @param config - Optional solver configuration
   */
  constructor(
    mass: number,
    xMin: number,
    xMax: number,
    numPoints: number,
    potentialFunction: PotentialFunction,
    config?: SolverConfig,
  ) {
    this.potentialFunction = potentialFunction;
    const { HBAR } = QuantumConstants;
    this.hbarSquaredOver2m = (HBAR * HBAR) / (2 * mass);
    this.gridPoints = numPoints;

    // Validate inputs
    this.validateInputs(xMin, xMax, numPoints);

    // Set configuration with defaults
    this.maxIterations = config?.maxIterations ?? DEFAULT_MAX_ITERATIONS;
    this.convergenceTolerance = config?.convergenceTolerance ?? DEFAULT_CONVERGENCE_TOLERANCE;
    this.energyTolerance = config?.energyTolerance ?? DEFAULT_ENERGY_TOLERANCE;
    this.waveFunctionTolerance = config?.waveFunctionTolerance ?? DEFAULT_WAVE_FUNCTION_TOLERANCE;
    this.adaptiveMatching = config?.adaptiveMatching ?? true;
    this.useRichardsonExtrapolation = config?.useRichardsonExtrapolation ?? false;
    this.normalizationMethod = config?.normalizationMethod ?? "l2";
    this.enableCaching = config?.enableCaching ?? true;
    this.useLogDerivativeMethod = config?.useLogDerivativeMethod ?? false; // Disabled by default (experimental)

    // Pre-calculate grid properties
    this.deltaX = (xMax - xMin) / (numPoints - 1);
    this.gridPositions = this.calculateGridPositions(xMin, xMax, numPoints);
    this.potentialEnergies = this.calculatePotentialOnGrid();

    // Cache maximum potential for bound state validation
    this.maxPotential = Math.max(...this.potentialEnergies);

    // Compute optimal matching point based on potential structure
    this.optimalMatchPoint = this.computeOptimalMatchPoint();

    // Detect potential symmetry
    const symmetryInfo = this.detectSymmetry();
    this.isSymmetric = symmetryInfo.isSymmetric;
    this.symmetryCenter = symmetryInfo.center;

    // Initialize caches
    this.cache = new Map();
    this.numerovFactorCache = new Map();
  }

  /**
   * Computes optimal matching point by finding center of leftmost well region.
   * This places the matching point where the wavefunction has significant amplitude.
   */
  private computeOptimalMatchPoint(): number {
    const minPotential = Math.min(...this.potentialEnergies);
    const tolerance = (this.maxPotential - minPotential) * 0.01; // 1% tolerance

    // Find the first (leftmost) region where potential is at minimum
    let wellStart = -1;
    let wellEnd = -1;

    for (let i = 0; i < this.gridPoints; i++) {
      const isInWell = this.potentialEnergies[i]! <= minPotential + tolerance;

      if (isInWell && wellStart === -1) {
        wellStart = i;
      }
      if (!isInWell && wellStart !== -1 && wellEnd === -1) {
        wellEnd = i - 1;
        break; // Found first well, stop
      }
    }

    // Handle case where well extends to end of grid
    if (wellStart !== -1 && wellEnd === -1) {
      wellEnd = this.gridPoints - 1;
    }

    // If we found a well, use a point 3/4 through it (closer to right edge)
    // This gives more room for forward integration while staying in the well
    if (wellStart !== -1 && wellEnd !== -1) {
      return Math.floor(wellStart + 0.75 * (wellEnd - wellStart));
    }

    // Fallback to default fraction
    return Math.floor(this.gridPoints * MATCHING_POINT_FRACTION);
  }

  /**
   * Detects if the potential is symmetric about its center.
   * Returns symmetry information including center point.
   */
  private detectSymmetry(): { isSymmetric: boolean; center: number } {
    const xMin = this.gridPositions[0]!;
    const xMax = this.gridPositions[this.gridPoints - 1]!;
    const center = (xMin + xMax) / 2.0;

    // Check if potential is symmetric about center
    let maxAsymmetry = 0;
    for (let i = 0; i < this.gridPoints / 2; i++) {
      const leftIdx = i;
      const rightIdx = this.gridPoints - 1 - i;
      const asymmetry = Math.abs(this.potentialEnergies[leftIdx]! - this.potentialEnergies[rightIdx]!);
      maxAsymmetry = Math.max(maxAsymmetry, asymmetry);
    }

    // Get potential scale for relative comparison
    const potentialRange = this.maxPotential - Math.min(...this.potentialEnergies);
    const relativeAsymmetry = potentialRange > 0 ? maxAsymmetry / potentialRange : maxAsymmetry;

    const isSymmetric = relativeAsymmetry < SYMMETRY_TOLERANCE;

    return { isSymmetric, center };
  }

  // ========================================================================
  // Public API
  // ========================================================================

  /**
   * Finds the nth eigenstate (energy and wavefunction)
   */
  public findEigenstate(n: number): QuantumState {
    return PerformanceMonitor.measure(`find-eigenstate-${n}`, () => {
      const desiredNodes = n - 1; // nth state has n-1 nodes

      // Check cache first
      const cacheKey = `eigenstate_${n}`;
      if (this.enableCaching) {
        const cached = this.getFromCache<QuantumState>(cacheKey);
        if (cached) {
          return cached;
        }
      }

      // Find energy
      const energy = this.findEnergyEigenvalue(desiredNodes);

      // Validate that this is a true bound state (energy must be below maximum potential)
      if (energy >= this.maxPotential) {
        throw new InvalidBoundStateException(
          `State ${n} with energy ${energy} is not a bound state: energy exceeds maximum potential ${this.maxPotential}`,
          n,
          energy,
          this.maxPotential,
        );
      }

      // Calculate wavefunction
      const waveFunction = this.calculateNormalizedWaveFunction(energy);

      // Determine optimal matching point
      const matchingPoint = this.adaptiveMatching
        ? this.findOptimalMatchingPoint(energy)
        : Math.floor(this.gridPoints * MATCHING_POINT_FRACTION);

      // Calculate normalization constant
      const normalizationConstant = this.calculateNormalizationConstant(waveFunction);

      // Verify solution quality
      const convergenceMetric = this.calculateConvergenceMetric(energy);

      const state: QuantumState = {
        energy,
        waveFunction,
        nodes: desiredNodes,
        normalizationConstant,
        matchingPoint,
        convergenceMetric,
      };

      // Cache the result
      if (this.enableCaching) {
        this.addToCache(cacheKey, state);
      }

      return state;
    });
  }

  /**
   * Finds multiple eigenstates efficiently.
   * Stops when bound states are exhausted (energy exceeds maximum potential).
   */
  public findMultipleEigenstates(nStates: number): QuantumState[] {
    return PerformanceMonitor.measure(`find-multiple-eigenstates-${nStates}`, () => {
      const states: QuantumState[] = [];

      for (let n = 1; n <= nStates; n++) {
        try {
          states.push(this.findEigenstate(n));
        } catch (error) {
          // Stop when we've exhausted all bound states
          if (error instanceof InvalidBoundStateException) {
            break;
          }
          throw error;
        }
      }

      // Sort states by energy to ensure correct ordering
      states.sort((a, b) => a.energy - b.energy);

      // Remove duplicate energies (keep only unique states)
      // Use relative tolerance based on energy scale
      const uniqueStates: QuantumState[] = [];
      for (const state of states) {
        if (uniqueStates.length === 0) {
          uniqueStates.push(state);
        } else {
          const prevEnergy = uniqueStates[uniqueStates.length - 1]!.energy;
          const relDiff = Math.abs(state.energy - prevEnergy) / Math.max(Math.abs(prevEnergy), 1e-20);
          if (relDiff > 1e-6) {
            // 0.0001% relative difference
            uniqueStates.push(state);
          }
        }
      }

      return uniqueStates;
    });
  }

  /**
   * Returns the maximum potential energy (useful for determining bound state limit)
   */
  public getMaxPotential(): number {
    return this.maxPotential;
  }

  /**
   * Returns the grid positions
   */
  public getGridPositions(): number[] {
    return this.gridPositions.slice();
  }

  /**
   * Returns whether the potential is symmetric
   */
  public isPotentialSymmetric(): boolean {
    return this.isSymmetric;
  }

  /**
   * Returns the symmetry center of the potential
   */
  public getSymmetryCenter(): number {
    return this.symmetryCenter;
  }

  /**
   * Clears all caches
   */
  public clearCache(): void {
    this.cache.clear();
    this.numerovFactorCache.clear();
    this.nodeTransitionEnergies = null;
  }

  // ========================================================================
  // Core Algorithm Methods
  // ========================================================================

  /**
   * Enhanced energy eigenvalue finder with adaptive bracketing
   */
  private findEnergyEigenvalue(desiredNodes: number): number {
    // Get initial energy bounds
    const { lowerBound, upperBound } = this.findEnergyBounds(desiredNodes);

    // Check for invalid bounds - no bound state exists for this node count
    if (lowerBound >= upperBound || lowerBound >= this.maxPotential) {
      // Return maxPotential to trigger the bound state validation check
      return this.maxPotential;
    }

    // Binary search with Richardson extrapolation if enabled
    let energy: number;
    if (this.useRichardsonExtrapolation) {
      energy = this.findEnergyWithRichardson(lowerBound, upperBound, desiredNodes);
    } else {
      energy = this.findEnergyWithBinarySearch(lowerBound, upperBound, desiredNodes);
    }

    // Fine-tune with secant method
    energy = this.refineEnergyWithSecant(energy);

    return energy;
  }

  /**
   * Finds all node transition energies by sweeping through the energy range.
   * This is called once and cached for efficiency when finding multiple eigenstates.
   *
   * Key principle: All bound state energies lie between minPotential and maxPotential.
   * We track node count to determine eigenstate order (n-th state has n-1 nodes).
   */
  private findNodeTransitionEnergies(maxNodes: number): number[] {
    const boxLength = this.gridPositions[this.gridPoints - 1]! - this.gridPositions[0]!;
    const minPotential = Math.min(...this.potentialEnergies);
    const maxPotential = Math.max(...this.potentialEnergies);

    // Estimate for energy scale (particle in a box)
    const energyScale = (this.hbarSquaredOver2m * Math.PI * Math.PI) / (boxLength * boxLength);

    // Energy range for bound states
    const energyRange = maxPotential - minPotential;

    // Use fine energy steps to avoid missing closely-spaced levels (e.g., doublets in double wells)
    const numSteps = Math.max(1000, maxNodes * 100);
    const energyStep = energyRange / numSteps;

    // Use computed optimal matching point for consistent node counting during the sweep
    // This is critical - adaptive matching causes erratic node counts
    const fixedMatchPoint = this.optimalMatchPoint;

    // Start well below minimum potential to ensure 0 nodes
    let energy = minPotential - energyScale * 10;

    // Find energy with 0 nodes
    let test = this.integrateSchrodinger(energy, fixedMatchPoint);
    while (test.nodeCount > 0 && energy > minPotential - energyScale * 1000) {
      energy -= energyScale * 10;
      test = this.integrateSchrodinger(energy, fixedMatchPoint);
    }

    // Initialize transitions array with starting energy (below ground state)
    const transitions: number[] = [energy];
    let currentNodes = 0;
    let prevEnergy = energy;

    // Sweep from below minPotential up to maxPotential
    // Bound states must have E < maxPotential
    const maxIterations = numSteps * 2;
    for (let iter = 0; iter < maxIterations && currentNodes <= maxNodes; iter++) {
      energy += energyStep;

      // Stop at maxPotential - no bound states above this
      if (energy >= maxPotential) {
        break;
      }

      test = this.integrateSchrodinger(energy, fixedMatchPoint);
      const nodeCount = test.nodeCount;

      // Check for node transition
      if (nodeCount > currentNodes) {
        // Use binary search to find precise transition point
        let lo = prevEnergy;
        let hi = energy;
        for (let j = 0; j < 40; j++) {
          const mid = (lo + hi) / 2;
          const midTest = this.integrateSchrodinger(mid, fixedMatchPoint);
          if (midTest.nodeCount > currentNodes) {
            hi = mid;
          } else {
            lo = mid;
          }
        }
        const transitionEnergy = (lo + hi) / 2;

        // Fill in any skipped transitions
        while (transitions.length <= nodeCount) {
          transitions.push(transitionEnergy);
        }
        currentNodes = nodeCount;
      }

      prevEnergy = energy;
    }

    // Add a final transition at maxPotential to mark the end of bound states
    transitions.push(maxPotential);

    // Ensure transitions are monotonically increasing (fix numerical issues)
    for (let i = 1; i < transitions.length; i++) {
      if (transitions[i]! < transitions[i - 1]!) {
        transitions[i] = transitions[i - 1]!;
      }
    }

    return transitions;
  }

  /**
   * Finds energy bounds using cached node transition energies.
   *
   * The key insight is that as energy increases, the number of nodes in the
   * wavefunction increases monotonically. For state n with (n-1) nodes, we need
   * to find the energy range where the node count transitions from (n-2) to (n-1) to n.
   */
  private findEnergyBounds(desiredNodes: number): {
    lowerBound: number;
    upperBound: number;
  } {
    // Build or retrieve cached transition energies
    if (!this.nodeTransitionEnergies || this.nodeTransitionEnergies.length <= desiredNodes + 1) {
      this.nodeTransitionEnergies = this.findNodeTransitionEnergies(desiredNodes + 5);
    }

    const minPotential = Math.min(...this.potentialEnergies);

    let lowerBound: number;
    let upperBound: number;

    // Use transition energies for bracketing
    if (this.nodeTransitionEnergies.length > desiredNodes + 1) {
      // Lower bound: energy where we transition TO desiredNodes
      // Upper bound: energy where we transition TO desiredNodes+1
      lowerBound = this.nodeTransitionEnergies[desiredNodes]!;
      upperBound = this.nodeTransitionEnergies[desiredNodes + 1]!;
    } else if (this.nodeTransitionEnergies.length > desiredNodes) {
      // We have the lower transition but not upper - use maxPotential as upper
      lowerBound = this.nodeTransitionEnergies[desiredNodes]!;
      upperBound = this.maxPotential;
    } else {
      // No transition found for this node count - no bound state exists
      lowerBound = this.maxPotential;
      upperBound = this.maxPotential;
    }

    // Ensure lower bound is at least minPotential
    if (lowerBound < minPotential) {
      lowerBound = minPotential;
    }

    // Ensure valid bounds
    if (lowerBound >= upperBound) {
      // No valid bracket - this state likely doesn't exist
      return { lowerBound: this.maxPotential, upperBound: this.maxPotential };
    }

    return { lowerBound, upperBound };
  }

  /**
   * Binary search for energy
   */
  private findEnergyWithBinarySearch(lowerBound: number, upperBound: number, desiredNodes: number): number {
    let lower = lowerBound;
    let upper = upperBound;
    let energy = 0.5 * (lower + upper); // Initialize to midpoint

    // Use computed optimal match point for consistent node counting with transition detection
    const fixedMatchPoint = this.optimalMatchPoint;

    for (let i = 0; i < this.maxIterations; i++) {
      energy = 0.5 * (lower + upper);
      const test = this.integrateSchrodinger(energy, fixedMatchPoint);

      // Check for invalid integration results
      if (!Number.isFinite(test.logDerivativeMismatch)) {
        // Try a different energy if integration fails
        if (test.nodeCount > desiredNodes) {
          upper = energy;
        } else {
          lower = energy;
        }
        continue;
      }

      if (test.isConverged) {
        break;
      }

      if (test.hasTooManyNodes(desiredNodes)) {
        upper = energy;
      } else {
        lower = energy;
      }

      if (Math.abs(upper - lower) < this.energyTolerance) {
        break;
      }
    }

    return energy;
  }

  /**
   * Richardson extrapolation for improved accuracy
   */
  private findEnergyWithRichardson(lowerBound: number, upperBound: number, desiredNodes: number): number {
    // Get energy at current grid resolution
    const energy1 = this.findEnergyWithBinarySearch(lowerBound, upperBound, desiredNodes);

    // Temporarily double grid points
    const originalGridPoints = this.gridPoints;
    this.gridPoints = originalGridPoints * 2;
    const energy2 = this.findEnergyWithBinarySearch(lowerBound, upperBound, desiredNodes);
    this.gridPoints = originalGridPoints;

    // Richardson extrapolation formula
    return energy2 + (energy2 - energy1) / 3.0;
  }

  /**
   * Secant method for final energy refinement.
   *
   * The secant method finds roots of f(E) = logDerivativeMismatch by iteratively
   * approximating the derivative using two previous points:
   *   E_new = E_current - f(E_current) * (E_current - E_previous) / (f(E_current) - f(E_previous))
   *
   * This converges faster than bisection (superlinear) while avoiding the need
   * for analytical derivatives.
   */
  private refineEnergyWithSecant(initialEnergy: number): number {
    // Initialize with two energy guesses bracketing the solution
    // These are slightly perturbed from the initial estimate
    let energyPrevious = initialEnergy * 0.999; // Previous energy iterate
    let energyCurrent = initialEnergy * 1.001; // Current energy iterate

    // Use computed optimal match point for consistent node counting
    const fixedMatchPoint = this.optimalMatchPoint;

    // Evaluate the mismatch function at both initial points
    // f(E) = log derivative mismatch, which should be zero at the true eigenvalue
    let mismatchPrevious = this.integrateSchrodinger(energyPrevious, fixedMatchPoint).logDerivativeMismatch;
    let mismatchCurrent = this.integrateSchrodinger(energyCurrent, fixedMatchPoint).logDerivativeMismatch;

    // Secant iteration: refine energy until convergence
    for (let iteration = 0; iteration < 10; iteration++) {
      // Check if the denominator (slope approximation) is too small
      // This would cause numerical instability in the secant formula
      const mismatchDifference = mismatchCurrent - mismatchPrevious;
      if (Math.abs(mismatchDifference) < this.convergenceTolerance) {
        break;
      }

      // Apply the secant formula to compute the next energy estimate
      // This approximates Newton's method using finite differences
      const energyNext = energyCurrent - (mismatchCurrent * (energyCurrent - energyPrevious)) / mismatchDifference;

      // Evaluate the mismatch at the new energy
      const mismatchNext = this.integrateSchrodinger(energyNext, fixedMatchPoint).logDerivativeMismatch;

      // Check for convergence: mismatch is essentially zero
      if (Math.abs(mismatchNext) < this.convergenceTolerance) {
        return energyNext;
      }

      // Shift the iteration window: current becomes previous, next becomes current
      // This maintains the two-point history needed for the secant approximation
      energyPrevious = energyCurrent;
      mismatchPrevious = mismatchCurrent;
      energyCurrent = energyNext;
      mismatchCurrent = mismatchNext;
    }

    return energyCurrent;
  }

  /**
   * Enhanced Schrodinger equation integration with optimizations
   * @param energy - Energy to integrate at
   * @param useFixedMatchPoint - If provided, use this fixed match point instead of adaptive
   */
  private integrateSchrodinger(energy: number, useFixedMatchPoint?: number): IntegrationResult {
    // Use logarithmic derivative method if enabled (more stable)
    if (this.useLogDerivativeMethod) {
      return this.integrateSchrodingerLogDeriv(energy, useFixedMatchPoint);
    }

    // Otherwise use standard Numerov method
    const matchPoint =
      useFixedMatchPoint !== undefined
        ? useFixedMatchPoint
        : this.adaptiveMatching
          ? this.findOptimalMatchingPoint(energy)
          : this.optimalMatchPoint;

    const numerovFactor = this.getNumerovFactor();
    const inverseHbar2Over2m = 1.0 / this.hbarSquaredOver2m;

    // Pre-calculate effective potential
    const effectivePotential = this.potentialEnergies.map((V) => inverseHbar2Over2m * (V - energy));

    // Forward integration
    const forwardResult = this.integrateForward(effectivePotential, numerovFactor, matchPoint);

    // Backward integration
    const backwardResult = this.integrateBackward(effectivePotential, numerovFactor, matchPoint);

    // Calculate total nodes
    const nodeCount = forwardResult.nodes + backwardResult.nodes;

    // Calculate log derivative mismatch
    const logDerivativeMismatch = forwardResult.logDerivative + backwardResult.logDerivative;

    // Calculate matching amplitude for quality assessment
    const matchingAmplitude = Math.abs(forwardResult.psiAtMatch);

    return new IntegrationResult(nodeCount, logDerivativeMismatch, matchingAmplitude);
  }

  /**
   * Forward integration using Numerov method with periodic renormalization
   */
  private integrateForward(
    effectivePotential: number[],
    numerovFactor: number,
    matchPoint: number,
  ): { nodes: number; logDerivative: number; psiAtMatch: number } {
    let psiPrev: number;
    let psiCurrent = BOUNDARY_PSI_INITIAL;
    let psiNext = BOUNDARY_PSI_DERIVATIVE;

    let nodes = 0;
    const psiValues: number[] = [psiCurrent, psiNext];
    let scaleFactor = 1.0;

    // Renormalization threshold to prevent overflow
    const RENORM_THRESHOLD = 1e10;

    for (let i = 2; i <= matchPoint + 1; i++) {
      psiPrev = psiCurrent;
      psiCurrent = psiNext;

      // Numerov recursion - indices must match wavefunction indices
      // psi_prev = psi[i-2], psi_current = psi[i-1], psi_next = psi[i]
      psiNext = this.numerovStep(
        psiCurrent,
        psiPrev,
        effectivePotential[i - 2]!,
        effectivePotential[i - 1]!,
        effectivePotential[i]!,
        numerovFactor,
      );

      // Periodic renormalization to prevent overflow
      if (Math.abs(psiNext) > RENORM_THRESHOLD) {
        const norm = Math.abs(psiNext);
        psiCurrent /= norm;
        psiNext /= norm;
        scaleFactor *= norm;
        // Renormalize stored values
        for (let j = 0; j < psiValues.length; j++) {
          psiValues[j]! /= norm;
        }
      }

      psiValues.push(psiNext);

      // Count nodes
      if (i <= matchPoint && this.isNode(psiCurrent, psiNext)) {
        nodes++;
      }
    }

    // Calculate log derivative using three-point formula
    const logDerivative = this.calculateLogDerivative(
      psiValues[matchPoint - 1]!,
      psiValues[matchPoint]!,
      psiValues[matchPoint + 1]!,
    );

    return {
      nodes,
      logDerivative,
      psiAtMatch: psiValues[matchPoint]! * scaleFactor,
    };
  }

  /**
   * Backward integration using Numerov method with periodic renormalization
   */
  private integrateBackward(
    effectivePotential: number[],
    numerovFactor: number,
    matchPoint: number,
  ): { nodes: number; logDerivative: number; psiAtMatch: number } {
    let psiPrev = BOUNDARY_PSI_INITIAL;
    let psiCurrent = BOUNDARY_PSI_INITIAL;
    let psiNext = BOUNDARY_PSI_DERIVATIVE;

    let nodes = 0;
    const psiValues: number[] = new Array(this.gridPoints).fill(0);
    psiValues[this.gridPoints - 1] = psiPrev;
    psiValues[this.gridPoints - 2] = psiCurrent;
    let scaleFactor = 1.0;

    // Renormalization threshold to prevent overflow
    const RENORM_THRESHOLD = 1e10;

    for (let i = this.gridPoints - 3; i >= matchPoint - 1; i--) {
      psiPrev = psiCurrent;
      psiCurrent = psiNext;

      // Numerov recursion - indices must match wavefunction indices
      // Going backwards: psi_prev = psi[i+2], psi_current = psi[i+1], psi_next = psi[i]
      psiNext = this.numerovStep(
        psiCurrent,
        psiPrev,
        effectivePotential[i + 2]!,
        effectivePotential[i + 1]!,
        effectivePotential[i]!,
        numerovFactor,
      );

      // Periodic renormalization to prevent overflow
      if (Math.abs(psiNext) > RENORM_THRESHOLD) {
        const norm = Math.abs(psiNext);
        psiCurrent /= norm;
        psiNext /= norm;
        scaleFactor *= norm;
        // Renormalize stored values
        for (let j = i + 1; j < this.gridPoints; j++) {
          psiValues[j]! /= norm;
        }
      }

      psiValues[i] = psiNext;

      // Count nodes
      if (i >= matchPoint && this.isNode(psiCurrent, psiNext)) {
        nodes++;
      }
    }

    // Calculate log derivative
    const logDerivative = this.calculateLogDerivative(
      psiValues[matchPoint + 1]!,
      psiValues[matchPoint]!,
      psiValues[matchPoint - 1]!,
    );

    return {
      nodes,
      logDerivative,
      psiAtMatch: psiValues[matchPoint]! * scaleFactor,
    };
  }

  /**
   * Single Numerov integration step with overflow protection
   */
  private numerovStep(
    psiCurrent: number,
    psiPrev: number,
    potPrev: number,
    potCurrent: number,
    potNext: number,
    numerovFactor: number,
  ): number {
    const denominator = 1.0 - numerovFactor * potNext;

    // Prevent division by near-zero values and handle overflow
    if (Math.abs(denominator) < 1e-15) {
      return psiCurrent * 2.0; // Fallback for numerical stability
    }

    const result =
      (psiCurrent * (2.0 + 10.0 * numerovFactor * potCurrent) - psiPrev * (1.0 - numerovFactor * potPrev)) /
      denominator;

    // Cap extreme values to prevent overflow
    const MAX_PSI = 1e100;
    if (!Number.isFinite(result)) {
      return Math.sign(psiCurrent) * MAX_PSI;
    }
    return Math.max(-MAX_PSI, Math.min(MAX_PSI, result));
  }

  /**
   * Integrates the logarithmic derivative equation: dy/dx = 2m/ℏ²[V(x) - E] - y²
   * where y = ψ'/ψ. This method is more stable than direct integration in
   * classically forbidden regions where ψ grows exponentially.
   *
   * Uses RK4 for integration of this nonlinear ODE.
   */
  private integrateLogDerivativeForward(energy: number, matchPoint: number): { y: number[]; nodes: number } {
    const y = new Array<number>(matchPoint + 2);
    const psi = new Array<number>(matchPoint + 2);
    const inverseHbar2Over2m = 1.0 / this.hbarSquaredOver2m;

    // Start with small ψ at boundary and integrate both ψ and y = ψ'/ψ
    psi[0] = this.deltaX; // Small but nonzero
    psi[1] = this.deltaX;
    y[0] = 0; // Start with zero derivative

    let nodes = 0;

    // Integrate using relationship: dψ/dx = y·ψ
    for (let i = 0; i <= matchPoint; i++) {
      const V = this.potentialEnergies[i]!;
      const kSquared = inverseHbar2Over2m * (V - energy);

      // dy/dx = k² - y²
      const dydt = (yVal: number): number => kSquared - yVal * yVal;

      if (i < matchPoint) {
        // RK4 step for y
        const k1 = dydt(y[i]!);
        const k2 = dydt(y[i]! + 0.5 * this.deltaX * k1);
        const k3 = dydt(y[i]! + 0.5 * this.deltaX * k2);
        const k4 = dydt(y[i]! + this.deltaX * k3);
        y[i + 1] = y[i]! + (this.deltaX / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4);

        // Also track ψ for node counting: dψ/dx = y·ψ
        const avgY = (y[i]! + y[i + 1]!) / 2;
        psi[i + 1] = psi[i]! * Math.exp(avgY * this.deltaX);

        // Renormalize if getting too large
        if (Math.abs(psi[i + 1]!) > 1e10) {
          const scale = 1e10 / Math.abs(psi[i + 1]!);
          psi[i + 1]! *= scale;
          psi[i]! *= scale;
        }

        // Count nodes in ψ
        if (psi[i]! * psi[i + 1]! < 0 && Math.abs(psi[i]!) > 1e-10 && Math.abs(psi[i + 1]!) > 1e-10) {
          nodes++;
        }
      }
    }

    return { y, nodes };
  }

  /**
   * Integrates the logarithmic derivative backward from right boundary.
   */
  private integrateLogDerivativeBackward(energy: number, matchPoint: number): { y: number[]; nodes: number } {
    const y = new Array<number>(this.gridPoints);
    const psi = new Array<number>(this.gridPoints);
    const inverseHbar2Over2m = 1.0 / this.hbarSquaredOver2m;

    // Start with small ψ at boundary
    psi[this.gridPoints - 1] = this.deltaX;
    psi[this.gridPoints - 2] = this.deltaX;
    y[this.gridPoints - 1] = 0;

    let nodes = 0;

    // RK4 integration backward
    for (let i = this.gridPoints - 1; i >= matchPoint; i--) {
      const V = this.potentialEnergies[i]!;
      const kSquared = inverseHbar2Over2m * (V - energy);

      // dy/dx = k² - y²
      const dydt = (yVal: number): number => kSquared - yVal * yVal;

      if (i > matchPoint) {
        // RK4 step backward
        const k1 = dydt(y[i]!);
        const k2 = dydt(y[i]! - 0.5 * this.deltaX * k1);
        const k3 = dydt(y[i]! - 0.5 * this.deltaX * k2);
        const k4 = dydt(y[i]! - this.deltaX * k3);
        y[i - 1] = y[i]! - (this.deltaX / 6.0) * (k1 + 2 * k2 + 2 * k3 + k4);

        // Track ψ for node counting
        const avgY = (y[i]! + y[i - 1]!) / 2;
        psi[i - 1] = psi[i]! * Math.exp(-avgY * this.deltaX);

        // Renormalize if getting too large
        if (Math.abs(psi[i - 1]!) > 1e10) {
          const scale = 1e10 / Math.abs(psi[i - 1]!);
          psi[i - 1]! *= scale;
          psi[i]! *= scale;
        }

        // Count nodes
        if (psi[i]! * psi[i - 1]! < 0 && Math.abs(psi[i]!) > 1e-10 && Math.abs(psi[i - 1]!) > 1e-10) {
          nodes++;
        }
      }
    }

    return { y, nodes };
  }

  /**
   * Alternative integration using logarithmic derivative method.
   * This provides better numerical stability in classically forbidden regions.
   */
  private integrateSchrodingerLogDeriv(energy: number, useFixedMatchPoint?: number): IntegrationResult {
    const matchPoint =
      useFixedMatchPoint !== undefined
        ? useFixedMatchPoint
        : this.adaptiveMatching
          ? this.findOptimalMatchingPoint(energy)
          : this.optimalMatchPoint;

    // Integrate logarithmic derivative from both sides
    const forwardResult = this.integrateLogDerivativeForward(energy, matchPoint);
    const backwardResult = this.integrateLogDerivativeBackward(energy, matchPoint);

    // Count total nodes
    const nodeCount = forwardResult.nodes + backwardResult.nodes;

    // The matching condition is: y_left(x_m) should equal y_right(x_m)
    // The mismatch indicates how far we are from an eigenvalue
    const yLeft = forwardResult.y[matchPoint]!;
    const yRight = backwardResult.y[matchPoint]!;
    const logDerivativeMismatch = yLeft - yRight;

    // Estimate matching amplitude from log derivative
    // If |y| is large, ψ is near a node
    const matchingAmplitude = 1.0 / (1.0 + Math.min(Math.abs(yLeft), Math.abs(yRight)));

    return new IntegrationResult(nodeCount, logDerivativeMismatch, matchingAmplitude);
  }

  /**
   * Enhanced wavefunction calculation with proper normalization
   */
  private calculateNormalizedWaveFunction(energy: number): number[] {
    return PerformanceMonitor.measure("calculate-wavefunction", () => {
      const waveFunction = new Array<number>(this.gridPoints);
      const matchPoint = this.adaptiveMatching
        ? this.findOptimalMatchingPoint(energy)
        : Math.floor(this.gridPoints * MATCHING_POINT_FRACTION);

      const numerovFactor = this.getNumerovFactor();
      const inverseHbar2Over2m = 1.0 / this.hbarSquaredOver2m;

      // Calculate effective potential
      const effectivePotential = this.potentialEnergies.map((V) => inverseHbar2Over2m * (V - energy));

      // Forward integration
      waveFunction[0] = BOUNDARY_PSI_INITIAL;
      waveFunction[1] = BOUNDARY_PSI_DERIVATIVE;

      for (let i = 2; i <= matchPoint; i++) {
        waveFunction[i] = this.numerovStep(
          waveFunction[i - 1]!,
          waveFunction[i - 2]!,
          effectivePotential[i - 2]!,
          effectivePotential[i - 1]!,
          effectivePotential[i]!,
          numerovFactor,
        );
      }

      const psiLeftAtMatch = waveFunction[matchPoint]!;

      // Backward integration
      waveFunction[this.gridPoints - 1] = BOUNDARY_PSI_INITIAL;
      waveFunction[this.gridPoints - 2] = BOUNDARY_PSI_DERIVATIVE;

      for (let i = this.gridPoints - 3; i >= matchPoint; i--) {
        waveFunction[i] = this.numerovStep(
          waveFunction[i + 1]!,
          waveFunction[i + 2]!,
          effectivePotential[i + 2]!,
          effectivePotential[i + 1]!,
          effectivePotential[i]!,
          numerovFactor,
        );
      }

      // Scale to match at matching point
      const scaleFactor = psiLeftAtMatch / waveFunction[matchPoint]!;
      for (let i = matchPoint; i < this.gridPoints; i++) {
        waveFunction[i]! *= scaleFactor;
      }

      // Normalize
      return this.normalizeWaveFunction(waveFunction);
    });
  }

  /**
   * Normalizes wavefunction using specified method
   */
  private normalizeWaveFunction(waveFunction: number[]): number[] {
    let norm: number;

    if (this.normalizationMethod === "l2") {
      // L2 normalization using Simpson's rule
      norm = Math.sqrt(this.calculateL2Norm(waveFunction));
    } else {
      // Max normalization
      norm = Math.max(...waveFunction.map(Math.abs));
    }

    if (norm === 0) {
      return waveFunction;
    }

    return waveFunction.map((psi) => psi / norm);
  }

  // ========================================================================
  // Helper Methods
  // ========================================================================

  /**
   * Validates constructor inputs
   */
  private validateInputs(xMin: number, xMax: number, numPoints: number): void {
    if (numPoints < 10) {
      throw new QuantumSolverException("Grid points must be at least 10", "INVALID_GRID_POINTS");
    }

    if (xMax <= xMin) {
      throw new QuantumSolverException("xMax must be greater than xMin", "INVALID_BOUNDS");
    }

    if (this.hbarSquaredOver2m <= 0) {
      throw new QuantumSolverException("hbarSquaredOver2m must be positive", "INVALID_PHYSICS_CONSTANT");
    }
  }

  /**
   * Calculates grid positions
   */
  private calculateGridPositions(xMin: number, xMax: number, numPoints: number): number[] {
    const positions = new Array<number>(numPoints);
    const dx = (xMax - xMin) / (numPoints - 1);
    for (let i = 0; i < numPoints; i++) {
      positions[i] = xMin + i * dx;
    }
    return positions;
  }

  /**
   * Calculates potential on grid
   */
  private calculatePotentialOnGrid(): number[] {
    const potential = new Array<number>(this.gridPoints);

    // Sample all points including boundaries
    for (let i = 0; i < this.gridPoints; i++) {
      potential[i] = this.potentialFunction(this.gridPositions[i]!);
    }

    return potential;
  }

  /**
   * Gets cached Numerov factor
   */
  private getNumerovFactor(): number {
    const key = this.deltaX;
    if (!this.numerovFactorCache.has(key)) {
      this.numerovFactorCache.set(key, this.deltaX * this.deltaX * NUMEROV_COEFFICIENT);
    }
    return this.numerovFactorCache.get(key)!;
  }

  /**
   * Checks if there's a node between two points
   */
  private isNode(psi1: number, psi2: number): boolean {
    return (
      psi1 * psi2 < 0 && Math.abs(psi1) > this.waveFunctionTolerance && Math.abs(psi2) > this.waveFunctionTolerance
    );
  }

  /**
   * Calculates logarithmic derivative
   */
  private calculateLogDerivative(psiBefore: number, psiAt: number, psiAfter: number): number {
    if (Math.abs(psiAt) < this.waveFunctionTolerance) {
      return 0;
    }
    return (psiAfter - psiBefore) / (2.0 * this.deltaX * psiAt);
  }

  /**
   * Finds optimal matching point for given energy
   */
  private findOptimalMatchingPoint(energy: number): number {
    // Find classical turning points
    const turningPoints: number[] = [];
    for (let i = 1; i < this.gridPoints - 1; i++) {
      if (this.potentialEnergies[i]! <= energy && this.potentialEnergies[i + 1]! > energy) {
        turningPoints.push(i);
      }
    }

    // Use middle turning point or default
    if (turningPoints.length >= 2) {
      return turningPoints[Math.floor(turningPoints.length / 2)]!;
    }

    return Math.floor(this.gridPoints * MATCHING_POINT_FRACTION);
  }

  /**
   * Calculates L2 norm using Simpson's rule
   */
  private calculateL2Norm(waveFunction: number[]): number {
    let sum = 0;
    for (let i = 0; i < this.gridPoints - 2; i += 2) {
      sum += waveFunction[i]! ** 2 + 4 * waveFunction[i + 1]! ** 2 + waveFunction[i + 2]! ** 2;
    }
    return (sum * this.deltaX) / 3.0;
  }

  /**
   * Calculates normalization constant
   */
  private calculateNormalizationConstant(waveFunction: number[]): number {
    const l2Norm = this.calculateL2Norm(waveFunction);
    return l2Norm > 0 ? 1.0 / Math.sqrt(l2Norm) : 1.0;
  }

  /**
   * Calculates convergence quality metric
   */
  private calculateConvergenceMetric(energy: number): number {
    const result = this.integrateSchrodinger(energy);
    const continuity = Math.exp(-Math.abs(result.logDerivativeMismatch));
    const amplitude = result.matchingAmplitude;
    return continuity * amplitude;
  }

  // ========================================================================
  // Cache Management
  // ========================================================================

  /**
   * Gets value from cache
   */
  private getFromCache<T>(key: string): T | null {
    if (!this.enableCaching) {
      return null;
    }

    const entry = this.cache.get(key);
    if (entry) {
      return entry.value as T;
    }

    return null;
  }

  /**
   * Adds value to cache with size limit
   */
  private addToCache<T>(key: string, value: T): void {
    if (!this.enableCaching) {
      return;
    }

    // Enforce cache size limit
    if (this.cache.size >= CACHE_SIZE_LIMIT) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, { value });
  }
}

// ============================================================================
// Functional API (matches NumerovSolver pattern)
// ============================================================================

/**
 * Solve the 1D Schrodinger equation using the enhanced shooting method.
 *
 * @param potential - Function V(x) that returns potential energy in Joules
 * @param mass - Particle mass in kg
 * @param numStates - Number of bound states to find
 * @param gridConfig - Grid configuration
 * @param energyMin - Minimum energy to search (Joules) - used for validation
 * @param energyMax - Maximum energy to search (Joules) - used for validation
 * @param config - Optional solver configuration
 * @returns Bound state results
 */
export function solveQuantumBound(
  potential: PotentialFunction,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
  energyMin?: number,
  energyMax?: number,
  config?: SolverConfig,
): BoundStateResult {
  return PerformanceMonitor.measure("solve-quantum-bound", () => {
    const { xMin, xMax, numPoints } = gridConfig;

    // Create solver
    const solver = new QuantumBoundStateSolver(mass, xMin, xMax, numPoints, potential, config);

    // Find all eigenstates
    const states = solver.findMultipleEigenstates(numStates);

    // Convert to BoundStateResult format
    const energies: number[] = [];
    const wavefunctions: number[][] = [];

    for (const state of states) {
      // Filter by energy range if provided
      if (energyMin !== undefined && state.energy < energyMin) {
        continue;
      }
      if (energyMax !== undefined && state.energy > energyMax) {
        continue;
      }

      energies.push(state.energy);
      wavefunctions.push(state.waveFunction);
    }

    return {
      energies,
      wavefunctions,
      xGrid: solver.getGridPositions(),
      method: "numerov", // Compatible with existing method types
    };
  });
}

// ============================================================================
// Registration
// ============================================================================

qppw.register("QuantumBoundStateSolver", {
  QuantumBoundStateSolver,
  solveQuantumBound,
  QuantumSolverException,
  InvalidBoundStateException,
});

export default QuantumBoundStateSolver;
