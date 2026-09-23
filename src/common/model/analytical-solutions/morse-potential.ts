/**
 * Analytical solution for the Morse potential.
 * V(x) = D_e * (1 - exp(-(x - x_e)/a))^2
 *
 * The Morse potential describes molecular vibrations more accurately than the harmonic oscillator
 * by including anharmonic effects and bond dissociation.
 *
 * REFERENCES:
 * - Morse, P. M. (1929). "Diatomic Molecules According to the Wave Mechanics. II. Vibrational Levels".
 *   Physical Review, 34(1), 57-64.
 *   https://doi.org/10.1103/PhysRev.34.57
 *   ORIGINAL PAPER: Introduced the Morse potential and derived exact solutions.
 *
 * - Flügge, S. (1999). "Practical Quantum Mechanics". Springer.
 *   Problem 38, pp. 94-95. https://doi.org/10.1007/978-3-642-61995-3
 *   Detailed solution procedure using associated Laguerre polynomials.
 *
 * - Cooper, I. L. (1993). "An Accurate Analytic Solution of the Morse Oscillator Problem".
 *   Journal of Chemical Education, 70(11), 887.
 *   https://doi.org/10.1021/ed070p887
 *   Pedagogical treatment with explicit wavefunctions.
 *
 * - Dahl, J. P., & Springborg, M. (1988). "The Morse oscillator in position space, momentum space,
 *   and phase space". Journal of Chemical Physics, 88(7), 4535-4547.
 *   https://doi.org/10.1063/1.453761
 *   Complete phase-space analysis of Morse oscillator.
 *
 * ENERGY EIGENVALUES:
 *   E_n = ℏω(n + 1/2) - (ℏω)²(n + 1/2)²/(4D_e) - D_e,  n = 0, 1, 2, ..., n_max
 *   where ω = (1/a)√(2D_e/m) and n_max = floor(a√(2mD_e)/ℏ - 1/2)
 *
 * WAVEFUNCTIONS:
 *   ψ_n(z) = N_n · z^(λ-n-1/2) · exp(-z/2) · L_n^(2λ-2n-1)(z)
 *   where z = 2λ exp(-(x-x_e)/a), λ = a√(2mD_e)/ℏ
 */

import { NoBoundStatesError } from "../NoBoundStatesError.js";
import type { BoundStateResult, FourierTransformResult, GridConfig, PotentialFunction } from "../PotentialFunction.js";
import QuantumConstants from "../QuantumConstants.js";
import { AnalyticalSolution } from "./AnalyticalSolution.js";
import { computeNumericalFourierTransform } from "./fourier-transform-helper.js";
import { associatedLaguerre } from "./math-utilities.js";

/**
 * Class-based implementation of Morse potential analytical solution.
 * Extends the AnalyticalSolution abstract base class.
 */
export class MorsePotentialSolution extends AnalyticalSolution {
  private dissociationEnergy: number;
  private wellWidth: number;
  private equilibriumPosition: number;
  private mass: number;

  constructor(dissociationEnergy: number, wellWidth: number, equilibriumPosition: number, mass: number) {
    super();
    this.dissociationEnergy = dissociationEnergy;
    this.wellWidth = wellWidth;
    this.equilibriumPosition = equilibriumPosition;
    this.mass = mass;
  }

  solve(numStates: number, gridConfig: GridConfig): BoundStateResult {
    return solveMorsePotential(
      this.dissociationEnergy,
      this.wellWidth,
      this.equilibriumPosition,
      this.mass,
      numStates,
      gridConfig,
    );
  }

  createPotential(): PotentialFunction {
    return createMorsePotential(this.dissociationEnergy, this.wellWidth, this.equilibriumPosition);
  }

  calculateClassicalProbability(energy: number, mass: number, xGrid: number[]): number[] {
    return calculateMorsePotentialClassicalProbability(
      this.dissociationEnergy,
      this.wellWidth,
      this.equilibriumPosition,
      energy,
      mass,
      xGrid,
    );
  }

  calculateWavefunctionZeros(stateIndex: number, _energy: number): number[] {
    return calculateMorsePotentialWavefunctionZeros(
      this.dissociationEnergy,
      this.wellWidth,
      this.equilibriumPosition,
      this.mass,
      stateIndex,
    );
  }

  calculateTurningPoints(energy: number): Array<{ left: number; right: number }> {
    const points = calculateMorsePotentialTurningPoints(
      this.dissociationEnergy,
      this.wellWidth,
      this.equilibriumPosition,
      energy,
    );
    return [points]; // Return as array with single element for simple single-well potential
  }

  calculateWavefunctionFirstDerivative(stateIndex: number, xGrid: number[]): number[] {
    return calculateMorsePotentialWavefunctionFirstDerivative(
      this.dissociationEnergy,
      this.wellWidth,
      this.equilibriumPosition,
      this.mass,
      stateIndex,
      xGrid,
    );
  }

  calculateWavefunctionSecondDerivative(stateIndex: number, xGrid: number[]): number[] {
    return calculateMorsePotentialWavefunctionSecondDerivative(
      this.dissociationEnergy,
      this.wellWidth,
      this.equilibriumPosition,
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
    return calculateMorsePotentialWavefunctionMinMax(
      this.dissociationEnergy,
      this.wellWidth,
      this.equilibriumPosition,
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
    return calculateMorsePotentialSuperpositionMinMax(
      this.dissociationEnergy,
      this.wellWidth,
      this.equilibriumPosition,
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
    return computeNumericalFourierTransform(boundStateResult, mass, this.dissociationEnergy, numMomentumPoints, pMax);
  }
}

/**
 * Analytical solution for the Morse potential.
 * V(x) = D_e * (1 - exp(-(x - x_e)/a))^2
 *
 * The Morse potential describes molecular vibrations more accurately than the harmonic oscillator
 * by including anharmonic effects and bond dissociation.
 *
 * @param dissociationEnergy - Dissociation energy D_e in Joules
 * @param wellWidth - Width parameter a in meters
 * @param equilibriumPosition - Equilibrium position x_e in meters
 * @param mass - Particle mass in kg
 * @param numStates - Number of energy levels to calculate
 * @param gridConfig - Grid configuration for wavefunction evaluation
 * @returns Bound state results with exact energies and wavefunctions
 */
export function solveMorsePotential(
  dissociationEnergy: number,
  wellWidth: number,
  equilibriumPosition: number,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
): BoundStateResult {
  const { HBAR } = QuantumConstants;
  const De = dissociationEnergy;
  const a = wellWidth;
  const xe = equilibriumPosition;

  // Calculate the maximum quantum number
  // With substitution a_old = 1/a_new:
  // n_max = floor(a * sqrt(2*m*D_e)/ℏ - 1/2)
  const lambda = (a * Math.sqrt(2 * mass * De)) / HBAR;
  const nMax = Math.floor(lambda - 0.5);
  const actualNumStates = Math.min(numStates, nMax + 1);

  if (actualNumStates <= 0) {
    throw new NoBoundStatesError("Morse potential too shallow to support bound states");
  }

  // Calculate the characteristic frequency
  // ω = sqrt(2*D_e/m) / a
  const omega = Math.sqrt((2 * De) / mass) / a;

  // Calculate energies: E_n = ℏω(n + 1/2) - (ℏω)²(n + 1/2)² / (4*D_e)
  // Relative to the bottom of the well
  const energies: number[] = [];
  for (let n = 0; n < actualNumStates; n++) {
    const term1 = HBAR * omega * (n + 0.5);
    const term2 = (HBAR * HBAR * omega * omega * (n + 0.5) * (n + 0.5)) / (4 * De);
    const energy = term1 - term2 - De; // Energy relative to dissociation limit
    energies.push(energy);
  }

  // Generate grid
  const numPoints = gridConfig.numPoints;
  const xGrid: number[] = [];
  const dx = (gridConfig.xMax - gridConfig.xMin) / (numPoints - 1);
  for (let i = 0; i < numPoints; i++) {
    xGrid.push(gridConfig.xMin + i * dx);
  }

  // Calculate wavefunctions using associated Laguerre polynomials
  // ψ_n(z) = N_n * z^((λ-n-1/2)) * exp(-z/2) * L_n^(2λ-2n-1)(z)
  // where z = 2λ * exp(-(x-xe)/a), λ = a * sqrt(2*m*D_e)/ℏ
  const wavefunctions: number[][] = [];

  for (let n = 0; n < actualNumStates; n++) {
    const psiRaw: number[] = [];
    const alpha = 2 * lambda - 2 * n - 1;

    // First, calculate unnormalized wavefunction
    for (const x of xGrid) {
      const z = 2 * lambda * Math.exp(-(x - xe) / a);

      // Calculate wavefunction without normalization
      const exponent = lambda - n - 0.5;
      const laguerre = associatedLaguerre(n, alpha, z);
      const value = z ** exponent * Math.exp(-z / 2) * laguerre;

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
 * Create the potential function for a Morse potential.
 * V(x) = D_e * (1 - exp(-(x - x_e)/a))^2 - D_e
 *
 * @param dissociationEnergy - Dissociation energy D_e in Joules
 * @param wellWidth - Width parameter a in meters
 * @param equilibriumPosition - Equilibrium position x_e in meters
 * @returns Potential function V(x) in Joules
 */
export function createMorsePotential(
  dissociationEnergy: number,
  wellWidth: number,
  equilibriumPosition: number,
): (x: number) => number {
  const De = dissociationEnergy;
  const a = wellWidth;
  const xe = equilibriumPosition;

  return (x: number) => {
    const exponent = Math.exp(-(x - xe) / a);
    return De * (1 - exponent) ** 2 - De;
  };
}

/**
 * Calculate classical probability density for a Morse potential.
 * P(x) ∝ 1/v(x) = 1/√[2(E - V(x))/m]
 *
 * @param dissociationEnergy - Dissociation energy D_e in Joules
 * @param wellWidth - Width parameter a in meters
 * @param equilibriumPosition - Equilibrium position x_e in meters
 * @param energy - Energy of the particle in Joules
 * @param mass - Particle mass in kg
 * @param xGrid - Array of x positions in meters
 * @returns Array of normalized classical probability density values (in 1/meters)
 */
export function calculateMorsePotentialClassicalProbability(
  dissociationEnergy: number,
  wellWidth: number,
  equilibriumPosition: number,
  energy: number,
  mass: number,
  xGrid: number[],
): number[] {
  const potentialFn = createMorsePotential(dissociationEnergy, wellWidth, equilibriumPosition);

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
 * Calculate the classical turning points for a Morse potential.
 * Solve E = D_e * (1 - exp(-(x - x_e)/a))^2 - D_e for x
 *
 * @param dissociationEnergy - Dissociation energy D_e in Joules
 * @param wellWidth - Width parameter a in meters
 * @param equilibriumPosition - Equilibrium position x_e in meters
 * @param energy - Energy of the particle in Joules
 * @returns Object with left and right turning point positions (in meters)
 */
export function calculateMorsePotentialTurningPoints(
  dissociationEnergy: number,
  wellWidth: number,
  equilibriumPosition: number,
  energy: number,
): { left: number; right: number } {
  const De = dissociationEnergy;
  const a = wellWidth;
  const xe = equilibriumPosition;

  // Solve: E = De * (1 - exp(-(x - xe)/a))^2 - De
  // => (E + De) / De = (1 - exp(-(x - xe)/a))^2
  // => sqrt((E + De) / De) = |1 - exp(-(x - xe)/a)|
  // => 1 - exp(-(x - xe)/a) = ±sqrt((E + De) / De)

  const ratio = Math.sqrt((energy + De) / De);

  // Two solutions:
  // exp(-(x - xe)/a) = 1 - ratio  (right turning point, x > xe)
  // exp(-(x - xe)/a) = 1 + ratio  (left turning point, x < xe)

  const left = xe + a * Math.log(1 / (1 + ratio));
  const right = xe + a * Math.log(1 / (1 - ratio));

  return { left, right };
}

/**
 * Helper function to compute normalization constant for a Morse wavefunction.
 * Uses numerical integration to ensure ∫|ψ|² dx = 1.
 *
 * @param a - Well width parameter in meters
 * @param lambda - Dimensionless parameter (a * sqrt(2*m*D_e)/ℏ)
 * @param n - State index
 * @param xe - Equilibrium position in meters
 * @param xMin - Left boundary for integration
 * @param xMax - Right boundary for integration
 * @param numPoints - Number of points for integration (default: 1000)
 * @returns Normalization constant
 */
function computeMorseNormalization(
  a: number,
  lambda: number,
  n: number,
  xe: number,
  xMin: number = -20e-9,
  xMax: number = 20e-9,
  numPoints: number = 1000,
): number {
  const alpha = 2 * lambda - 2 * n - 1;
  const exponent = lambda - n - 0.5;
  const dx = (xMax - xMin) / (numPoints - 1);
  let normSq = 0;

  for (let i = 0; i < numPoints; i++) {
    const x = xMin + i * dx;
    const z = 2 * lambda * Math.exp(-(x - xe) / a);
    const laguerre = associatedLaguerre(n, alpha, z);
    const psi = z ** exponent * Math.exp(-z / 2) * laguerre;
    normSq += psi * psi * dx;
  }

  return 1 / Math.sqrt(normSq);
}

/**
 * Calculate wavefunction zeros for Morse potential (numerical approach).
 * Finds zeros by detecting sign changes in the wavefunction.
 *
 * @param dissociationEnergy - Dissociation energy D_e in Joules
 * @param wellWidth - Width parameter a in meters
 * @param equilibriumPosition - Equilibrium position x_e in meters
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for ground state, etc.)
 * @param searchRange - Range to search for zeros (in meters from equilibrium)
 * @returns Array of x positions (in meters) where wavefunction is zero
 */
export function calculateMorsePotentialWavefunctionZeros(
  dissociationEnergy: number,
  wellWidth: number,
  equilibriumPosition: number,
  mass: number,
  stateIndex: number,
  searchRange: number = 10e-9,
): number[] {
  const { HBAR } = QuantumConstants;
  const De = dissociationEnergy;
  const a = wellWidth;
  const xe = equilibriumPosition;
  const n = stateIndex;

  const lambda = (a * Math.sqrt(2 * mass * De)) / HBAR;
  const alpha = 2 * lambda - 2 * n - 1;
  const exponent = lambda - n - 0.5;

  // Ground state has no zeros
  if (n === 0) {
    return [];
  }

  const zeros: number[] = [];
  const numSamples = 1000;
  const xMin = xe - searchRange;
  const xMax = xe + searchRange;
  const dx = (xMax - xMin) / numSamples;

  let prevX = xMin;
  const prevZ = 2 * lambda * Math.exp(-(prevX - xe) / a);
  let prevVal = prevZ ** exponent * Math.exp(-prevZ / 2) * associatedLaguerre(n, alpha, prevZ);

  for (let i = 1; i <= numSamples; i++) {
    const x = xMin + i * dx;
    const z = 2 * lambda * Math.exp(-(x - xe) / a);
    const val = z ** exponent * Math.exp(-z / 2) * associatedLaguerre(n, alpha, z);

    // Sign change detected
    if (prevVal * val < 0) {
      // Use bisection to refine
      let left = prevX;
      let right = x;
      for (let iter = 0; iter < 20; iter++) {
        const mid = (left + right) / 2;
        const zMid = 2 * lambda * Math.exp(-(mid - xe) / a);
        const valMid = zMid ** exponent * Math.exp(-zMid / 2) * associatedLaguerre(n, alpha, zMid);

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
 * Calculate the first derivative of the wavefunction for a Morse potential.
 * Uses numerical differentiation on the analytical wavefunction.
 *
 * @param dissociationEnergy - Dissociation energy D_e in Joules
 * @param wellWidth - Width parameter a in meters
 * @param equilibriumPosition - Equilibrium position x_e in meters
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for ground state, etc.)
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of first derivative values
 */
export function calculateMorsePotentialWavefunctionFirstDerivative(
  dissociationEnergy: number,
  wellWidth: number,
  equilibriumPosition: number,
  mass: number,
  stateIndex: number,
  xGrid: number[],
): number[] {
  const { HBAR } = QuantumConstants;
  const De = dissociationEnergy;
  const a = wellWidth;
  const xe = equilibriumPosition;
  const n = stateIndex;

  const lambda = (a * Math.sqrt(2 * mass * De)) / HBAR;
  const alpha = 2 * lambda - 2 * n - 1;
  const exponent = lambda - n - 0.5;

  // Get numerical normalization constant
  const xMin = xGrid[0];
  const xMax = xGrid[xGrid.length - 1];
  const normalization = computeMorseNormalization(a, lambda, n, xe, xMin, xMax);

  const firstDerivative: number[] = [];
  const h = 1e-12; // Small step for numerical differentiation

  for (const x of xGrid) {
    // Evaluate at x-h and x+h
    const xMinus = x - h;
    const xPlus = x + h;

    const zMinus = 2 * lambda * Math.exp(-(xMinus - xe) / a);
    const zPlus = 2 * lambda * Math.exp(-(xPlus - xe) / a);

    const psiMinus = normalization * zMinus ** exponent * Math.exp(-zMinus / 2) * associatedLaguerre(n, alpha, zMinus);

    const psiPlus = normalization * zPlus ** exponent * Math.exp(-zPlus / 2) * associatedLaguerre(n, alpha, zPlus);

    // First derivative using central difference
    const firstDeriv = (psiPlus - psiMinus) / (2 * h);
    firstDerivative.push(firstDeriv);
  }

  return firstDerivative;
}

/**
 * Calculate the second derivative of the wavefunction for a Morse potential.
 * Uses numerical differentiation on the analytical wavefunction.
 *
 * @param dissociationEnergy - Dissociation energy D_e in Joules
 * @param wellWidth - Width parameter a in meters
 * @param equilibriumPosition - Equilibrium position x_e in meters
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for ground state, etc.)
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of second derivative values
 */
export function calculateMorsePotentialWavefunctionSecondDerivative(
  dissociationEnergy: number,
  wellWidth: number,
  equilibriumPosition: number,
  mass: number,
  stateIndex: number,
  xGrid: number[],
): number[] {
  const { HBAR } = QuantumConstants;
  const De = dissociationEnergy;
  const a = wellWidth;
  const xe = equilibriumPosition;
  const n = stateIndex;

  const lambda = (a * Math.sqrt(2 * mass * De)) / HBAR;
  const alpha = 2 * lambda - 2 * n - 1;
  const exponent = lambda - n - 0.5;

  // Get numerical normalization constant
  const xMin = xGrid[0];
  const xMax = xGrid[xGrid.length - 1];
  const normalization = computeMorseNormalization(a, lambda, n, xe, xMin, xMax);

  const secondDerivative: number[] = [];
  const h = 1e-12; // Small step for numerical differentiation

  for (const x of xGrid) {
    // Evaluate at x-h, x, x+h
    const xMinus = x - h;
    const xPlus = x + h;

    const zMinus = 2 * lambda * Math.exp(-(xMinus - xe) / a);
    const z = 2 * lambda * Math.exp(-(x - xe) / a);
    const zPlus = 2 * lambda * Math.exp(-(xPlus - xe) / a);

    const psiMinus = normalization * zMinus ** exponent * Math.exp(-zMinus / 2) * associatedLaguerre(n, alpha, zMinus);

    const psi = normalization * z ** exponent * Math.exp(-z / 2) * associatedLaguerre(n, alpha, z);

    const psiPlus = normalization * zPlus ** exponent * Math.exp(-zPlus / 2) * associatedLaguerre(n, alpha, zPlus);

    // Second derivative using central difference
    const secondDeriv = (psiPlus - 2 * psi + psiMinus) / (h * h);
    secondDerivative.push(secondDeriv);
  }

  return secondDerivative;
}

/**
 * Calculate the minimum and maximum values of the wavefunction for a Morse potential.
 *
 * For ψ_n(z) = N_n · z^(λ-n-1/2) · exp(-z/2) · L_n^(2λ-2n-1)(z), the function is sampled
 * at multiple points in the range [xMin, xMax] to find the extrema and their positions.
 *
 * @param dissociationEnergy - Dissociation energy D_e in Joules
 * @param wellWidth - Width parameter a in meters
 * @param equilibriumPosition - Equilibrium position x_e in meters
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for ground state, 1 for first excited, etc.)
 * @param xMin - Left boundary of the region in meters
 * @param xMax - Right boundary of the region in meters
 * @param numPoints - Number of points to sample (default: 1000)
 * @returns Object containing min/max values and x-positions of all extrema
 */
export function calculateMorsePotentialWavefunctionMinMax(
  dissociationEnergy: number,
  wellWidth: number,
  equilibriumPosition: number,
  mass: number,
  stateIndex: number,
  xMin: number,
  xMax: number,
  numPoints: number = 1000,
): { min: number; max: number; extremaPositions: number[] } {
  const { HBAR } = QuantumConstants;
  const De = dissociationEnergy;
  const a = wellWidth;
  const xe = equilibriumPosition;
  const n = stateIndex;

  const lambda = (a * Math.sqrt(2 * mass * De)) / HBAR;
  const alpha = 2 * lambda - 2 * n - 1;
  const exponent = lambda - n - 0.5;

  // Get numerical normalization constant
  const normalization = computeMorseNormalization(a, lambda, n, xe, xMin, xMax, numPoints);

  let min = Infinity;
  let max = -Infinity;
  const extremaPositions: number[] = [];

  const dx = (xMax - xMin) / (numPoints - 1);
  const h = 1e-12; // Small step for numerical derivative
  let prevDerivativeSign: number | null = null;

  for (let i = 0; i < numPoints; i++) {
    const x = xMin + i * dx;

    const z = 2 * lambda * Math.exp(-(x - xe) / a);
    const laguerre = associatedLaguerre(n, alpha, z);
    const psi = normalization * z ** exponent * Math.exp(-z / 2) * laguerre;

    // Calculate derivative using central difference for extrema detection
    let derivative = 0;
    if (i > 0 && i < numPoints - 1) {
      const xMinus = x - h;
      const xPlus = x + h;

      const zMinus = 2 * lambda * Math.exp(-(xMinus - xe) / a);
      const zPlus = 2 * lambda * Math.exp(-(xPlus - xe) / a);

      const psiMinus =
        normalization * zMinus ** exponent * Math.exp(-zMinus / 2) * associatedLaguerre(n, alpha, zMinus);

      const psiPlus = normalization * zPlus ** exponent * Math.exp(-zPlus / 2) * associatedLaguerre(n, alpha, zPlus);

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
 * for a Morse potential.
 *
 * The superposition is: Ψ(x,t) = Σ cₙ ψₙ(x) exp(-iEₙt/ℏ)
 * We return the min/max of the real part of this complex-valued function.
 *
 * @param dissociationEnergy - Dissociation energy D_e in Joules
 * @param wellWidth - Width parameter a in meters
 * @param equilibriumPosition - Equilibrium position x_e in meters
 * @param mass - Particle mass in kg
 * @param coefficients - Complex coefficients for each eigenstate (as [real, imag] pairs)
 * @param energies - Energy eigenvalues in Joules
 * @param time - Time in seconds
 * @param xMin - Left boundary of the region in meters
 * @param xMax - Right boundary of the region in meters
 * @param numPoints - Number of points to sample (default: 1000)
 * @returns Object containing min and max values of the superposition's real part
 */
export function calculateMorsePotentialSuperpositionMinMax(
  dissociationEnergy: number,
  wellWidth: number,
  equilibriumPosition: number,
  mass: number,
  coefficients: Array<[number, number]>,
  energies: number[],
  time: number,
  xMin: number,
  xMax: number,
  numPoints: number = 1000,
): { min: number; max: number } {
  const { HBAR } = QuantumConstants;
  const De = dissociationEnergy;
  const a = wellWidth;
  const xe = equilibriumPosition;

  const lambda = (a * Math.sqrt(2 * mass * De)) / HBAR;

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
      const alpha = 2 * lambda - 2 * n - 1;
      const exponent = lambda - n - 0.5;

      // Get numerical normalization constant
      const normalization = computeMorseNormalization(a, lambda, n, xe, xMin, xMax, numPoints);

      const z = 2 * lambda * Math.exp(-(x - xe) / a);
      const laguerre = associatedLaguerre(n, alpha, z);
      const psi = normalization * z ** exponent * Math.exp(-z / 2) * laguerre;

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
