/**
 * Analytical solution for the (hyperbolic) Rosen-Morse potential.
 * V(x) = -V_0 / cosh²(x/a) + V_1 * tanh(x/a)
 *
 * REFERENCES:
 * - Rosen, N., & Morse, P. M. (1932). "On the Vibrations of Polyatomic Molecules"
 *   Physical Review, 42(2), 210-217. https://doi.org/10.1103/PhysRev.42.210
 * - Cooper, F., Khare, A., & Sukhatme, U. (1995). "Supersymmetry and quantum mechanics"
 *   Physics Reports, 251(5-6), 267-385. Section 3.4 (Rosen-Morse II as a shape-invariant potential).
 *
 * With the energy unit ε₀ = ℏ²/(2ma²) and the dimensionless parameters
 *   s(s + 1) = V_0/ε₀      (well strength)
 *   v = V_1/ε₀             (tilt)
 * the bound states are, for n = 0, 1, … with κ_n = s − n,
 *   E_n = −ε₀ [κ_n² + v²/(4κ_n²)]
 *   ψ_n(x) = N_n (1 − y)^(α_n/2) (1 + y)^(β_n/2) P_n^(α_n, β_n)(y),   y = tanh(x/a)
 *   α_n = κ_n + v/(2κ_n)   (decay rate towards +∞, where V → +V_1)
 *   β_n = κ_n − v/(2κ_n)   (decay rate towards −∞, where V → −V_1)
 * A state is bound while both decay rates are positive, i.e. κ_n² > |v|/2.
 *
 * (An earlier version used E_n = −ε₀(√(λ² − μ²) − n − ½)² with ψ ∝ sech^s · exp(μ tanh); that is
 * not an eigenfunction of this potential and was off by up to ~150 % for shallow wells.)
 *
 * The Eckart potential used by the sim is this potential with mapped parameters plus a constant —
 * see eckart-potential.ts.
 */

import { NoBoundStatesError } from "../NoBoundStatesError.js";
import type { BoundStateResult, GridConfig, PotentialFunction } from "../PotentialFunction.js";
import QuantumConstants from "../QuantumConstants.js";
import { AnalyticalSolution } from "./AnalyticalSolution.js";
import { jacobiPolynomial } from "./math-utilities.js";

/** Parameters of one Rosen-Morse problem, in the dimensionless form used by every formula here. */
type RosenMorseSpectrum = {
  a: number; // width (m)
  energyUnit: number; // ε₀ = ℏ²/(2ma²) (J)
  s: number; // s(s + 1) = V_0/ε₀
  v: number; // V_1/ε₀
  numBound: number; // number of bound states
};

/** Per-state quantities. */
type RosenMorseState = {
  energy: number; // J
  alpha: number; // decay rate towards +∞ (in units of 1/a)
  beta: number; // decay rate towards −∞ (in units of 1/a)
  normalization: number; // N_n, so that ∫|ψ_n|² dx = 1 (1/√m)
};

function rosenMorseSpectrum(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
  mass: number,
): RosenMorseSpectrum {
  const a = wellWidth;
  const energyUnit = (QuantumConstants.HBAR * QuantumConstants.HBAR) / (2 * mass * a * a);
  const strength = Math.max(0, potentialDepth / energyUnit);
  const s = (Math.sqrt(1 + 4 * strength) - 1) / 2;
  const v = barrierHeight / energyUnit;

  let numBound = 0;
  while (numBound < s && (s - numBound) ** 2 > Math.abs(v) / 2) {
    numBound++;
  }
  return { a, energyUnit, s, v, numBound };
}

/** Unnormalized ψ_n at u = x/a. Written with 1 ∓ tanh u = 2/(1 + e^(±2u)) to stay accurate far out. */
function rawWavefunction(n: number, alpha: number, beta: number, u: number): number {
  const oneMinusY = 2 / (1 + Math.exp(2 * u));
  const onePlusY = 2 / (1 + Math.exp(-2 * u));
  return oneMinusY ** (alpha / 2) * onePlusY ** (beta / 2) * jacobiPolynomial(n, alpha, beta, Math.tanh(u));
}

/** |u| beyond which every bound state has decayed by at least e^-20. */
function integrationHalfWidth(alpha: number, beta: number): number {
  return 20 / Math.min(alpha, beta) + 5;
}

function rosenMorseState(spectrum: RosenMorseSpectrum, n: number): RosenMorseState {
  const kappa = spectrum.s - n;
  const tilt = spectrum.v / (2 * kappa);
  const alpha = kappa + tilt;
  const beta = kappa - tilt;
  const energy = -spectrum.energyUnit * (kappa * kappa + tilt * tilt);

  // Normalize on a grid wide and fine enough for this state, independent of any display grid
  const halfWidth = integrationHalfWidth(alpha, beta);
  const samples = 4000;
  const du = (2 * halfWidth) / samples;
  let sum = 0;
  for (let i = 0; i <= samples; i++) {
    const psi = rawWavefunction(n, alpha, beta, -halfWidth + i * du);
    sum += (i === 0 || i === samples ? 0.5 : 1) * psi * psi;
  }
  const normalization = 1 / Math.sqrt(sum * du * spectrum.a);

  return { energy, alpha, beta, normalization };
}

function wavefunctionAt(spectrum: RosenMorseSpectrum, state: RosenMorseState, n: number, x: number): number {
  return state.normalization * rawWavefunction(n, state.alpha, state.beta, x / spectrum.a);
}

function requireBoundState(spectrum: RosenMorseSpectrum, n: number): void {
  if (n < 0 || n >= spectrum.numBound) {
    throw new NoBoundStatesError(`Rosen-Morse potential has no bound state n = ${n}`);
  }
}

/**
 * Class-based implementation of the Rosen-Morse analytical solution.
 */
export class RosenMorsePotentialSolution extends AnalyticalSolution {
  private readonly potentialDepth: number;
  private readonly barrierHeight: number;
  private readonly wellWidth: number;
  private readonly mass: number;
  private readonly spectrum: RosenMorseSpectrum;
  private readonly states = new Map<number, RosenMorseState>();

  constructor(potentialDepth: number, barrierHeight: number, wellWidth: number, mass: number) {
    super();
    this.potentialDepth = potentialDepth;
    this.barrierHeight = barrierHeight;
    this.wellWidth = wellWidth;
    this.mass = mass;
    this.spectrum = rosenMorseSpectrum(potentialDepth, barrierHeight, wellWidth, mass);
  }

  private state(n: number): RosenMorseState {
    requireBoundState(this.spectrum, n);
    let state = this.states.get(n);
    if (!state) {
      state = rosenMorseState(this.spectrum, n);
      this.states.set(n, state);
    }
    return state;
  }

  /** ψ_n(x) (1/√m) at each x (m). */
  public wavefunction(n: number, xGrid: number[]): number[] {
    const state = this.state(n);
    return xGrid.map((x) => wavefunctionAt(this.spectrum, state, n, x));
  }

  solve(numStates: number, gridConfig: GridConfig): BoundStateResult {
    return solveRosenMorsePotential(
      this.potentialDepth,
      this.barrierHeight,
      this.wellWidth,
      this.mass,
      numStates,
      gridConfig,
    );
  }

  createPotential(): PotentialFunction {
    return createRosenMorsePotential(this.potentialDepth, this.barrierHeight, this.wellWidth);
  }

  calculateTurningPoints(energy: number): Array<{ left: number; right: number }> {
    return [calculateRosenMorsePotentialTurningPoints(this.potentialDepth, this.barrierHeight, this.wellWidth, energy)];
  }

  calculateWavefunctionFirstDerivative(stateIndex: number, xGrid: number[]): number[] {
    return calculateRosenMorsePotentialWavefunctionFirstDerivative(
      this.potentialDepth,
      this.barrierHeight,
      this.wellWidth,
      this.mass,
      stateIndex,
      xGrid,
    );
  }

  calculateWavefunctionSecondDerivative(stateIndex: number, xGrid: number[]): number[] {
    return calculateRosenMorsePotentialWavefunctionSecondDerivative(
      this.potentialDepth,
      this.barrierHeight,
      this.wellWidth,
      this.mass,
      stateIndex,
      xGrid,
    );
  }

  calculateWavefunctionMinMax(
    stateIndex: number,
    xMin: number,
    xMax: number,
    numPoints?: number,
  ): { min: number; max: number; extremaPositions: number[] } {
    return calculateRosenMorsePotentialWavefunctionMinMax(
      this.potentialDepth,
      this.barrierHeight,
      this.wellWidth,
      this.mass,
      stateIndex,
      xMin,
      xMax,
      numPoints,
    );
  }
}

/**
 * Bound states of V(x) = -V_0/cosh²(x/a) + V_1·tanh(x/a).
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param barrierHeight - Tilt V_1 in Joules (either sign)
 * @param wellWidth - Width parameter a in meters
 * @param mass - Particle mass in kg
 * @param numStates - Number of energy levels to calculate
 * @param gridConfig - Grid configuration for wavefunction evaluation
 * @returns Bound state results with exact energies and wavefunctions
 */
export function solveRosenMorsePotential(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
): BoundStateResult {
  const spectrum = rosenMorseSpectrum(potentialDepth, barrierHeight, wellWidth, mass);
  const actualNumStates = Math.min(numStates, spectrum.numBound);
  if (actualNumStates <= 0) {
    throw new NoBoundStatesError(
      "Rosen-Morse potential: no bound states. Increase the well depth or decrease the barrier height.",
    );
  }

  const xGrid: number[] = [];
  const dx = (gridConfig.xMax - gridConfig.xMin) / (gridConfig.numPoints - 1);
  for (let i = 0; i < gridConfig.numPoints; i++) {
    xGrid.push(gridConfig.xMin + i * dx);
  }

  const energies: number[] = [];
  const wavefunctions: number[][] = [];
  for (let n = 0; n < actualNumStates; n++) {
    const state = rosenMorseState(spectrum, n);
    energies.push(state.energy);
    wavefunctions.push(xGrid.map((x) => wavefunctionAt(spectrum, state, n, x)));
  }

  return { energies, wavefunctions, xGrid, method: "analytical" };
}

/**
 * Create the potential function V(x) = -V_0/cosh²(x/a) + V_1·tanh(x/a) (Joules; x in meters).
 */
export function createRosenMorsePotential(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
): (x: number) => number {
  const V0 = potentialDepth;
  const V1 = barrierHeight;
  const a = wellWidth;

  return (x: number) => {
    const coshVal = Math.cosh(x / a);
    return -V0 / (coshVal * coshVal) + V1 * Math.tanh(x / a);
  };
}

/**
 * Classical turning points: the two solutions of V(x) = E around the minimum of the potential.
 * On a side where E lies above the asymptote the particle is not reflected; that side's point is
 * reported at the edge of the search range (±40a).
 */
export function calculateRosenMorsePotentialTurningPoints(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
  energy: number,
): { left: number; right: number } {
  const potentialFn = createRosenMorsePotential(potentialDepth, barrierHeight, wellWidth);
  const range = 40 * wellWidth;

  // Locate the minimum of V by golden-section search (V is unimodal for a bound well)
  let lo = -range;
  let hi = range;
  const ratio = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 200; i++) {
    const m1 = hi - ratio * (hi - lo);
    const m2 = lo + ratio * (hi - lo);
    if (potentialFn(m1) < potentialFn(m2)) {
      hi = m2;
    } else {
      lo = m1;
    }
  }
  const xMin = (lo + hi) / 2;

  // Bisection for V(x) = E between the minimum (V < E) and an outer point (V > E)
  const crossing = (inner: number, outer: number): number => {
    if (potentialFn(outer) <= energy) {
      return outer;
    }
    let below = inner;
    let above = outer;
    for (let i = 0; i < 100; i++) {
      const mid = (below + above) / 2;
      if (potentialFn(mid) < energy) {
        below = mid;
      } else {
        above = mid;
      }
    }
    return (below + above) / 2;
  };

  return { left: crossing(xMin, -range), right: crossing(xMin, range) };
}

/** Central-difference step for derivatives: small against a, large against round-off. */
function derivativeStep(wellWidth: number): number {
  return wellWidth * 1e-4;
}

/**
 * dψ_n/dx (1/m^(3/2)) at each x (m), by central differences of the exact ψ_n.
 */
export function calculateRosenMorsePotentialWavefunctionFirstDerivative(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
  mass: number,
  stateIndex: number,
  xGrid: number[],
): number[] {
  const spectrum = rosenMorseSpectrum(potentialDepth, barrierHeight, wellWidth, mass);
  requireBoundState(spectrum, stateIndex);
  const state = rosenMorseState(spectrum, stateIndex);
  const h = derivativeStep(wellWidth);
  return xGrid.map(
    (x) =>
      (wavefunctionAt(spectrum, state, stateIndex, x + h) - wavefunctionAt(spectrum, state, stateIndex, x - h)) /
      (2 * h),
  );
}

/**
 * d²ψ_n/dx² (1/m^(5/2)) at each x (m), by central differences of the exact ψ_n.
 */
export function calculateRosenMorsePotentialWavefunctionSecondDerivative(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
  mass: number,
  stateIndex: number,
  xGrid: number[],
): number[] {
  const spectrum = rosenMorseSpectrum(potentialDepth, barrierHeight, wellWidth, mass);
  requireBoundState(spectrum, stateIndex);
  const state = rosenMorseState(spectrum, stateIndex);
  const h = derivativeStep(wellWidth);
  return xGrid.map(
    (x) =>
      (wavefunctionAt(spectrum, state, stateIndex, x + h) -
        2 * wavefunctionAt(spectrum, state, stateIndex, x) +
        wavefunctionAt(spectrum, state, stateIndex, x - h)) /
      (h * h),
  );
}

/**
 * Minimum and maximum of ψ_n on [xMin, xMax], and the positions of its interior extrema.
 */
export function calculateRosenMorsePotentialWavefunctionMinMax(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
  mass: number,
  stateIndex: number,
  xMin: number,
  xMax: number,
  numPoints: number = 1000,
): { min: number; max: number; extremaPositions: number[] } {
  const spectrum = rosenMorseSpectrum(potentialDepth, barrierHeight, wellWidth, mass);
  requireBoundState(spectrum, stateIndex);
  const state = rosenMorseState(spectrum, stateIndex);

  const dx = (xMax - xMin) / (numPoints - 1);
  const values: number[] = [];
  for (let i = 0; i < numPoints; i++) {
    values.push(wavefunctionAt(spectrum, state, stateIndex, xMin + i * dx));
  }

  const extremaPositions: number[] = [];
  for (let i = 1; i < numPoints - 1; i++) {
    const rising = values[i]! - values[i - 1]!;
    const falling = values[i + 1]! - values[i]!;
    if (rising * falling < 0) {
      extremaPositions.push(xMin + i * dx);
    }
  }

  return { min: Math.min(...values), max: Math.max(...values), extremaPositions };
}
