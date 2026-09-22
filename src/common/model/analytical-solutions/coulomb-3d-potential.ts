/**
 * Analytical solution for the 3D Coulomb potential (hydrogen atom, radial equation with L=0).
 * V(r) = -α/r
 *
 * This solves the radial Schrödinger equation for the hydrogen atom with L=0 (s-waves).
 *
 * FREELY AVAILABLE REFERENCES:
 * - Nanni, L. (2015). "The Hydrogen Atom: a Review on the Birth of Modern Quantum Mechanics."
 *   arXiv:1501.05894. https://arxiv.org/abs/1501.05894
 *   Comprehensive review of the hydrogen atom solution in quantum mechanics.
 *
 * - Abramowitz, M., & Stegun, I. A. (1964). "Handbook of Mathematical Functions".
 *   National Bureau of Standards. Section 13.4, pp. 509-515 and Section 22, pp. 773-802.
 *   Available online at https://personal.math.ubc.ca/~cbm/aands/
 *   Properties of associated Laguerre polynomials.
 *
 * The hydrogen atom wavefunctions are derived from the radial Schrödinger equation using
 * series solutions. The treatment of the 3D Coulomb potential and hydrogen-like atoms is
 * well-established in quantum mechanics.
 *
 * ENERGY EIGENVALUES:
 *   E_n = -mα²/(2ℏ²n²),  n = 1, 2, 3, ...
 *   For electron in hydrogen: E_n = -13.6 eV/n² (Rydberg formula)
 *
 * RADIAL WAVEFUNCTIONS (L=0, s-states):
 *   R_{n0}(r) = N_{n0} · (2/na₀)^(3/2) · exp(-r/na₀) · L^1_{n-1}(2r/na₀)
 *   where a₀ = ℏ²/(mα) is the Bohr radius and L^1 are associated Laguerre polynomials
 */

import type { BoundStateResult, FourierTransformResult, GridConfig, PotentialFunction } from "../PotentialFunction.js";
import QuantumConstants from "../QuantumConstants.js";
import { AnalyticalSolution } from "./AnalyticalSolution.js";
import { computeNumericalFourierTransform } from "./fourier-transform-helper.js";
import { associatedLaguerre, factorial } from "./math-utilities.js";

/**
 * Class-based implementation of 3D Coulomb potential analytical solution.
 * Extends the AnalyticalSolution abstract base class.
 */
export class Coulomb3DPotentialSolution extends AnalyticalSolution {
  private coulombStrength: number;
  private mass: number;

  constructor(coulombStrength: number, mass: number) {
    super();
    this.coulombStrength = coulombStrength;
    this.mass = mass;
  }

  solve(numStates: number, gridConfig: GridConfig): BoundStateResult {
    return solveCoulomb3DPotential(this.coulombStrength, this.mass, numStates, gridConfig);
  }

  createPotential(): PotentialFunction {
    return createCoulomb3DPotential(this.coulombStrength);
  }

  calculateClassicalProbability(energy: number, mass: number, xGrid: number[]): number[] {
    return calculateCoulomb3DClassicalProbability(this.coulombStrength, energy, mass, xGrid);
  }

  calculateWavefunctionZeros(stateIndex: number, _energy: number): number[] {
    return calculateCoulomb3DWavefunctionZeros(this.coulombStrength, this.mass, stateIndex);
  }

  calculateTurningPoints(energy: number): Array<{ left: number; right: number }> {
    const points = calculateCoulomb3DTurningPoints(this.coulombStrength, energy);
    return [points]; // Return as array with single element for simple single-well potential
  }

  calculateWavefunctionFirstDerivative(stateIndex: number, xGrid: number[]): number[] {
    return calculateCoulomb3DWavefunctionFirstDerivative(this.coulombStrength, this.mass, stateIndex, xGrid);
  }

  calculateWavefunctionSecondDerivative(stateIndex: number, xGrid: number[]): number[] {
    return calculateCoulomb3DWavefunctionSecondDerivative(this.coulombStrength, this.mass, stateIndex, xGrid);
  }

  calculateWavefunctionMinMax(
    stateIndex: number,
    xMin: number,
    xMax: number,
    numPoints?: number,
  ): { min: number; max: number; extremaPositions: number[] } {
    return calculateCoulomb3DWavefunctionMinMax(this.coulombStrength, this.mass, stateIndex, xMin, xMax, numPoints);
  }

  calculateSuperpositionMinMax(
    coefficients: Array<[number, number]>,
    energies: number[],
    time: number,
    xMin: number,
    xMax: number,
    numPoints?: number,
  ): { min: number; max: number } {
    return calculateCoulomb3DSuperpositionMinMax(
      this.coulombStrength,
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
    return computeNumericalFourierTransform(
      boundStateResult,
      mass,
      Math.abs(boundStateResult.energies[0]!),
      numMomentumPoints,
      pMax,
    );
  }
}

/**
 * Analytical solution for the 3D Coulomb potential (hydrogen atom, radial equation with L=0).
 * V(r) = -α/r
 *
 * This solves the radial Schrödinger equation for the hydrogen atom with L=0 (s-waves).
 * The energy eigenvalues are given by E_n = -mα²/(2ℏ²n²) for n = 1, 2, 3, ...
 *
 * @param coulombStrength - Coulomb strength parameter α in J·m
 * @param mass - Particle mass in kg
 * @param numStates - Number of energy levels to calculate
 * @param gridConfig - Grid configuration for wavefunction evaluation (uses |x| for radial symmetry)
 * @returns Bound state results with exact energies and radial wavefunctions
 */
export function solveCoulomb3DPotential(
  coulombStrength: number,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
): BoundStateResult {
  const { HBAR } = QuantumConstants;
  const alpha = coulombStrength;

  // Calculate energies: E_n = -mα²/(2ℏ²n²) for n = 1, 2, 3, ...
  const energies: number[] = [];
  for (let n = 1; n <= numStates; n++) {
    const energy = -(mass * alpha * alpha) / (2 * HBAR * HBAR * n * n);
    energies.push(energy);
  }

  // Generate grid (can include negative values; we use |r| for radial symmetry)
  const numPoints = gridConfig.numPoints;
  const xGrid: number[] = [];
  const dx = (gridConfig.xMax - gridConfig.xMin) / (numPoints - 1);
  for (let i = 0; i < numPoints; i++) {
    const r = gridConfig.xMin + i * dx;
    xGrid.push(r);
  }

  // Calculate Bohr radius: a_0 = ℏ²/(mα)
  const a0 = (HBAR * HBAR) / (mass * alpha);

  // Calculate radial wavefunctions for L=0
  // R_n0(r) = N_n0 * (2/na_0)^(3/2) * (2r/na_0)^0 * exp(-r/na_0) * L^1_(n-1)(2r/na_0)
  const wavefunctions: number[][] = [];

  for (let n = 1; n <= numStates; n++) {
    const psiRaw: number[] = [];

    const aN = n * a0;

    // First, calculate unnormalized wavefunction
    for (const r of xGrid) {
      // For visualization on a symmetric x-axis, use |r| so the wavefunction appears on both sides
      const rAbs = Math.abs(r);

      if (rAbs === 0) {
        // At r=0, use a small offset to avoid singularity
        psiRaw.push(0);
        continue;
      }

      const rho = (2 * rAbs) / aN;

      // Radial wavefunction: R_n0(r) = exp(-ρ/2) * L^1_(n-1)(ρ)
      const laguerre = associatedLaguerre(n - 1, 1, rho);
      const value = Math.exp(-rho / 2) * laguerre;

      psiRaw.push(value);
    }

    // Normalize wavefunction numerically for 1D integration (∫|ψ|² dx = 1)
    // Note: This is different from the standard 3D radial normalization (∫|R|²r²dr = 1)
    // because we're displaying on a linear 1D grid
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
 * Create the potential function for a 3D Coulomb potential.
 * V(r) = -α/r (using radial distance r = |x|)
 *
 * @param coulombStrength - Coulomb strength parameter α in J·m
 * @returns Potential function V(r) in Joules
 */
export function createCoulomb3DPotential(coulombStrength: number): (x: number) => number {
  const alpha = coulombStrength;

  return (x: number) => {
    const r = Math.abs(x);
    if (r === 0) {
      return -Infinity; // Singularity at r=0
    }
    return -alpha / r;
  };
}

/**
 * Calculate classical probability density for a 3D Coulomb potential (radial).
 * P(r) ∝ 1/v(r) = 1/√[2(E - V(r))/m] = 1/√[2(E + α/r)/m]
 *
 * @param coulombStrength - Coulomb strength parameter α in J·m
 * @param energy - Energy of the particle in Joules (negative for bound states)
 * @param mass - Particle mass in kg
 * @param xGrid - Array of x positions in meters (uses r = |x|)
 * @returns Array of normalized classical probability density values (in 1/meters)
 */
export function calculateCoulomb3DClassicalProbability(
  coulombStrength: number,
  energy: number,
  mass: number,
  xGrid: number[],
): number[] {
  const alpha = coulombStrength;
  const classicalProbability: number[] = [];
  let integralSum = 0;

  // Find maximum kinetic energy for epsilon calculation
  let maxKE = 0;
  for (let i = 0; i < xGrid.length; i++) {
    const r = Math.abs(xGrid[i]!);

    if (r < 1e-15) {
      continue; // Skip singularity
    }

    const potential = -alpha / r;
    const ke = energy - potential;
    if (ke > maxKE) {
      maxKE = ke;
    }
  }

  // Use minimum kinetic energy to prevent singularities at turning points
  // This is 1% of maximum KE, which prevents infinities while preserving shape
  const epsilon = 0.01 * maxKE;

  // Calculate unnormalized probability
  for (let i = 0; i < xGrid.length; i++) {
    const r = Math.abs(xGrid[i]!);

    if (r < 1e-15) {
      // Near singularity at origin
      classicalProbability.push(0);
      continue;
    }

    const potential = -alpha / r;
    const kineticEnergy = energy - potential;

    if (kineticEnergy <= 0) {
      classicalProbability.push(0);
    } else {
      const safeKE = Math.max(kineticEnergy, epsilon);
      const probability = 1 / Math.sqrt((2 * safeKE) / mass);
      classicalProbability.push(probability);

      if (i > 0 && classicalProbability[i - 1]! > 0) {
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
 * Calculate the classical turning points for a 3D Coulomb potential.
 * Solve E = -α/r for r: r = -α/E
 *
 * @param coulombStrength - Coulomb strength parameter α in J·m
 * @param energy - Energy of the particle in Joules (negative for bound states)
 * @returns Object with left and right turning point positions (in meters)
 */
export function calculateCoulomb3DTurningPoints(
  coulombStrength: number,
  energy: number,
): { left: number; right: number } {
  const alpha = coulombStrength;

  // For bound states (E < 0): E = -α/r => r = -α/E
  const turningRadius = -alpha / energy;

  return {
    left: -turningRadius, // Symmetric for radial visualization
    right: turningRadius,
  };
}

/**
 * Calculate wavefunction zeros for 3D Coulomb potential (numerical approach).
 * The radial wavefunction is R_n0(r) = N * exp(-ρ/2) * L^1_(n-1)(ρ)
 * where ρ = 2r/(na₀). Zeros occur where L^1_(n-1)(ρ) = 0.
 *
 * @param coulombStrength - Coulomb strength parameter α in J·m
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for n=1, 1 for n=2, etc.)
 * @param searchRange - Range to search for zeros (in meters)
 * @returns Array of x positions (in meters) where wavefunction is zero
 */
export function calculateCoulomb3DWavefunctionZeros(
  coulombStrength: number,
  mass: number,
  stateIndex: number,
  searchRange: number = 20e-9,
): number[] {
  const { HBAR } = QuantumConstants;
  const alpha = coulombStrength;
  const n = stateIndex + 1; // Convert index to principal quantum number (1, 2, 3, ...)
  const a0 = (HBAR * HBAR) / (mass * alpha);
  const aN = n * a0;

  // Ground state (n=1) has no zeros (L^1_0(ρ) = 1, constant)
  if (n === 1) {
    return [];
  }

  const zeros: number[] = [];
  const numSamples = 1000;
  const dr = (2 * searchRange) / numSamples;

  // Search in positive r only (use symmetry for negative x)
  let prevR = 1e-15; // Start just above zero
  const prevRho = (2 * prevR) / aN;
  let prevVal = Math.exp(-prevRho / 2) * associatedLaguerre(n - 1, 1, prevRho);

  for (let i = 1; i <= numSamples / 2; i++) {
    const r = prevR + i * dr;
    const rho = (2 * r) / aN;
    const laguerre = associatedLaguerre(n - 1, 1, rho);
    const val = Math.exp(-rho / 2) * laguerre;

    // Sign change detected
    if (prevVal * val < 0 && r > 1e-14) {
      // Use bisection to refine
      let left = prevR;
      let right = r;
      for (let iter = 0; iter < 20; iter++) {
        const mid = (left + right) / 2;
        const midRho = (2 * mid) / aN;
        const midLaguerre = associatedLaguerre(n - 1, 1, midRho);
        const valMid = Math.exp(-midRho / 2) * midLaguerre;

        if (Math.abs(valMid) < 1e-12) {
          // Found zero on positive side, add both ±r for symmetric visualization
          zeros.push(-mid);
          zeros.push(mid);
          break;
        }

        if (valMid * prevVal < 0) {
          right = mid;
        } else {
          left = mid;
        }

        if (iter === 19) {
          const midFinal = (left + right) / 2;
          zeros.push(-midFinal);
          zeros.push(midFinal);
        }
      }
    }

    prevR = r;
    prevVal = val;
  }

  // Sort zeros
  zeros.sort((a, b) => a - b);
  return zeros;
}

/**
 * Calculate the first derivative of the radial wavefunction for a 3D Coulomb potential.
 * Uses numerical differentiation on the analytical wavefunction.
 *
 * @param coulombStrength - Coulomb strength parameter α in J·m
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for n=1, 1 for n=2, etc.)
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of first derivative values
 */
export function calculateCoulomb3DWavefunctionFirstDerivative(
  coulombStrength: number,
  mass: number,
  stateIndex: number,
  xGrid: number[],
): number[] {
  const { HBAR } = QuantumConstants;
  const alpha = coulombStrength;
  const n = stateIndex + 1; // Convert index to principal quantum number (1, 2, 3, ...)
  const a0 = (HBAR * HBAR) / (mass * alpha);
  const aN = n * a0;
  const normalization = (2.0 / (aN * Math.sqrt(aN))) * Math.sqrt(factorial(n - 1) / (n * factorial(n)));

  const firstDerivative: number[] = [];
  const h = 1e-12; // Small step for numerical differentiation

  // Helper function to evaluate wavefunction
  const evaluatePsi = (x: number): number => {
    const r = Math.abs(x);
    if (r === 0) {
      return 0;
    }
    const rho = (2 * r) / aN;
    const laguerre = associatedLaguerre(n - 1, 1, rho);
    return normalization * Math.exp(-rho / 2) * laguerre;
  };

  for (const x of xGrid) {
    // Handle near-singularity carefully
    if (Math.abs(x) < 2 * h) {
      // Very close to singularity
      firstDerivative.push(0);
      continue;
    }

    // Evaluate at x-h, x+h
    const xMinus = x - h;
    const xPlus = x + h;

    const psiMinus = evaluatePsi(xMinus);
    const psiPlus = evaluatePsi(xPlus);

    // First derivative using central difference
    const firstDeriv = (psiPlus - psiMinus) / (2 * h);
    firstDerivative.push(firstDeriv);
  }

  return firstDerivative;
}

/**
 * Calculate the second derivative of the radial wavefunction for a 3D Coulomb potential.
 * Uses numerical differentiation on the analytical wavefunction.
 *
 * @param coulombStrength - Coulomb strength parameter α in J·m
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for n=1, 1 for n=2, etc.)
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of second derivative values
 */
export function calculateCoulomb3DWavefunctionSecondDerivative(
  coulombStrength: number,
  mass: number,
  stateIndex: number,
  xGrid: number[],
): number[] {
  const { HBAR } = QuantumConstants;
  const alpha = coulombStrength;
  const n = stateIndex + 1; // Convert index to principal quantum number (1, 2, 3, ...)
  const a0 = (HBAR * HBAR) / (mass * alpha);
  const aN = n * a0;
  const normalization = (2.0 / (aN * Math.sqrt(aN))) * Math.sqrt(factorial(n - 1) / (n * factorial(n)));

  const secondDerivative: number[] = [];
  const h = 1e-12; // Small step for numerical differentiation

  // Helper function to evaluate wavefunction
  const evaluatePsi = (x: number): number => {
    const r = Math.abs(x);
    if (r === 0) {
      return 0;
    }
    const rho = (2 * r) / aN;
    const laguerre = associatedLaguerre(n - 1, 1, rho);
    return normalization * Math.exp(-rho / 2) * laguerre;
  };

  for (const x of xGrid) {
    // Handle near-singularity carefully
    if (Math.abs(x) < 2 * h) {
      // Very close to singularity
      secondDerivative.push(0);
      continue;
    }

    // Evaluate at x-h, x, x+h
    const xMinus = x - h;
    const xPlus = x + h;

    const psiMinus = evaluatePsi(xMinus);
    const psi = evaluatePsi(x);
    const psiPlus = evaluatePsi(xPlus);

    // Second derivative using central difference
    const secondDeriv = (psiPlus - 2 * psi + psiMinus) / (h * h);
    secondDerivative.push(secondDeriv);
  }

  return secondDerivative;
}

/**
 * Calculate the minimum and maximum values of the radial wavefunction for a 3D Coulomb potential.
 *
 * @param coulombStrength - Coulomb strength parameter α in J·m
 * @param mass - Particle mass in kg
 * @param stateIndex - Index of the eigenstate (0 for n=1, 1 for n=2, etc.)
 * @param xMin - Left boundary of the region in meters
 * @param xMax - Right boundary of the region in meters
 * @param numPoints - Number of points to sample (default: 1000)
 * @returns Object containing min/max values and x-positions of all extrema
 */
export function calculateCoulomb3DWavefunctionMinMax(
  coulombStrength: number,
  mass: number,
  stateIndex: number,
  xMin: number,
  xMax: number,
  numPoints: number = 1000,
): { min: number; max: number; extremaPositions: number[] } {
  const { HBAR } = QuantumConstants;
  const alpha = coulombStrength;
  const n = stateIndex + 1; // Convert index to principal quantum number (1, 2, 3, ...)
  const a0 = (HBAR * HBAR) / (mass * alpha);
  const aN = n * a0;
  const normalization = (2.0 / (aN * Math.sqrt(aN))) * Math.sqrt(factorial(n - 1) / (n * factorial(n)));

  let min = Infinity;
  let max = -Infinity;
  const extremaPositions: number[] = [];

  const dx = (xMax - xMin) / (numPoints - 1);
  const h = 1e-12; // Small step for numerical derivative
  let prevDerivativeSign: number | null = null;

  // Helper function to calculate psi at a given x
  const calculatePsi = (x: number): number => {
    const r = Math.abs(x);
    if (r === 0) {
      return 0;
    } else {
      const rho = (2 * r) / aN;
      const laguerre = associatedLaguerre(n - 1, 1, rho);
      return normalization * Math.exp(-rho / 2) * laguerre;
    }
  };

  for (let i = 0; i < numPoints; i++) {
    const x = xMin + i * dx;
    const psi = calculatePsi(x);

    // Calculate derivative using central difference for extrema detection
    let derivative = 0;
    if (i > 0 && i < numPoints - 1) {
      const psiMinus = calculatePsi(x - h);
      const psiPlus = calculatePsi(x + h);
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
 * Calculate the minimum and maximum values of a superposition of radial wavefunctions
 * for a 3D Coulomb potential.
 *
 * The superposition is: Ψ(r,t) = Σ cₙ Rₙ(r) exp(-iEₙt/ℏ)
 * We return the min/max of the real part of this complex-valued function.
 *
 * @param coulombStrength - Coulomb strength parameter α in J·m
 * @param mass - Particle mass in kg
 * @param coefficients - Complex coefficients for each eigenstate (as [real, imag] pairs)
 * @param energies - Energy eigenvalues in Joules
 * @param time - Time in seconds
 * @param xMin - Left boundary of the region in meters
 * @param xMax - Right boundary of the region in meters
 * @param numPoints - Number of points to sample (default: 1000)
 * @returns Object containing min and max values of the superposition's real part
 */
export function calculateCoulomb3DSuperpositionMinMax(
  coulombStrength: number,
  mass: number,
  coefficients: Array<[number, number]>,
  energies: number[],
  time: number,
  xMin: number,
  xMax: number,
  numPoints: number = 1000,
): { min: number; max: number } {
  const { HBAR } = QuantumConstants;
  const alpha = coulombStrength;
  const a0 = (HBAR * HBAR) / (mass * alpha);

  let min = Infinity;
  let max = -Infinity;

  const dx = (xMax - xMin) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const x = xMin + i * dx;
    const r = Math.abs(x);
    let realPart = 0;

    for (let n = 0; n < coefficients.length; n++) {
      const [cReal, cImag] = coefficients[n]!;
      const energy = energies[n]!;

      const nPrincipal = n + 1; // Convert index to principal quantum number
      const aN = nPrincipal * a0;
      const normalization =
        (2.0 / (aN * Math.sqrt(aN))) * Math.sqrt(factorial(nPrincipal - 1) / (nPrincipal * factorial(nPrincipal)));

      // Calculate wavefunction value
      let psi: number;
      if (r === 0) {
        psi = 0;
      } else {
        const rho = (2 * r) / aN;
        const laguerre = associatedLaguerre(nPrincipal - 1, 1, rho);
        psi = normalization * Math.exp(-rho / 2) * laguerre;
      }

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
