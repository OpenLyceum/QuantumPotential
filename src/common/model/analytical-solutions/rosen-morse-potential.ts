/**
 * Analytical solution for the Rosen-Morse potential.
 * V(x) = -V_0 / cosh²(x/a) + V_1 * tanh(x/a)
 *
 * This potential is useful for modeling molecular interactions and has exact solutions.
 *
 * REFERENCES:
 * - Rosen, N., & Morse, P. M. (1932). "On the Vibrations of Polyatomic Molecules"
 *   Physical Review, 42(2), 210-217.
 *   https://doi.org/10.1103/PhysRev.42.210
 *   ORIGINAL PAPER: Introduced this potential for molecular vibrations, pages 213-216.
 *
 * - Flügge, S. (1999). "Practical Quantum Mechanics". Springer.
 *   Problem 41, pp. 99-100. https://doi.org/10.1007/978-3-642-61995-3
 *   Detailed solution using hypergeometric functions.
 *
 * - Cooper, F., Khare, A., & Sukhatme, U. (1995). "Supersymmetry and quantum mechanics"
 *   Physics Reports, 251(5-6), 267-385.
 *   https://doi.org/10.1016/0370-1573(94)00080-M
 *   Section 3.4, pp. 285-286: Rosen-Morse as a shape-invariant potential.
 *
 * - Gendenshtein, L. E. (1983). "Derivation of exact spectra of the Schrödinger equation by means
 *   of supersymmetry". JETP Letters, 38(6), 356-359.
 *   Supersymmetric approach to Rosen-Morse and related potentials.
 *
 * - Dong, S. H. (2007). "Factorization Method in Quantum Mechanics". Springer.
 *   Chapter 4, pp. 85-98. https://doi.org/10.1007/978-1-4020-5796-0
 *   Algebraic solution methods for the Rosen-Morse potential.
 *
 * ENERGY EIGENVALUES:
 *   E_n = -(ℏ²/2ma²)(λ_eff - n - 1/2)²,  n = 0, 1, 2, ..., n_max
 *   where λ_eff = √(λ² - μ²), λ = a√(2mV_0)/ℏ, μ = V_1·a√(2m)/(2ℏ√V_0)
 *   Condition for bound states: λ > |μ|
 *
 * WAVEFUNCTIONS:
 *   ψ_n(x) = N_n · sech^s(x/a) · exp(μ·tanh(x/a)) · P_n^(α,β)(tanh(x/a))
 *   where s = λ_eff - n - 1/2, α = s - μ, β = s + μ, and P_n^(α,β) are Jacobi polynomials
 */

import Logger from "../../utils/Logger.js";
import type { BoundStateResult, FourierTransformResult, GridConfig, PotentialFunction } from "../PotentialFunction.js";
import QuantumConstants from "../QuantumConstants.js";
import { AnalyticalSolution } from "./AnalyticalSolution.js";
import { computeNumericalFourierTransform } from "./fourier-transform-helper.js";
import { jacobiPolynomial } from "./math-utilities.js";

/**
 * Class-based implementation of Rosen-Morse potential analytical solution.
 * Extends the AnalyticalSolution abstract base class.
 */
export class RosenMorsePotentialSolution extends AnalyticalSolution {
  private potentialDepth: number;
  private barrierHeight: number;
  private wellWidth: number;
  private mass: number;

  constructor(potentialDepth: number, barrierHeight: number, wellWidth: number, mass: number) {
    super();
    this.potentialDepth = potentialDepth;
    this.barrierHeight = barrierHeight;
    this.wellWidth = wellWidth;
    this.mass = mass;
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

  calculateClassicalProbability(energy: number, mass: number, xGrid: number[]): number[] {
    return calculateRosenMorsePotentialClassicalProbability(
      this.potentialDepth,
      this.barrierHeight,
      this.wellWidth,
      energy,
      mass,
      xGrid,
    );
  }

  calculateWavefunctionZeros(stateIndex: number, _energy: number): number[] {
    return calculateRosenMorsePotentialWavefunctionZeros(
      this.potentialDepth,
      this.barrierHeight,
      this.wellWidth,
      this.mass,
      stateIndex,
    );
  }

  calculateTurningPoints(energy: number): Array<{ left: number; right: number }> {
    const points = calculateRosenMorsePotentialTurningPoints(
      this.potentialDepth,
      this.barrierHeight,
      this.wellWidth,
      energy,
    );
    return [points]; // Return as array with single element for simple single-well potential
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

  calculateSuperpositionMinMax(
    coefficients: Array<[number, number]>,
    energies: number[],
    time: number,
    xMin: number,
    xMax: number,
    numPoints?: number,
  ): { min: number; max: number } {
    return calculateRosenMorsePotentialSuperpositionMinMax(
      this.potentialDepth,
      this.barrierHeight,
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
 * Analytical solution for the Rosen-Morse potential.
 * V(x) = -V_0 / cosh²(x/a) + V_1 * tanh(x/a)
 *
 * This potential is useful for modeling molecular interactions and has exact solutions.
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param barrierHeight - Barrier height V_1 in Joules
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
  const { HBAR } = QuantumConstants;
  const V0 = potentialDepth;
  const V1 = barrierHeight;
  const a = wellWidth;

  // Calculate dimensionless parameters (with x/a substitution)
  // λ = a * sqrt(2*m*V_0) / ℏ
  // μ = V_1 / (2 * sqrt(V_0 * ℏ²/(2*m*a²)))
  // The correct formula for μ should make it dimensionless and scale as V1/sqrt(V0)
  const lambda = (a * Math.sqrt(2 * mass * V0)) / HBAR;

  // Corrected formula: mu should be dimensionless and proportional to V1/sqrt(V0)
  // mu = (a * sqrt(2m) / (2*hbar)) * V1 / sqrt(V0)
  const mu = (a * Math.sqrt(2 * mass) * V1) / (2 * HBAR * Math.sqrt(V0));

  Logger.debug(
    `Rosen-Morse parameters: lambda=${lambda.toFixed(3)}, mu=${mu.toFixed(3)}, |mu|=${Math.abs(mu).toFixed(3)}`,
  );
  Logger.debug(`V0=${(V0 * 6.242e18).toFixed(3)} eV, V1=${(V1 * 6.242e18).toFixed(3)} eV`);

  // For bound states, we need λ > |μ|
  if (lambda <= Math.abs(mu)) {
    throw new Error(
      `Rosen-Morse potential: λ=${lambda.toFixed(3)} ≤ |μ|=${Math.abs(mu).toFixed(3)}. Increase well depth or decrease barrier height.`,
    );
  }

  // Calculate the effective parameter for bound states
  const lambdaEff = Math.sqrt(lambda * lambda - mu * mu);

  // Maximum number of bound states
  const nMax = Math.floor(lambdaEff - 0.5);
  const actualNumStates = Math.min(numStates, nMax + 1);

  if (actualNumStates <= 0) {
    throw new Error(
      "Rosen-Morse potential: No bound states available. Increase well depth or decrease barrier height.",
    );
  }

  // Calculate energies
  // Standard Rosen-Morse energy formula from original 1932 Rosen & Morse paper (Phys. Rev. 42, 210)
  // For hyperbolic potential V(x) = -V₀/cosh²(x/a) + V₁·tanh(x/a)
  // Energy eigenvalues: E_n = -(ℏ²/2ma²) * (λ_eff - n - 1/2)²
  // where λ_eff = √(λ² - μ²), λ = a√(2mV₀)/ℏ, μ = aV₁√(2m)/(2ℏ√V₀)
  // Ground state (n=0) has lowest energy, all states have E < 0 for the symmetric case
  const energies: number[] = [];
  const energyFactor = (HBAR * HBAR) / (2 * mass * a * a);

  for (let n = 0; n < actualNumStates; n++) {
    const sN = lambdaEff - n - 0.5;
    // Standard formula: E_n = -(ℏ²/2ma²) * s_n²
    const energy = -energyFactor * sN * sN;

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
  // ψ_n(x) = N_n * sech^(λ_eff-n-1/2)(x/a) * exp(μ*tanh(x/a)) * P_n^(α,β)(tanh(x/a))
  // where α = λ_eff - n - 1/2 - μ, β = λ_eff - n - 1/2 + μ
  const wavefunctions: number[][] = [];

  for (let n = 0; n < actualNumStates; n++) {
    const psiRaw: number[] = [];
    const s = lambdaEff - n - 0.5;
    const alphaJac = s - mu;
    const betaJac = s + mu;

    // First, calculate unnormalized wavefunction
    for (const x of xGrid) {
      const tanhVal = Math.tanh(x / a);
      const sechVal = 1.0 / Math.cosh(x / a);

      // Calculate wavefunction without normalization
      const jacobiPoly = jacobiPolynomial(n, alphaJac, betaJac, tanhVal);
      const value = sechVal ** s * Math.exp(mu * tanhVal) * jacobiPoly;

      psiRaw.push(value);
    }

    // Normalize wavefunction numerically to ensure ∫|ψ|² dx = 1
    let normSq = 0;
    for (let i = 0; i < psiRaw.length; i++) {
      normSq += psiRaw[i]! * psiRaw[i]! * dx;
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
 * Create the potential function for a Rosen-Morse potential.
 * V(x) = -V_0 / cosh²(x/a) + V_1 * tanh(x/a)
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param barrierHeight - Barrier height V_1 in Joules
 * @param wellWidth - Width parameter a in meters
 * @returns Potential function V(x) in Joules
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
    const tanhVal = Math.tanh(x / a);
    return -V0 / (coshVal * coshVal) + V1 * tanhVal;
  };
}

/**
 * Calculate classical probability density for a Rosen-Morse potential.
 * P(x) ∝ 1/v(x) = 1/√[2(E - V(x))/m]
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param barrierHeight - Barrier height V_1 in Joules
 * @param wellWidth - Width parameter a in meters
 * @param energy - Energy of the particle in Joules
 * @param mass - Particle mass in kg
 * @param xGrid - Array of x positions in meters
 * @returns Array of normalized classical probability density values (in 1/meters)
 */
export function calculateRosenMorsePotentialClassicalProbability(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
  energy: number,
  mass: number,
  xGrid: number[],
): number[] {
  const potentialFn = createRosenMorsePotential(potentialDepth, barrierHeight, wellWidth);

  const classicalProbability: number[] = [];
  let integralSum = 0;

  // Find maximum kinetic energy for epsilon calculation
  let maxKE = 0;
  for (let i = 0; i < xGrid.length; i++) {
    const ke = energy - potentialFn(xGrid[i]!);
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
 * Calculate the classical turning points for a Rosen-Morse potential.
 * Solve E = -V_0 / cosh²(x/a) + V_1 * tanh(x/a) for x numerically
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param barrierHeight - Barrier height V_1 in Joules
 * @param wellWidth - Width parameter a in meters
 * @param energy - Energy of the particle in Joules
 * @returns Object with left and right turning point positions (in meters)
 */
export function calculateRosenMorsePotentialTurningPoints(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
  energy: number,
): { left: number; right: number } {
  const potentialFn = createRosenMorsePotential(potentialDepth, barrierHeight, wellWidth);
  const a = wellWidth;

  // Search for turning points using bisection
  // Start from a wide range and narrow down
  const searchRange = 20 * a;

  // Find left turning point (negative x)
  let leftLow = -searchRange;
  let leftHigh = 0;

  for (let iter = 0; iter < 50; iter++) {
    const mid = (leftLow + leftHigh) / 2;
    const diff = potentialFn(mid) - energy;

    if (Math.abs(diff) < 1e-14 * Math.abs(energy)) {
      leftLow = mid;
      break;
    }

    if (diff > 0) {
      leftLow = mid;
    } else {
      leftHigh = mid;
    }
  }

  // Find right turning point (positive x)
  let rightLow = 0;
  let rightHigh = searchRange;

  for (let iter = 0; iter < 50; iter++) {
    const mid = (rightLow + rightHigh) / 2;
    const diff = potentialFn(mid) - energy;

    if (Math.abs(diff) < 1e-14 * Math.abs(energy)) {
      rightHigh = mid;
      break;
    }

    if (diff > 0) {
      rightHigh = mid;
    } else {
      rightLow = mid;
    }
  }

  return {
    left: (leftLow + leftHigh) / 2,
    right: (rightLow + rightHigh) / 2,
  };
}

/**
 * Helper function to compute normalization constant for a Rosen-Morse wavefunction.
 * Uses numerical integration to ensure ∫|ψ|² dx = 1.
 *
 * @param a - Well width parameter in meters
 * @param s - Wavefunction parameter (λ_eff - n - 1/2)
 * @param mu - Asymmetry parameter
 * @param n - State index
 * @param alpha_jac - Jacobi polynomial alpha parameter
 * @param beta_jac - Jacobi polynomial beta parameter
 * @param xMin - Left boundary for integration
 * @param xMax - Right boundary for integration
 * @param numPoints - Number of points for integration (default: 1000)
 * @returns Normalization constant
 */
function computeRosenMorseNormalization(
  a: number,
  s: number,
  mu: number,
  n: number,
  alphaJac: number,
  betaJac: number,
  xMin: number = -20e-9,
  xMax: number = 20e-9,
  numPoints: number = 1000,
): number {
  const dx = (xMax - xMin) / (numPoints - 1);
  let normSq = 0;

  for (let i = 0; i < numPoints; i++) {
    const x = xMin + i * dx;
    const tanhVal = Math.tanh(x / a);
    const sechVal = 1.0 / Math.cosh(x / a);
    const jacobiPoly = jacobiPolynomial(n, alphaJac, betaJac, tanhVal);
    const psi = sechVal ** s * Math.exp(mu * tanhVal) * jacobiPoly;
    normSq += psi * psi * dx;
  }

  return 1 / Math.sqrt(normSq);
}

/**
 * Calculate wavefunction zeros for Rosen-Morse potential (numerical approach).
 * Finds zeros by detecting sign changes in the wavefunction.
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param barrierHeight - Barrier height V_1 in Joules
 * @param wellWidth - Width parameter a in meters
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for ground state, etc.)
 * @param searchRange - Range to search for zeros (in meters)
 * @returns Array of x positions (in meters) where wavefunction is zero
 */
export function calculateRosenMorsePotentialWavefunctionZeros(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
  mass: number,
  stateIndex: number,
  searchRange: number = 20e-9,
): number[] {
  const { HBAR } = QuantumConstants;
  const V0 = potentialDepth;
  const V1 = barrierHeight;
  const a = wellWidth;
  const n = stateIndex;

  const lambda = (a * Math.sqrt(2 * mass * V0)) / HBAR;
  const mu = (a * Math.sqrt(2 * mass) * V1) / (2 * HBAR * Math.sqrt(V0));
  const lambdaEff = Math.sqrt(lambda * lambda - mu * mu);

  const s = lambdaEff - n - 0.5;
  const alphaJac = s - mu;
  const betaJac = s + mu;

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
  const prevJacobi = jacobiPolynomial(n, alphaJac, betaJac, prevTanh);
  let prevVal = prevSech ** s * Math.exp(mu * prevTanh) * prevJacobi;

  for (let i = 1; i <= numSamples; i++) {
    const x = -searchRange + i * dx;
    const tanhVal = Math.tanh(x / a);
    const sechVal = 1.0 / Math.cosh(x / a);
    const jacobiPoly = jacobiPolynomial(n, alphaJac, betaJac, tanhVal);
    const val = sechVal ** s * Math.exp(mu * tanhVal) * jacobiPoly;

    // Sign change detected
    if (prevVal * val < 0) {
      // Use bisection to refine
      let left = prevX;
      let right = x;
      for (let iter = 0; iter < 20; iter++) {
        const mid = (left + right) / 2;
        const midTanh = Math.tanh(mid / a);
        const midSech = 1.0 / Math.cosh(mid / a);
        const midJacobi = jacobiPolynomial(n, alphaJac, betaJac, midTanh);
        const valMid = midSech ** s * Math.exp(mu * midTanh) * midJacobi;

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
 * Calculate the first derivative of the wavefunction for a Rosen-Morse potential.
 * Uses numerical differentiation on the analytical wavefunction.
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param barrierHeight - Barrier height V_1 in Joules
 * @param wellWidth - Width parameter a in meters
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for ground state, etc.)
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of first derivative values
 */
export function calculateRosenMorsePotentialWavefunctionFirstDerivative(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
  mass: number,
  stateIndex: number,
  xGrid: number[],
): number[] {
  const { HBAR } = QuantumConstants;
  const V0 = potentialDepth;
  const V1 = barrierHeight;
  const a = wellWidth;
  const n = stateIndex;

  const lambda = (a * Math.sqrt(2 * mass * V0)) / HBAR;
  const mu = (a * Math.sqrt(2 * mass) * V1) / (2 * HBAR * Math.sqrt(V0));
  const lambdaEff = Math.sqrt(lambda * lambda - mu * mu);

  const s = lambdaEff - n - 0.5;
  const alphaJac = s - mu;
  const betaJac = s + mu;

  // Compute normalization constant
  const xMin = Math.min(...xGrid);
  const xMax = Math.max(...xGrid);
  const normalization = computeRosenMorseNormalization(a, s, mu, n, alphaJac, betaJac, xMin, xMax, 1000);

  const firstDerivative: number[] = [];
  const h = 1e-12; // Small step for numerical differentiation

  for (const x of xGrid) {
    // Evaluate at x-h, x+h
    const xMinus = x - h;
    const xPlus = x + h;

    const tanhMinus = Math.tanh(xMinus / a);
    const sechMinus = 1.0 / Math.cosh(xMinus / a);
    const jacobiMinus = jacobiPolynomial(n, alphaJac, betaJac, tanhMinus);
    const psiMinus = normalization * sechMinus ** s * Math.exp(mu * tanhMinus) * jacobiMinus;

    const tanhPlus = Math.tanh(xPlus / a);
    const sechPlus = 1.0 / Math.cosh(xPlus / a);
    const jacobiPlus = jacobiPolynomial(n, alphaJac, betaJac, tanhPlus);
    const psiPlus = normalization * sechPlus ** s * Math.exp(mu * tanhPlus) * jacobiPlus;

    // First derivative using central difference
    const firstDeriv = (psiPlus - psiMinus) / (2 * h);
    firstDerivative.push(firstDeriv);
  }

  return firstDerivative;
}

/**
 * Calculate the second derivative of the wavefunction for a Rosen-Morse potential.
 * Uses numerical differentiation on the analytical wavefunction.
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param barrierHeight - Barrier height V_1 in Joules
 * @param wellWidth - Width parameter a in meters
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for ground state, etc.)
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of second derivative values
 */
export function calculateRosenMorsePotentialWavefunctionSecondDerivative(
  potentialDepth: number,
  barrierHeight: number,
  wellWidth: number,
  mass: number,
  stateIndex: number,
  xGrid: number[],
): number[] {
  const { HBAR } = QuantumConstants;
  const V0 = potentialDepth;
  const V1 = barrierHeight;
  const a = wellWidth;
  const n = stateIndex;

  const lambda = (a * Math.sqrt(2 * mass * V0)) / HBAR;
  const mu = (a * Math.sqrt(2 * mass) * V1) / (2 * HBAR * Math.sqrt(V0));
  const lambdaEff = Math.sqrt(lambda * lambda - mu * mu);

  const s = lambdaEff - n - 0.5;
  const alphaJac = s - mu;
  const betaJac = s + mu;

  // Compute normalization constant
  const xMin = Math.min(...xGrid);
  const xMax = Math.max(...xGrid);
  const normalization = computeRosenMorseNormalization(a, s, mu, n, alphaJac, betaJac, xMin, xMax, 1000);

  const secondDerivative: number[] = [];
  const h = 1e-12; // Small step for numerical differentiation

  for (const x of xGrid) {
    // Evaluate at x-h, x, x+h
    const xMinus = x - h;
    const xPlus = x + h;

    const tanhMinus = Math.tanh(xMinus / a);
    const sechMinus = 1.0 / Math.cosh(xMinus / a);
    const jacobiMinus = jacobiPolynomial(n, alphaJac, betaJac, tanhMinus);
    const psiMinus = normalization * sechMinus ** s * Math.exp(mu * tanhMinus) * jacobiMinus;

    const tanh = Math.tanh(x / a);
    const sech = 1.0 / Math.cosh(x / a);
    const jacobi = jacobiPolynomial(n, alphaJac, betaJac, tanh);
    const psi = normalization * sech ** s * Math.exp(mu * tanh) * jacobi;

    const tanhPlus = Math.tanh(xPlus / a);
    const sechPlus = 1.0 / Math.cosh(xPlus / a);
    const jacobiPlus = jacobiPolynomial(n, alphaJac, betaJac, tanhPlus);
    const psiPlus = normalization * sechPlus ** s * Math.exp(mu * tanhPlus) * jacobiPlus;

    // Second derivative using central difference
    const secondDeriv = (psiPlus - 2 * psi + psiMinus) / (h * h);
    secondDerivative.push(secondDeriv);
  }

  return secondDerivative;
}

/**
 * Calculate the minimum and maximum values of the wavefunction for a Rosen-Morse potential.
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param barrierHeight - Barrier height V_1 in Joules
 * @param wellWidth - Width parameter a in meters
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for ground state, etc.)
 * @param xMin - Left boundary of the region in meters
 * @param xMax - Right boundary of the region in meters
 * @param numPoints - Number of points to sample (default: 1000)
 * @returns Object containing min/max values and x-positions of all extrema
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
  const { HBAR } = QuantumConstants;
  const V0 = potentialDepth;
  const V1 = barrierHeight;
  const a = wellWidth;
  const n = stateIndex;

  const lambda = (a * Math.sqrt(2 * mass * V0)) / HBAR;
  const mu = (a * Math.sqrt(2 * mass) * V1) / (2 * HBAR * Math.sqrt(V0));
  const lambdaEff = Math.sqrt(lambda * lambda - mu * mu);

  const s = lambdaEff - n - 0.5;
  const alphaJac = s - mu;
  const betaJac = s + mu;

  // Compute normalization constant
  const normalization = computeRosenMorseNormalization(a, s, mu, n, alphaJac, betaJac, xMin, xMax, numPoints);

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
    const jacobiPoly = jacobiPolynomial(n, alphaJac, betaJac, tanhVal);
    const psi = normalization * sechVal ** s * Math.exp(mu * tanhVal) * jacobiPoly;

    // Calculate derivative using central difference for extrema detection
    let derivative = 0;
    if (i > 0 && i < numPoints - 1) {
      const xMinus = x - h;
      const xPlus = x + h;

      const tanhMinus = Math.tanh(xMinus / a);
      const sechMinus = 1.0 / Math.cosh(xMinus / a);
      const jacobiMinus = jacobiPolynomial(n, alphaJac, betaJac, tanhMinus);
      const psiMinus = normalization * sechMinus ** s * Math.exp(mu * tanhMinus) * jacobiMinus;

      const tanhPlus = Math.tanh(xPlus / a);
      const sechPlus = 1.0 / Math.cosh(xPlus / a);
      const jacobiPlus = jacobiPolynomial(n, alphaJac, betaJac, tanhPlus);
      const psiPlus = normalization * sechPlus ** s * Math.exp(mu * tanhPlus) * jacobiPlus;

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
 * for a Rosen-Morse potential.
 *
 * The superposition is: Ψ(x,t) = Σ cₙ ψₙ(x) exp(-iEₙt/ℏ)
 * We return the min/max of the real part of this complex-valued function.
 *
 * @param potentialDepth - Potential depth V_0 in Joules (positive value)
 * @param barrierHeight - Barrier height V_1 in Joules
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
export function calculateRosenMorsePotentialSuperpositionMinMax(
  potentialDepth: number,
  barrierHeight: number,
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
  const V1 = barrierHeight;
  const a = wellWidth;

  const lambda = (a * Math.sqrt(2 * mass * V0)) / HBAR;
  const mu = (a * Math.sqrt(2 * mass) * V1) / (2 * HBAR * Math.sqrt(V0));
  const lambdaEff = Math.sqrt(lambda * lambda - mu * mu);

  let min = Infinity;
  let max = -Infinity;

  const dx = (xMax - xMin) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const x = xMin + i * dx;
    let realPart = 0;

    for (let n = 0; n < coefficients.length; n++) {
      const [cReal, cImag] = coefficients[n]!;
      const energy = energies[n]!;

      const s = lambdaEff - n - 0.5;
      const alphaJac = s - mu;
      const betaJac = s + mu;

      // Compute normalization constant for this state
      const normalization = computeRosenMorseNormalization(a, s, mu, n, alphaJac, betaJac, xMin, xMax, numPoints);

      const tanhVal = Math.tanh(x / a);
      const sechVal = 1.0 / Math.cosh(x / a);
      const jacobiPoly = jacobiPolynomial(n, alphaJac, betaJac, tanhVal);
      const psi = normalization * sechVal ** s * Math.exp(mu * tanhVal) * jacobiPoly;

      // Time evolution: exp(-iEt/ℏ) = cos(Et/ℏ) - i*sin(Et/ℏ)
      const phase = (-energy * time) / HBAR;
      const cosPhase = Math.cos(phase);
      const sinPhase = Math.sin(phase);

      // Complex multiplication: real part
      realPart += cReal * psi * cosPhase + cImag * psi * sinPhase;
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
