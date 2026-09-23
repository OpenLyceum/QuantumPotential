/**
 * Analytical solution for the Pöschl-Teller potential.
 * V(x) = -V_0 / cosh²(x/a)
 *
 * This potential is useful for modeling quantum wells and has exact solutions.
 *
 * REFERENCES:
 * - Pöschl, G., & Teller, E. (1933). "Bemerkungen zur Quantenmechanik des anharmonischen Oszillators"
 *   Zeitschrift für Physik, 83(3-4), 143-151.
 *   https://doi.org/10.1007/BF01331132
 *   ORIGINAL PAPER: Introduced this potential and its exact solutions.
 *
 * - Flügge, S. (1999). "Practical Quantum Mechanics". Springer.
 *   Problem 39, pp. 95-97. https://doi.org/10.1007/978-3-642-61995-3
 *   Detailed solution using Jacobi polynomials.
 *
 * - Cooper, F., Khare, A., & Sukhatme, U. (1995). "Supersymmetry and quantum mechanics"
 *   Physics Reports, 251(5-6), 267-385.
 *   https://doi.org/10.1016/0370-1573(94)00080-M
 *   Section 3.2, pp. 281-283: Pöschl-Teller as a shape-invariant potential.
 *
 * - Natanzon, G. A. (1979). "General properties of potentials for which the Schrödinger equation
 *   can be solved by means of hypergeometric functions". Theoretical and Mathematical Physics, 38(2), 146-153.
 *   https://doi.org/10.1007/BF01016836
 *   Classification of exactly solvable potentials including Pöschl-Teller.
 *
 * ENERGY EIGENVALUES:
 *   E_n = -V_0 [(λ - n - 1/2)/λ]²,  n = 0, 1, 2, ..., n_max
 *   where λ = a√(2mV_0)/ℏ and n_max = floor(λ - 1/2)
 *
 * WAVEFUNCTIONS:
 *   ψ_n(x) = N_n · sech^(λ-n-1/2)(x/a) · P_n^(α,α)(tanh(x/a))
 *   where α = λ - n - 1/2 and P_n^(α,α) are Jacobi polynomials
 */

import { NoBoundStatesError } from "../NoBoundStatesError.js";
import type { BoundStateResult, FourierTransformResult, GridConfig, PotentialFunction } from "../PotentialFunction.js";
import QuantumConstants from "../QuantumConstants.js";
import { AnalyticalSolution } from "./AnalyticalSolution.js";
import { computeNumericalFourierTransform } from "./fourier-transform-helper.js";
import { factorial, jacobiPolynomial } from "./math-utilities.js";

/**
 * The Pöschl-Teller index s, defined by s(s + 1) = λ² with λ = a√(2mV₀)/ℏ. Energies are
 * E_n = -(ℏ²/2ma²)(s - n)² and ψ_n ∝ sech^(s-n)(x/a) · P_n^(s-n, s-n)(tanh(x/a)).
 * (s ≈ λ - ½ only for deep wells; using that approximation put shallow-well energies off by several %.)
 */
function poschlTellerS(lambda: number): number {
  return (Math.sqrt(1 + 4 * lambda * lambda) - 1) / 2;
}

/**
 * Class-based implementation of Pöschl-Teller potential analytical solution.
 * Extends the AnalyticalSolution abstract base class.
 */
export class PoschlTellerPotentialSolution extends AnalyticalSolution {
  private potentialDepth: number;
  private wellWidth: number;
  private mass: number;

  constructor(potentialDepth: number, wellWidth: number, mass: number) {
    super();
    this.potentialDepth = potentialDepth;
    this.wellWidth = wellWidth;
    this.mass = mass;
  }

  solve(numStates: number, gridConfig: GridConfig): BoundStateResult {
    return solvePoschlTellerPotential(this.potentialDepth, this.wellWidth, this.mass, numStates, gridConfig);
  }

  createPotential(): PotentialFunction {
    return createPoschlTellerPotential(this.potentialDepth, this.wellWidth);
  }

  calculateClassicalProbability(energy: number, mass: number, xGrid: number[]): number[] {
    return calculatePoschlTellerClassicalProbability(this.potentialDepth, this.wellWidth, energy, mass, xGrid);
  }

  calculateWavefunctionZeros(stateIndex: number, _energy: number): number[] {
    return calculatePoschlTellerWavefunctionZeros(this.potentialDepth, this.wellWidth, this.mass, stateIndex);
  }

  calculateTurningPoints(energy: number): Array<{ left: number; right: number }> {
    const points = calculatePoschlTellerTurningPoints(this.potentialDepth, this.wellWidth, energy);
    return [points]; // Return as array with single element for simple single-well potential
  }

  calculateWavefunctionFirstDerivative(stateIndex: number, xGrid: number[]): number[] {
    return calculatePoschlTellerWavefunctionFirstDerivative(
      this.potentialDepth,
      this.wellWidth,
      this.mass,
      stateIndex,
      xGrid,
    );
  }

  calculateWavefunctionSecondDerivative(stateIndex: number, xGrid: number[]): number[] {
    return calculatePoschlTellerWavefunctionSecondDerivative(
      this.potentialDepth,
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
    return calculatePoschlTellerWavefunctionMinMax(
      this.potentialDepth,
      this.wellWidth,
      this.mass,
      stateIndex,
      xMin,
      xMax,
      numPoints,
    );
  }

  calculateSuperpositionMinMax(
    coefficients: Array<[number, number]>,
    energies: number[],
    time: number,
    xMin: number,
    xMax: number,
    numPoints?: number,
  ): { min: number; max: number } {
    return calculatePoschlTellerSuperpositionMinMax(
      this.potentialDepth,
      this.wellWidth,
      this.mass,
      coefficients,
      energies,
      time,
      xMin,
      xMax,
      numPoints,
    );
  }
  calculateFourierTransform(
    boundStateResult: BoundStateResult,
    mass: number,
    numMomentumPoints?: number,
    pMax?: number,
  ): FourierTransformResult {
    return computeNumericalFourierTransform(boundStateResult, mass, this.potentialDepth, numMomentumPoints, pMax);
  }
}

/**
 * Analytical solution for the Pöschl-Teller potential.
 * V(x) = -V_0 / cosh²(x/a)
 *
 * This potential is useful for modeling quantum wells and has exact solutions.
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param wellWidth - Width parameter a in meters
 * @param mass - Particle mass in kg
 * @param numStates - Number of energy levels to calculate
 * @param gridConfig - Grid configuration for wavefunction evaluation
 * @returns Bound state results with exact energies and wavefunctions
 */
export function solvePoschlTellerPotential(
  potentialDepth: number,
  wellWidth: number,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
): BoundStateResult {
  const { HBAR } = QuantumConstants;
  const V0 = potentialDepth;
  const a = wellWidth;

  // Calculate λ = a * sqrt(2*m*V_0) / ℏ
  // (Note: with x/a substitution, a_old = 1/a_new, so λ_new = λ_old)
  const lambda = (a * Math.sqrt(2 * mass * V0)) / HBAR;

  // Bound states are n = 0, 1, … with n < s (n = s would sit exactly at E = 0, which is not bound;
  // the tolerance keeps round-off in s from admitting that state when s is an integer)
  const nMax = Math.ceil(poschlTellerS(lambda) - 1e-9) - 1;
  const actualNumStates = Math.min(numStates, nMax + 1);

  if (actualNumStates <= 0) {
    throw new NoBoundStatesError("Pöschl-Teller potential too shallow to support bound states");
  }

  // Calculate energies: E_n = -V_0 * [(s - n)/λ]² = -(ℏ²/2ma²)(s - n)²
  // Ground state (n=0) has lowest energy, excited states have higher energy
  const energies: number[] = [];
  for (let n = 0; n < actualNumStates; n++) {
    const term = poschlTellerS(lambda) - n;
    const energy = (-V0 * (term * term)) / (lambda * lambda);
    energies.push(energy);
  }

  // Generate grid
  const numPoints = gridConfig.numPoints;
  const xGrid: number[] = [];
  const dx = (gridConfig.xMax - gridConfig.xMin) / (numPoints - 1);
  for (let i = 0; i < numPoints; i++) {
    xGrid.push(gridConfig.xMin + i * dx);
  }

  // Calculate wavefunctions
  // ψ_n(x) = N_n * sech^(λ-n-1/2)(x/a) * P_n^(λ-n-1/2, λ-n-1/2)(tanh(x/a))
  // where P is the Jacobi polynomial
  const wavefunctions: number[][] = [];

  for (let n = 0; n < actualNumStates; n++) {
    const psiRaw: number[] = [];
    const alpha = poschlTellerS(lambda) - n;

    // First, calculate unnormalized wavefunction
    for (const x of xGrid) {
      const tanhVal = Math.tanh(x / a);
      const sechVal = 1.0 / Math.cosh(x / a);

      // Use Legendre polynomials for Jacobi with α=β
      const jacobiPoly = jacobiPolynomial(n, alpha, alpha, tanhVal);
      const value = sechVal ** alpha * jacobiPoly;

      psiRaw.push(value);
    }

    // Normalize wavefunction numerically to ensure ∫|ψ|² dx = 1
    let normSq = 0;
    for (const psi of psiRaw) {
      normSq += psi * psi * dx;
    }
    const norm = 1 / Math.sqrt(normSq);
    const wavefunction = psiRaw.map((psi) => norm * psi);

    wavefunctions.push(wavefunction);
  }

  return {
    energies,
    wavefunctions,
    xGrid,
    method: "analytical",
  };
}

/**
 * Create the potential function for a Pöschl-Teller potential.
 * V(x) = -V_0 / cosh²(x/a)
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param wellWidth - Width parameter a in meters
 * @returns Potential function V(x) in Joules
 */
export function createPoschlTellerPotential(potentialDepth: number, wellWidth: number): (x: number) => number {
  const V0 = potentialDepth;
  const a = wellWidth;

  return (x: number) => {
    const coshVal = Math.cosh(x / a);
    return -V0 / (coshVal * coshVal);
  };
}

/**
 * Calculate classical probability density for a Pöschl-Teller potential.
 * P(x) ∝ 1/v(x) = 1/√[2(E - V(x))/m]
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param wellWidth - Width parameter a in meters
 * @param energy - Energy of the particle in Joules
 * @param mass - Particle mass in kg
 * @param xGrid - Array of x positions in meters
 * @returns Array of normalized classical probability density values (in 1/meters)
 */
export function calculatePoschlTellerClassicalProbability(
  potentialDepth: number,
  wellWidth: number,
  energy: number,
  mass: number,
  xGrid: number[],
): number[] {
  const potentialFn = createPoschlTellerPotential(potentialDepth, wellWidth);

  const classicalProbability: number[] = [];
  let integralSum = 0;

  // Find maximum kinetic energy for epsilon calculation
  let maxKE = 0;
  for (const x of xGrid) {
    const ke = energy - potentialFn(x);
    if (ke > maxKE) {
      maxKE = ke;
    }
  }

  // Use minimum kinetic energy to prevent singularities at turning points
  // This is 1% of maximum KE, which prevents infinities while preserving shape
  const epsilon = 0.01 * maxKE;

  // Calculate unnormalized probability
  for (let i = 0; i < xGrid.length; i++) {
    const kineticEnergy = energy - potentialFn(xGrid[i]!);

    if (kineticEnergy <= 0) {
      classicalProbability.push(0);
    } else {
      const safeKE = Math.max(kineticEnergy, epsilon);
      const probability = 1 / Math.sqrt((2 * safeKE) / mass);
      classicalProbability.push(probability);

      if (i > 0) {
        const dx = xGrid[i]! - xGrid[i - 1]!;
        integralSum += ((probability + classicalProbability[i - 1]!) * dx) / 2;
      }
    }
  }

  // Normalize
  if (integralSum > 0) {
    for (let i = 0; i < classicalProbability.length; i++) {
      classicalProbability[i]! /= integralSum;
    }
  }

  return classicalProbability;
}

/**
 * Calculate the classical turning points for a Pöschl-Teller potential.
 * Solve E = -V_0 / cosh²(x/a) for x
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param wellWidth - Width parameter a in meters
 * @param energy - Energy of the particle in Joules
 * @returns Object with left and right turning point positions (in meters)
 */
export function calculatePoschlTellerTurningPoints(
  potentialDepth: number,
  wellWidth: number,
  energy: number,
): { left: number; right: number } {
  const V0 = potentialDepth;
  const a = wellWidth;

  // Solve: E = -V0 / cosh²(x/a)
  // => cosh²(x/a) = -V0 / E
  // => cosh(x/a) = sqrt(-V0 / E)
  // => x/a = ±acosh(sqrt(-V0 / E))
  // => x = ±a * acosh(sqrt(-V0 / E))

  const ratio = Math.sqrt(-V0 / energy);
  const turning = a * Math.acosh(ratio);

  return {
    left: -turning,
    right: turning,
  };
}

/**
 * Calculate wavefunction zeros for Pöschl-Teller potential (numerical approach).
 * Finds zeros by detecting sign changes in the wavefunction.
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param wellWidth - Width parameter a in meters
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for ground state, etc.)
 * @param searchRange - Range to search for zeros (in meters)
 * @returns Array of x positions (in meters) where wavefunction is zero
 */
export function calculatePoschlTellerWavefunctionZeros(
  potentialDepth: number,
  wellWidth: number,
  mass: number,
  stateIndex: number,
  searchRange: number = 20e-9,
): number[] {
  const { HBAR } = QuantumConstants;
  const V0 = potentialDepth;
  const a = wellWidth;
  const n = stateIndex;

  const lambda = (a * Math.sqrt(2 * mass * V0)) / HBAR;
  const alpha = poschlTellerS(lambda) - n;
  const normalization = Math.sqrt(((1 / a) * (2 * alpha)) / factorial(n)) * Math.sqrt(factorial(n));

  // Ground state has no zeros
  if (n === 0) {
    return [];
  }

  const zeros: number[] = [];
  const numSamples = 1000;
  const dx = (2 * searchRange) / numSamples;

  let prevX = -searchRange;
  const prevTanh = Math.tanh(prevX / a);
  const prevSech = 1.0 / Math.cosh(prevX / a);
  const prevJacobi = jacobiPolynomial(n, alpha, alpha, prevTanh);
  let prevVal = normalization * prevSech ** alpha * prevJacobi;

  for (let i = 1; i <= numSamples; i++) {
    const x = -searchRange + i * dx;
    const tanhVal = Math.tanh(x / a);
    const sechVal = 1.0 / Math.cosh(x / a);
    const jacobiPoly = jacobiPolynomial(n, alpha, alpha, tanhVal);
    const val = normalization * sechVal ** alpha * jacobiPoly;

    // Sign change detected
    if (prevVal * val < 0) {
      // Use bisection to refine
      let left = prevX;
      let right = x;
      for (let iter = 0; iter < 20; iter++) {
        const mid = (left + right) / 2;
        const midTanh = Math.tanh(mid / a);
        const midSech = 1.0 / Math.cosh(mid / a);
        const midJacobi = jacobiPolynomial(n, alpha, alpha, midTanh);
        const valMid = normalization * midSech ** alpha * midJacobi;

        if (Math.abs(valMid) < 1e-12) {
          zeros.push(mid);
          break;
        }

        if (valMid * prevVal < 0) {
          right = mid;
        } else {
          left = mid;
        }

        if (iter === 19) {
          zeros.push((left + right) / 2);
        }
      }
    }

    prevX = x;
    prevVal = val;
  }

  return zeros;
}

/**
 * Calculate the first derivative of the wavefunction for a Pöschl-Teller potential.
 * Uses analytical derivative formula based on product rule and chain rule.
 *
 * For ψ_n(x) = N_n · sech^α(x/a) · P_n^(α,α)(tanh(x/a)), where α = λ - n - 1/2
 *
 * The derivative is:
 * ψ'(x) = N_n · sech^α(x/a) · {-α/a · tanh(x/a) · P_n^(α,α)(t)
 *                               + 1/a · sech^2(x/a) · [(n + 2α + 1)/2] · P_{n-1}^(α+1,α+1)(t)}
 * where t = tanh(x/a)
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param wellWidth - Width parameter a in meters
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for ground state, etc.)
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of first derivative values
 */
/**
 * Compute numerical normalization constant for Pöschl-Teller wavefunction.
 * Ensures the wavefunction satisfies ∫|ψ|² dx = 1.
 */
function computePoschlTellerNormalization(
  a: number,
  lambda: number,
  n: number,
  xMin: number,
  xMax: number,
  numSamples: number = 1000,
): number {
  const alpha = poschlTellerS(lambda) - n;

  // If xMin and xMax are too close (e.g., single point evaluation),
  // use a default integration range that covers the wavefunction
  let integrationMin = xMin;
  let integrationMax = xMax;
  if (Math.abs(xMax - xMin) < 1e-10) {
    // Use ±5a as a reasonable range that captures most of the wavefunction
    integrationMin = -5 * a;
    integrationMax = 5 * a;
  }

  const dx = (integrationMax - integrationMin) / (numSamples - 1);

  let normSq = 0;
  for (let i = 0; i < numSamples; i++) {
    const x = integrationMin + i * dx;
    const tanhVal = Math.tanh(x / a);
    const sechVal = 1.0 / Math.cosh(x / a);
    const jacobiPoly = jacobiPolynomial(n, alpha, alpha, tanhVal);
    const psiUnnorm = sechVal ** alpha * jacobiPoly;
    normSq += psiUnnorm * psiUnnorm * dx;
  }

  return 1 / Math.sqrt(normSq);
}

export function calculatePoschlTellerWavefunctionFirstDerivative(
  potentialDepth: number,
  wellWidth: number,
  mass: number,
  stateIndex: number,
  xGrid: number[],
): number[] {
  const { HBAR } = QuantumConstants;
  const V0 = potentialDepth;
  const a = wellWidth;
  const n = stateIndex;

  const lambda = (a * Math.sqrt(2 * mass * V0)) / HBAR;
  const alpha = poschlTellerS(lambda) - n;

  // Use numerical normalization to match the wavefunction normalization
  const xMin = xGrid[0]!;
  const xMax = xGrid[xGrid.length - 1]!;
  const normalization = computePoschlTellerNormalization(a, lambda, n, xMin, xMax);

  const firstDerivative: number[] = [];

  for (const x of xGrid) {
    const t = Math.tanh(x / a);
    const sech = 1.0 / Math.cosh(x / a);
    const sechAlpha = sech ** alpha;

    // Calculate P_n^(α,α)(t)
    const Pn = jacobiPolynomial(n, alpha, alpha, t);

    // First term: -α/a · tanh(x/a) · P_n^(α,α)(t)
    const term1 = -(alpha / a) * t * Pn;

    // Second term: 1/a · sech^2(x/a) · [(n + 2α + 1)/2] · P_{n-1}^(α+1,α+1)(t)
    // For ground state (n=0), there is no P_{-1}, so this term is zero
    let term2 = 0;
    if (n > 0) {
      const PnMinus1 = jacobiPolynomial(n - 1, alpha + 1, alpha + 1, t);
      const derivCoeff = (n + 2 * alpha + 1) / 2;
      term2 = (1 / a) * sech * sech * derivCoeff * PnMinus1;
    }

    // Combine terms: ψ'(x) = N_n · sech^α(x/a) · (term1 + term2)
    const firstDeriv = normalization * sechAlpha * (term1 + term2);
    firstDerivative.push(firstDeriv);
  }

  return firstDerivative;
}

/**
 * Calculate the second derivative of the wavefunction for a Pöschl-Teller potential.
 * Uses the Schrödinger equation to compute the exact second derivative:
 *
 * From the time-independent Schrödinger equation:
 *   -ℏ²/(2m) · ψ''(x) + V(x) · ψ(x) = E_n · ψ(x)
 *
 * Rearranging:
 *   ψ''(x) = 2m/ℏ² · [V(x) - E_n] · ψ(x)
 *
 * This gives the exact second derivative without numerical differentiation errors.
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param wellWidth - Width parameter a in meters
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for ground state, etc.)
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of second derivative values
 */
export function calculatePoschlTellerWavefunctionSecondDerivative(
  potentialDepth: number,
  wellWidth: number,
  mass: number,
  stateIndex: number,
  xGrid: number[],
): number[] {
  const { HBAR } = QuantumConstants;
  const V0 = potentialDepth;
  const a = wellWidth;
  const n = stateIndex;

  const lambda = (a * Math.sqrt(2 * mass * V0)) / HBAR;
  const alpha = poschlTellerS(lambda) - n;

  // Use numerical normalization to match the wavefunction normalization
  const xMin = xGrid[0]!;
  const xMax = xGrid[xGrid.length - 1]!;
  const normalization = computePoschlTellerNormalization(a, lambda, n, xMin, xMax);

  // Calculate energy for this state: E_n = -V_0 * [(λ - n - 1/2)/λ]²
  const term = poschlTellerS(lambda) - n;
  const energy = (-V0 * (term * term)) / (lambda * lambda);

  const secondDerivative: number[] = [];

  for (const x of xGrid) {
    // Calculate wavefunction value at x
    const t = Math.tanh(x / a);
    const sech = 1.0 / Math.cosh(x / a);
    const sechAlpha = sech ** alpha;
    const Pn = jacobiPolynomial(n, alpha, alpha, t);
    const psi = normalization * sechAlpha * Pn;

    // Calculate potential at x: V(x) = -V_0 / cosh²(x/a)
    const V = -V0 * sech * sech;

    // Use Schrödinger equation: ψ''(x) = 2m/ℏ² · [V(x) - E_n] · ψ(x)
    const secondDeriv = ((2 * mass) / (HBAR * HBAR)) * (V - energy) * psi;
    secondDerivative.push(secondDeriv);
  }

  return secondDerivative;
}

/**
 * Calculate the minimum and maximum values of the wavefunction for a Pöschl-Teller potential.
 *
 * For ψ_n(x) = N_n · sech^(λ-n-1/2)(x/a) · P_n^(α,α)(tanh(x/a)), the function is sampled
 * at multiple points in the range [xMin, xMax] to find the extrema and their positions.
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param wellWidth - Width parameter a in meters
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for ground state, 1 for first excited, etc.)
 * @param xMin - Left boundary of the region in meters
 * @param xMax - Right boundary of the region in meters
 * @param numPoints - Number of points to sample (default: 1000)
 * @returns Object containing min/max values and x-positions of all extrema
 */
export function calculatePoschlTellerWavefunctionMinMax(
  potentialDepth: number,
  wellWidth: number,
  mass: number,
  stateIndex: number,
  xMin: number,
  xMax: number,
  numPoints: number = 1000,
): { min: number; max: number; extremaPositions: number[] } {
  const { HBAR } = QuantumConstants;
  const V0 = potentialDepth;
  const a = wellWidth;
  const n = stateIndex;

  const lambda = (a * Math.sqrt(2 * mass * V0)) / HBAR;
  const alpha = poschlTellerS(lambda) - n;
  const normalization = Math.sqrt(((1 / a) * (2 * alpha)) / factorial(n)) * Math.sqrt(factorial(n));

  let min = Infinity;
  let max = -Infinity;
  const extremaPositions: number[] = [];

  const dx = (xMax - xMin) / (numPoints - 1);
  const h = 1e-12; // Small step for numerical derivative
  let prevDerivativeSign: number | null = null;

  for (let i = 0; i < numPoints; i++) {
    const x = xMin + i * dx;

    const tanhVal = Math.tanh(x / a);
    const sechVal = 1.0 / Math.cosh(x / a);
    const jacobiPoly = jacobiPolynomial(n, alpha, alpha, tanhVal);
    const psi = normalization * sechVal ** alpha * jacobiPoly;

    // Calculate derivative using central difference for extrema detection
    let derivative = 0;
    if (i > 0 && i < numPoints - 1) {
      const xMinus = x - h;
      const xPlus = x + h;

      const tanhMinus = Math.tanh(xMinus / a);
      const sechMinus = 1.0 / Math.cosh(xMinus / a);
      const jacobiMinus = jacobiPolynomial(n, alpha, alpha, tanhMinus);
      const psiMinus = normalization * sechMinus ** alpha * jacobiMinus;

      const tanhPlus = Math.tanh(xPlus / a);
      const sechPlus = 1.0 / Math.cosh(xPlus / a);
      const jacobiPlus = jacobiPolynomial(n, alpha, alpha, tanhPlus);
      const psiPlus = normalization * sechPlus ** alpha * jacobiPlus;

      derivative = (psiPlus - psiMinus) / (2 * h);
    }

    if (psi < min) {
      min = psi;
    }
    if (psi > max) {
      max = psi;
    }

    // Detect extrema by sign change in derivative
    const currentDerivativeSign = Math.sign(derivative);
    if (
      prevDerivativeSign !== null &&
      currentDerivativeSign !== prevDerivativeSign &&
      prevDerivativeSign !== 0 &&
      Math.abs(derivative) > 1e-10 // Avoid numerical noise
    ) {
      extremaPositions.push(x);
    }
    prevDerivativeSign = currentDerivativeSign;
  }

  return { min, max, extremaPositions };
}

/**
 * Calculate the minimum and maximum values of a superposition of wavefunctions
 * for a Pöschl-Teller potential.
 *
 * The superposition is: Ψ(x,t) = Σ cₙ ψₙ(x) exp(-iEₙt/ℏ)
 * We return the min/max of the real part of this complex-valued function.
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param wellWidth - Width parameter a in meters
 * @param mass - Particle mass in kg
 * @param coefficients - Complex coefficients for each eigenstate (as [real, imag] pairs)
 * @param energies - Energy eigenvalues in Joules
 * @param time - Time in seconds
 * @param xMin - Left boundary of the region in meters
 * @param xMax - Right boundary of the region in meters
 * @param numPoints - Number of points to sample (default: 1000)
 * @returns Object containing min and max values of the superposition's real part
 */
export function calculatePoschlTellerSuperpositionMinMax(
  potentialDepth: number,
  wellWidth: number,
  mass: number,
  coefficients: Array<[number, number]>,
  energies: number[],
  time: number,
  xMin: number,
  xMax: number,
  numPoints: number = 1000,
): { min: number; max: number } {
  const { HBAR } = QuantumConstants;
  const V0 = potentialDepth;
  const a = wellWidth;

  const lambda = (a * Math.sqrt(2 * mass * V0)) / HBAR;

  let min = Infinity;
  let max = -Infinity;

  const dx = (xMax - xMin) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const x = xMin + i * dx;

    // Calculate superposition at this position
    let realPart = 0;

    for (let n = 0; n < coefficients.length; n++) {
      const [cReal, cImag] = coefficients[n]!;
      const energy = energies[n]!;

      // Calculate wavefunction value
      const alpha = poschlTellerS(lambda) - n;
      const normalization = Math.sqrt(((1 / a) * (2 * alpha)) / factorial(n)) * Math.sqrt(factorial(n));
      const tanhVal = Math.tanh(x / a);
      const sechVal = 1.0 / Math.cosh(x / a);
      const jacobiPoly = jacobiPolynomial(n, alpha, alpha, tanhVal);
      const psi = normalization * sechVal ** alpha * jacobiPoly;

      // Time evolution: exp(-iEt/ℏ) = cos(Et/ℏ) - i*sin(Et/ℏ)
      const phase = (-energy * time) / HBAR;
      const cosPhase = Math.cos(phase);
      const sinPhase = Math.sin(phase);

      // Complex multiplication: (cReal + i*cImag) * psi * (cosPhase - i*sinPhase)
      // Real part: cReal * psi * cosPhase + cImag * psi * sinPhase
      // Re[(c_r + i c_i)(cos φ + i sin φ)] with φ = −E t/ℏ
      realPart += cReal * psi * cosPhase - cImag * psi * sinPhase;
    }

    if (realPart < min) {
      min = realPart;
    }
    if (realPart > max) {
      max = realPart;
    }
  }

  return { min, max };
}
