/**
 * Analytical solution for a quantum harmonic oscillator.
 * V(x) = (1/2) * k * x^2 = (1/2) * m * ω^2 * x^2
 *
 * REFERENCES:
 * - Griffiths, D. J., & Schroeter, D. F. (2018). "Introduction to Quantum Mechanics" (3rd ed.).
 *   Cambridge University Press. Section 2.3, pp. 40-55.
 *   https://doi.org/10.1017/9781316995433
 *   Complete derivation using operator methods and Hermite polynomials.
 *
 * - Shankar, R. (1994). "Principles of Quantum Mechanics" (2nd ed.). Springer.
 *   Section 7.3, pp. 164-182. https://doi.org/10.1007/978-1-4757-0576-8
 *   Algebraic method using ladder operators.
 *
 * - Dirac, P. A. M. (1927). "The Quantum Theory of the Emission and Absorption of Radiation".
 *   Proceedings of the Royal Society A, 114(767), 243-265.
 *   https://doi.org/10.1098/rspa.1927.0039
 *   Introduction of creation and annihilation operators.
 *
 * - Abramowitz, M., & Stegun, I. A. (1964). "Handbook of Mathematical Functions".
 *   National Bureau of Standards. Section 22, pp. 773-802.
 *   https://doi.org/10.1119/1.15378
 *   Properties of Hermite polynomials used in wavefunctions.
 *
 * ENERGY EIGENVALUES:
 *   E_n = ℏω(n + 1/2),  n = 0, 1, 2, ...
 *   where ω = √(k/m)
 *
 * WAVEFUNCTIONS:
 *   ψ_n(x) = (1/√(2^n n!)) · (mω/πℏ)^(1/4) · exp(-mωx²/(2ℏ)) · H_n(√(mω/ℏ) x)
 *   where H_n are the Hermite polynomials
 */

import type { BoundStateResult, FourierTransformResult, GridConfig, PotentialFunction } from "../PotentialFunction.js";
import QuantumConstants from "../QuantumConstants.js";
import { AnalyticalSolution } from "./AnalyticalSolution.js";
import { factorial, hermitePolynomial } from "./math-utilities.js";

/**
 * Create the potential function for a harmonic oscillator.
 * V(x) = (1/2) * k * x^2
 *
 * @param springConstant - Spring constant k in N/m
 * @returns Potential function V(x) in Joules
 */
export function createHarmonicOscillatorPotential(springConstant: number): PotentialFunction {
  return (x: number) => {
    return 0.5 * springConstant * x * x;
  };
}

/**
 * Calculate the classical turning points for a harmonic oscillator.
 * Turning points occur where E = V(x) = (1/2)kx², so x = ±√(2E/k)
 *
 * @param springConstant - Spring constant k in N/m
 * @param energy - Energy of the particle in Joules
 * @returns Object with left and right turning point positions (in meters)
 */
export function calculateHarmonicOscillatorTurningPoints(
  springConstant: number,
  energy: number,
): { left: number; right: number } {
  // E = (1/2)kx² => x = ±√(2E/k)
  const amplitude = Math.sqrt((2 * energy) / springConstant);

  return {
    left: -amplitude,
    right: amplitude,
  };
}

/**
 * Calculate the first derivative of the wavefunction for a harmonic oscillator.
 *
 * For ψ_n(x) = N_n * exp(-αx²/2) * H_n(ξ) where ξ = αx and α = mω/ℏ:
 * ψ'_n(x) = N_n * α * exp(-αx²/2) * [H'_n(ξ) - ξ * H_n(ξ)]
 *         = N_n * α * exp(-αx²/2) * [2n H_{n-1}(ξ) - ξ * H_n(ξ)]
 * using the Hermite polynomial recursion relation H'_n(ξ) = 2n H_{n-1}(ξ)
 *
 * @param springConstant - Spring constant k in N/m
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for ground state, 1 for first excited, etc.)
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of first derivative values
 */
export function calculateHarmonicOscillatorWavefunctionFirstDerivative(
  springConstant: number,
  mass: number,
  stateIndex: number,
  xGrid: number[],
): number[] {
  const { HBAR } = QuantumConstants;
  const n = stateIndex; // Quantum number (0, 1, 2, ...)
  const omega = Math.sqrt(springConstant / mass);
  const alpha = Math.sqrt((mass * omega) / HBAR);
  // Normalization: (mω/(πℏ))^(1/4) / √(2^n n!) = (α²/π)^(1/4) / √(2^n n!)
  const normalization = (1 / Math.sqrt(2 ** n * factorial(n))) * ((alpha * alpha) / Math.PI) ** 0.25;

  const firstDerivative: number[] = [];

  for (const x of xGrid) {
    const xi = alpha * x;
    const gaussianFactor = Math.exp((-xi * xi) / 2);
    const hermiteN = hermitePolynomial(n, xi);

    // Calculate H'_n(ξ) = 2n H_{n-1}(ξ)
    let hermiteDerivative = 0;
    if (n > 0) {
      const hermiteNMinus1 = hermitePolynomial(n - 1, xi);
      hermiteDerivative = 2 * n * hermiteNMinus1;
    }

    // ψ' = N * α * exp(-αx²/2) * [H'_n(ξ) - ξ * H_n(ξ)]
    const firstDeriv = normalization * alpha * gaussianFactor * (hermiteDerivative - xi * hermiteN);
    firstDerivative.push(firstDeriv);
  }

  return firstDerivative;
}

/**
 * Calculate the second derivative of the wavefunction for a harmonic oscillator.
 *
 * For ψ_n(x) = N_n * exp(-αx²/2) * H_n(√α x) where α = mω/ℏ and N_n is normalization:
 * ψ''_n uses the chain rule and Hermite polynomial recursion relations:
 * - H'_n(ξ) = 2n H_{n-1}(ξ)
 * - H''_n(ξ) = 4n(n-1) H_{n-2}(ξ)
 *
 * @param springConstant - Spring constant k in N/m
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for ground state, 1 for first excited, etc.)
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of second derivative values
 */
export function calculateHarmonicOscillatorWavefunctionSecondDerivative(
  springConstant: number,
  mass: number,
  stateIndex: number,
  xGrid: number[],
): number[] {
  const { HBAR } = QuantumConstants;
  const n = stateIndex; // Quantum number (0, 1, 2, ...)
  const omega = Math.sqrt(springConstant / mass);
  const alpha = Math.sqrt((mass * omega) / HBAR);
  // Normalization: (mω/(πℏ))^(1/4) / √(2^n n!) = (α²/π)^(1/4) / √(2^n n!)
  const normalization = (1 / Math.sqrt(2 ** n * factorial(n))) * ((alpha * alpha) / Math.PI) ** 0.25;

  const secondDerivative: number[] = [];

  for (const x of xGrid) {
    const xi = alpha * x;
    const gaussianFactor = Math.exp((-xi * xi) / 2);
    const hermiteN = hermitePolynomial(n, xi);

    // Calculate H'_n(ξ) = 2n H_{n-1}(ξ)
    let hermiteDerivative = 0;
    if (n > 0) {
      const hermiteNMinus1 = hermitePolynomial(n - 1, xi);
      hermiteDerivative = 2 * n * hermiteNMinus1;
    }

    // Calculate H''_n(ξ) = 4n(n-1) H_{n-2}(ξ)
    let hermiteSecondDerivative = 0;
    if (n > 1) {
      const hermiteNMinus2 = hermitePolynomial(n - 2, xi);
      hermiteSecondDerivative = 4 * n * (n - 1) * hermiteNMinus2;
    }

    // ψ'' = N * exp(-ξ²/2) * α² * [ξ²H_n(ξ) - H_n(ξ) - 2ξH'_n(ξ) + H''_n(ξ)]
    // where ξ = αx
    // The α² factor comes from the chain rule: d²/dx² = α² * d²/dξ²
    const secondDeriv =
      normalization *
      gaussianFactor *
      alpha *
      alpha *
      (xi * xi * hermiteN - hermiteN - 2 * xi * hermiteDerivative + hermiteSecondDerivative);
    secondDerivative.push(secondDeriv);
  }

  return secondDerivative;
}

/**
 * Calculate the minimum and maximum values of the wavefunction for a harmonic oscillator.
 *
 * For ψ_n(x) = N_n · exp(-αx²/2) · H_n(√α x), the function is sampled at multiple points
 * in the range [xMin, xMax] to find the extrema and their positions.
 *
 * @param springConstant - Spring constant k in N/m
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for ground state, 1 for first excited, etc.)
 * @param xMin - Left boundary of the region in meters
 * @param xMax - Right boundary of the region in meters
 * @param numPoints - Number of points to sample (default: 1000)
 * @returns Object containing min/max values and x-positions of all extrema
 */
export function calculateHarmonicOscillatorWavefunctionMinMax(
  springConstant: number,
  mass: number,
  stateIndex: number,
  xMin: number,
  xMax: number,
  numPoints: number = 1000,
): { min: number; max: number; extremaPositions: number[] } {
  const { HBAR } = QuantumConstants;
  const n = stateIndex; // Quantum number (0, 1, 2, ...)
  const omega = Math.sqrt(springConstant / mass);
  const alpha = Math.sqrt((mass * omega) / HBAR);
  // Normalization: (mω/(πℏ))^(1/4) / √(2^n n!) = (α²/π)^(1/4) / √(2^n n!)
  const normalization = (1 / Math.sqrt(2 ** n * factorial(n))) * ((alpha * alpha) / Math.PI) ** 0.25;

  let min = Infinity;
  let max = -Infinity;
  const extremaPositions: number[] = [];

  const dx = (xMax - xMin) / (numPoints - 1);
  let prevDerivativeSign: number | null = null;

  for (let i = 0; i < numPoints; i++) {
    const x = xMin + i * dx;

    const xi = alpha * x;
    const gaussianFactor = Math.exp((-xi * xi) / 2);
    const hermiteN = hermitePolynomial(n, xi);
    const psi = normalization * gaussianFactor * hermiteN;

    // Calculate first derivative for extrema detection
    // ψ'_n(x) = N * α * exp(-αx²/2) * [H'_n(ξ) - ξ * H_n(ξ)]
    // where H'_n(ξ) = 2n H_{n-1}(ξ)
    let hermiteDerivative = 0;
    if (n > 0) {
      const hermiteNMinus1 = hermitePolynomial(n - 1, xi);
      hermiteDerivative = 2 * n * hermiteNMinus1;
    }
    const derivative = normalization * alpha * gaussianFactor * (hermiteDerivative - xi * hermiteN);

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
 * Calculate the analytical Fourier transform of harmonic oscillator wavefunctions.
 *
 * The harmonic oscillator has a remarkable property: its wavefunctions are
 * Hermite-Gaussian functions, which are eigenfunctions of the Fourier transform.
 *
 * For ψ_n(x) = N_n exp(-α²x²/2) H_n(αx) where α = √(mω/ℏ):
 * φ_n(p) = N_n exp(-p²/(2α²ℏ²)) H_n(p/(αℏ)) (-i)^n / √ℏ
 *
 * This means the momentum-space wavefunction has the same Hermite polynomial
 * structure as the position-space wavefunction!
 *
 * @param springConstant - Spring constant k in N/m
 * @param mass - Particle mass in kg
 * @param numStates - Number of states to transform
 * @param numMomentumPoints - Number of points in momentum space
 * @param pMax - Maximum momentum value in kg·m/s
 * @returns Momentum-space wavefunctions
 */
export function calculateHarmonicOscillatorFourierTransform(
  springConstant: number,
  mass: number,
  numStates: number,
  numMomentumPoints: number,
  pMax: number,
): { pGrid: number[]; momentumWavefunctions: number[][] } {
  const { HBAR } = QuantumConstants;
  const omega = Math.sqrt(springConstant / mass);
  const alpha = Math.sqrt((mass * omega) / HBAR);

  // Create momentum grid
  const pGrid: number[] = [];
  const dp = (2 * pMax) / (numMomentumPoints - 1);
  for (let i = 0; i < numMomentumPoints; i++) {
    pGrid.push(-pMax + i * dp);
  }

  // Calculate Fourier transform for each state
  const momentumWavefunctions: number[][] = [];

  for (let n = 0; n < numStates; n++) {
    const phiP: number[] = [];

    // Normalization in momentum space: (ℏ/(π mω))^(1/4) / √(2^n n!) = (1/(α²π))^(1/4) / √(2^n n!)
    const normalization = (1 / Math.sqrt(2 ** n * factorial(n))) * (1 / (alpha * alpha * Math.PI)) ** 0.25;

    for (const p of pGrid) {
      // Argument for Hermite polynomial in momentum space
      const xiP = p / (alpha * HBAR);

      // Gaussian factor in momentum space
      const gaussianFactor = Math.exp((-xiP * xiP) / 2);

      // Hermite polynomial (same order as position space)
      const hermite = hermitePolynomial(n, xiP);

      // The Fourier transform includes a phase factor (-i)^n, but since we're
      // taking the magnitude for real display, this becomes 1
      // The full result would be: normalization * gaussianFactor * hermite * (-i)^n
      // But |(-i)^n| = 1, so we just take the absolute value
      const value = Math.abs(normalization * gaussianFactor * hermite);

      phiP.push(value);
    }

    momentumWavefunctions.push(phiP);
  }

  return { pGrid, momentumWavefunctions };
}

/**
 * Class-based implementation of harmonic oscillator analytical solution.
 * Extends the AnalyticalSolution abstract base class.
 */
export class HarmonicOscillatorSolution extends AnalyticalSolution {
  private springConstant: number;
  private mass: number;

  constructor(springConstant: number, mass: number) {
    super();
    this.springConstant = springConstant;
    this.mass = mass;
  }

  solve(numStates: number, gridConfig: GridConfig): BoundStateResult {
    return solveHarmonicOscillator(this.springConstant, this.mass, numStates, gridConfig);
  }

  createPotential(): PotentialFunction {
    return createHarmonicOscillatorPotential(this.springConstant);
  }

  calculateTurningPoints(energy: number): Array<{ left: number; right: number }> {
    const points = calculateHarmonicOscillatorTurningPoints(this.springConstant, energy);
    return [points]; // Return as array with single element for simple single-well potential
  }

  calculateWavefunctionFirstDerivative(stateIndex: number, xGrid: number[]): number[] {
    return calculateHarmonicOscillatorWavefunctionFirstDerivative(this.springConstant, this.mass, stateIndex, xGrid);
  }

  calculateWavefunctionSecondDerivative(stateIndex: number, xGrid: number[]): number[] {
    return calculateHarmonicOscillatorWavefunctionSecondDerivative(this.springConstant, this.mass, stateIndex, xGrid);
  }

  calculateWavefunctionMinMax(
    stateIndex: number,
    xMin: number,
    xMax: number,
    numPoints?: number,
  ): { min: number; max: number; extremaPositions: number[] } {
    return calculateHarmonicOscillatorWavefunctionMinMax(
      this.springConstant,
      this.mass,
      stateIndex,
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
    const { HBAR } = QuantumConstants;
    const numStates = boundStateResult.energies.length;
    const omega = Math.sqrt(this.springConstant / mass);

    // Determine number of momentum points
    const nMomentum = numMomentumPoints || boundStateResult.xGrid.length;

    // Determine pMax if not provided
    // For harmonic oscillator, use a momentum scale based on ℏω
    const alpha = Math.sqrt((mass * omega) / HBAR);
    const defaultPMax = alpha * HBAR * 5; // ~5 times the characteristic momentum
    const actualPMax = pMax || defaultPMax;

    // Use analytical Fourier transform
    const { pGrid, momentumWavefunctions } = calculateHarmonicOscillatorFourierTransform(
      this.springConstant,
      mass,
      numStates,
      nMomentum,
      actualPMax,
    );

    return {
      pGrid,
      momentumWavefunctions,
      method: "analytical",
    };
  }
}

/**
 * Analytical solution for a quantum harmonic oscillator.
 * V(x) = (1/2) * k * x^2 = (1/2) * m * ω^2 * x^2
 *
 * @param springConstant - Spring constant k in N/m
 * @param mass - Particle mass in kg
 * @param numStates - Number of energy levels to calculate
 * @param gridConfig - Grid configuration for wavefunction evaluation
 * @returns Bound state results with exact energies and wavefunctions
 */
export function solveHarmonicOscillator(
  springConstant: number,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
): BoundStateResult {
  const { HBAR } = QuantumConstants;
  const omega = Math.sqrt(springConstant / mass);

  // Calculate energies: E_n = ℏω(n + 1/2) for n = 0, 1, 2, ...
  const energies: number[] = [];
  for (let n = 0; n < numStates; n++) {
    const energy = HBAR * omega * (n + 0.5);
    energies.push(energy);
  }

  // Generate grid
  const numPoints = gridConfig.numPoints;
  const xGrid: number[] = [];
  const dx = (gridConfig.xMax - gridConfig.xMin) / (numPoints - 1);
  for (let i = 0; i < numPoints; i++) {
    xGrid.push(gridConfig.xMin + i * dx);
  }

  // Calculate wavefunctions using Hermite polynomials
  // ψ_n(x) = (1/√(2^n n!)) * (mω/πℏ)^(1/4) * exp(-mωx^2/(2ℏ)) * H_n(√(mω/ℏ) x)
  const wavefunctions: number[][] = [];
  const alpha = Math.sqrt((mass * omega) / HBAR);

  for (let n = 0; n < numStates; n++) {
    const wavefunction: number[] = [];
    // Normalization: (mω/(πℏ))^(1/4) / √(2^n n!) = (α²/π)^(1/4) / √(2^n n!)
    const normalization = (1 / Math.sqrt(2 ** n * factorial(n))) * ((alpha * alpha) / Math.PI) ** 0.25;

    for (const x of xGrid) {
      const xi = alpha * x;
      const hermite = hermitePolynomial(n, xi);
      const value = normalization * Math.exp((-xi * xi) / 2) * hermite;
      wavefunction.push(value);
    }
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
 * Calculate coherent state coefficients for harmonic oscillator.
 * Coherent states are eigenstates of the annihilation operator and represent
 * the most classical-like quantum states (Glauber states).
 *
 * For a real displacement x₀, the coherent state is:
 * |α⟩ = e^(-α²/2) Σ (α^n/√n!) |n⟩
 * where α = √(mω/2ℏ) * x₀
 *
 * All coefficients are positive for real α (pure displacement, no momentum).
 *
 * @param displacement - Displacement from equilibrium in meters
 * @param springConstant - Spring constant k in N/m
 * @param mass - Particle mass in kg
 * @param numStates - Number of energy eigenstates to include
 * @returns Object with amplitudes and phases arrays
 */
export function calculateCoherentStateCoefficients(
  displacement: number,
  springConstant: number,
  mass: number,
  numStates: number,
): { amplitudes: number[]; phases: number[] } {
  const { HBAR } = QuantumConstants;
  const omega = Math.sqrt(springConstant / mass);

  // Calculate α = √(mω/2ℏ) * x₀
  const alpha = Math.sqrt((mass * omega) / (2 * HBAR)) * displacement;

  // Coefficients c_n = e^(−α²/2) α^n / √n!, computed in log space: for large α or n the direct form
  // overflows (α^n, n!) or underflows (the prefactor) to ∞/∞ = NaN. The common prefactor cancels in
  // the normalization, so only log|c_n| = n ln|α| − ½ ln n! is needed, shifted by its maximum.
  const logAbsAlpha = Math.log(Math.abs(alpha));
  const logMagnitudes: number[] = [];
  let logFactorial = 0;
  for (let n = 0; n < numStates; n++) {
    if (n > 0) {
      logFactorial += Math.log(n);
    }
    logMagnitudes.push(alpha === 0 ? (n === 0 ? 0 : -Infinity) : n * logAbsAlpha - logFactorial / 2);
  }
  const maxLog = Math.max(...logMagnitudes);
  const amplitudes = logMagnitudes.map((logMagnitude, n) => {
    const sign = alpha < 0 && n % 2 === 1 ? -1 : 1;
    return sign * Math.exp(logMagnitude - maxLog);
  });

  // Normalize over the states kept (the truncated Poisson distribution)
  const norm = Math.sqrt(amplitudes.reduce((sum, a) => sum + a * a, 0));
  for (let i = 0; i < amplitudes.length; i++) {
    amplitudes[i]! /= norm;
  }

  // All phases are zero for a real coherent state (pure displacement)
  const phases = new Array(numStates).fill(0);

  return { amplitudes, phases };
}
