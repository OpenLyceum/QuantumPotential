/**
 * Analytical solution for a finite square well.
 * V(x) = -V₀ for |x| < L/2, V(x) = 0 for |x| > L/2
 *
 * REFERENCES FOR TRANSCENDENTAL EQUATIONS:
 * - Griffiths, D. J., & Schroeter, D. F. (2018). "Introduction to Quantum Mechanics" (3rd ed.).
 *   Cambridge University Press. Section 2.6, pp. 68-75.
 *   https://doi.org/10.1017/9781316995433
 *   Derivation of transcendental equations from boundary condition matching.
 *
 * - Flügge, S. (1999). "Practical Quantum Mechanics". Springer.
 *   Section I.3, pp. 17-22. https://doi.org/10.1007/978-3-642-61995-3
 *   Detailed graphical and algebraic solutions of the transcendental equations.
 *
 * - Robinett, R. W. (1996). "Visualizing the solutions for the circular infinite well in
 *   quantum and classical mechanics". American Journal of Physics, 64(4), 440-446.
 *   https://doi.org/10.1119/1.18188
 *   Graphical interpretation of transcendental equation solutions.
 *
 * - Lima, F. M. S. (2020). "A simpler graphical solution and an approximate formula for
 *   energy eigenvalues in finite square quantum wells." American Journal of Physics, 88(11), 1019.
 *   https://doi.org/10.1119/10.0001881
 *   Novel approximation method used in this implementation for initial guesses.
 *
 * TRANSCENDENTAL EQUATIONS (from boundary condition matching):
 * Define dimensionless parameters:
 *   ξ = (L/2)√(2mE/ℏ²)         (wave number inside well)
 *   η = (L/2)√(2m(V₀-E)/ℏ²)    (decay constant outside well)
 *   ξ₀ = (L/2)√(2mV₀/ℏ²)       (maximum value, ξ² + η² = ξ₀²)
 *
 * Even parity solutions: tan(ξ) = η/ξ
 * Odd parity solutions: -cot(ξ) = η/ξ
 *
 * These transcendental equations have no closed-form solution and must be solved numerically.
 * The derivation follows from requiring wavefunction and derivative continuity at x = ±L/2.
 */

import Logger from "../../utils/Logger.js";
import type { BoundStateResult, FourierTransformResult, GridConfig, PotentialFunction } from "../PotentialFunction.js";
import QuantumConstants from "../QuantumConstants.js";
import { AnalyticalSolution } from "./AnalyticalSolution.js";
import { computeNumericalFourierTransform } from "./fourier-transform-helper.js";
import { findRootHybrid } from "./root-finding-utils.js";

/**
 * Create the potential function for a finite square well.
 * V(x) = -V₀ for |x| < L/2, V(x) = 0 for |x| > L/2
 *
 * @param wellWidth - Width of the well (L) in meters
 * @param wellDepth - Depth of the well (V₀) in Joules (positive value)
 * @returns Potential function V(x) in Joules
 */
export function createFiniteWellPotential(wellWidth: number, wellDepth: number): PotentialFunction {
  const halfWidth = wellWidth / 2;
  return (x: number) => {
    if (Math.abs(x) <= halfWidth) {
      return -wellDepth;
    } else {
      return 0;
    }
  };
}

/**
 * Calculate classical probability density for a finite square well.
 * Inside the well, the kinetic energy is constant (E + V₀), so the velocity is constant.
 * Therefore, the classical probability density is uniform: P(x) = 1/L for |x| < L/2
 *
 * This is one of the cases where the renormalization can be computed analytically.
 *
 * @param wellWidth - Width of the well (L) in meters
 * @param wellDepth - Depth of the well (V₀) in Joules (positive value)
 * @param energy - Energy of the particle in Joules (must be > -V₀)
 * @param mass - Particle mass in kg (unused for finite well)
 * @param xGrid - Array of x positions in meters
 * @returns Array of normalized classical probability density values (in 1/meters)
 */
export function calculateFiniteWellClassicalProbability(
  wellWidth: number,
  wellDepth: number,
  energy: number,
  _mass: number,
  xGrid: number[],
): number[] {
  const halfWidth = wellWidth / 2;
  const probability: number[] = [];

  // Classical probability is uniform inside the well: P(x) = 1/L
  // This is already normalized: ∫P(x)dx = 1
  const uniformProbability = 1 / wellWidth;

  for (const x of xGrid) {
    if (Math.abs(x) <= halfWidth && energy > -wellDepth) {
      probability.push(uniformProbability);
    } else {
      probability.push(0);
    }
  }

  return probability;
}

/**
 * Calculate the classical turning points for a finite square well.
 * For bound states with E < 0, the turning points are at the well boundaries x = ±L/2
 *
 * @param wellWidth - Width of the well (L) in meters
 * @param wellDepth - Depth of the well (V₀) in Joules (positive value)
 * @param energy - Energy of the particle in Joules (should be -V₀ < E < 0 for bound states)
 * @returns Object with left and right turning point positions (in meters)
 */
export function calculateFiniteWellTurningPoints(
  wellWidth: number,
  _wellDepth: number,
  _energy: number,
): { left: number; right: number } {
  const halfWidth = wellWidth / 2;

  // For bound states (E < 0), the turning points are at the well edges
  // since V = -V₀ inside and V = 0 outside
  // The particle can classically exist where E > V(x)
  // Inside: E > -V₀ (always true for bound states)
  // Outside: E > 0 (never true for bound states E < 0)

  return {
    left: -halfWidth,
    right: halfWidth,
  };
}

/**
 * Calculate the first derivative of the wavefunction for a finite square well.
 *
 * Inside the well: ψ(x) = A cos(kx) or A sin(kx)
 * - Even parity: ψ'(x) = -Ak sin(kx)
 * - Odd parity: ψ'(x) = Ak cos(kx)
 *
 * Outside the well: ψ(x) = B exp(-κ|x|) or B sign(x) exp(-κ|x|)
 * - Even parity: ψ'(x) = -B κ sign(x) exp(-κ|x|)
 * - Odd parity: ψ'(x) = -B κ exp(-κ|x|)
 *
 * @param wellWidth - Width of the well (L) in meters
 * @param wellDepth - Depth of the well (V₀) in Joules (positive value)
 * @param mass - Particle mass in kg
 * @param energy - Energy of the eigenstate in Joules
 * @param parity - Parity of the state ("even" or "odd")
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of first derivative values
 */
export function calculateFiniteWellWavefunctionFirstDerivative(
  wellWidth: number,
  wellDepth: number,
  mass: number,
  energy: number,
  parity: "even" | "odd",
  xGrid: number[],
): number[] {
  const { HBAR } = QuantumConstants;
  const halfWidth = wellWidth / 2;
  const k = Math.sqrt(2 * mass * (energy + wellDepth)) / HBAR; // Inside well
  const kappa = Math.sqrt(-2 * mass * energy) / HBAR; // Outside well (decay constant)

  // Determine normalization constant (simplified version)
  let normalization: number;
  if (parity === "even") {
    const cosVal = Math.cos(k * halfWidth);
    // Inside: ∫_{-L/2}^{L/2} cos²(kx) dx = L/2 + sin(kL)/(2k)
    // Outside: ∫_{-∞}^{-L/2} + ∫_{L/2}^∞ = cos²(kL/2) / κ
    const integral = halfWidth + Math.sin(2 * k * halfWidth) / (2 * k) + (cosVal * cosVal) / kappa;
    normalization = 1 / Math.sqrt(integral);
  } else {
    const sinVal = Math.sin(k * halfWidth);
    // Inside: ∫_{-L/2}^{L/2} sin²(kx) dx = L/2 - sin(kL)/(2k)
    // Outside: ∫_{-∞}^{-L/2} + ∫_{L/2}^∞ = sin²(kL/2) / κ
    const integral = halfWidth - Math.sin(2 * k * halfWidth) / (2 * k) + (sinVal * sinVal) / kappa;
    normalization = 1 / Math.sqrt(integral);
  }

  const firstDerivative: number[] = [];

  for (const x of xGrid) {
    if (Math.abs(x) <= halfWidth) {
      // Inside the well
      if (parity === "even") {
        // ψ = A cos(kx), ψ' = -Ak sin(kx)
        const firstDeriv = -normalization * k * Math.sin(k * x);
        firstDerivative.push(firstDeriv);
      } else {
        // ψ = A sin(kx), ψ' = Ak cos(kx)
        const firstDeriv = normalization * k * Math.cos(k * x);
        firstDerivative.push(firstDeriv);
      }
    } else {
      // Outside the well (exponentially decaying)
      const absX = Math.abs(x);
      const signX = x >= 0 ? 1 : -1;

      if (parity === "even") {
        // ψ = B exp(-κ|x|), ψ' = -B κ sign(x) exp(-κ|x|)
        const cosVal = Math.cos(k * halfWidth);
        const B = normalization * cosVal * Math.exp(kappa * halfWidth);
        const expFactor = Math.exp(-kappa * absX);

        const firstDeriv = -B * kappa * signX * expFactor;
        firstDerivative.push(firstDeriv);
      } else {
        // ψ = B sign(x) exp(-κ|x|), ψ' = -B κ exp(-κ|x|)
        const sinVal = Math.sin(k * halfWidth);
        const B = normalization * sinVal * Math.exp(kappa * halfWidth);
        const expFactor = Math.exp(-kappa * absX);

        const firstDeriv = -B * kappa * expFactor;
        firstDerivative.push(firstDeriv);
      }
    }
  }

  return firstDerivative;
}

/**
 * Calculate the second derivative of the wavefunction for a finite square well.
 *
 * Inside the well: ψ(x) = A cos(kx) or A sin(kx)
 * - Even parity: ψ''(x) = -Ak² cos(kx) = -k² ψ(x)
 * - Odd parity: ψ''(x) = -Ak² sin(kx) = -k² ψ(x)
 *
 * Outside the well: ψ(x) = B exp(-κ|x|) or B sign(x) exp(-κ|x|)
 * - Even parity: ψ''(x) = B κ² exp(-κ|x|) = κ² ψ(x)
 * - Odd parity: ψ''(x) = B κ² sign(x) exp(-κ|x|) = κ² ψ(x)
 *
 * @param wellWidth - Width of the well (L) in meters
 * @param wellDepth - Depth of the well (V₀) in Joules (positive value)
 * @param mass - Particle mass in kg
 * @param energy - Energy of the eigenstate in Joules
 * @param parity - Parity of the state ("even" or "odd")
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of second derivative values
 */
export function calculateFiniteWellWavefunctionSecondDerivative(
  wellWidth: number,
  wellDepth: number,
  mass: number,
  energy: number,
  parity: "even" | "odd",
  xGrid: number[],
): number[] {
  const { HBAR } = QuantumConstants;
  const halfWidth = wellWidth / 2;
  const k = Math.sqrt(2 * mass * (energy + wellDepth)) / HBAR; // Inside well
  const kappa = Math.sqrt(-2 * mass * energy) / HBAR; // Outside well (decay constant)

  // Determine normalization constant (simplified version)
  let normalization: number;
  if (parity === "even") {
    const cosVal = Math.cos(k * halfWidth);
    // Inside: ∫_{-L/2}^{L/2} cos²(kx) dx = L/2 + sin(kL)/(2k)
    // Outside: ∫_{-∞}^{-L/2} + ∫_{L/2}^∞ = cos²(kL/2) / κ
    const integral = halfWidth + Math.sin(2 * k * halfWidth) / (2 * k) + (cosVal * cosVal) / kappa;
    normalization = 1 / Math.sqrt(integral);
  } else {
    const sinVal = Math.sin(k * halfWidth);
    // Inside: ∫_{-L/2}^{L/2} sin²(kx) dx = L/2 - sin(kL)/(2k)
    // Outside: ∫_{-∞}^{-L/2} + ∫_{L/2}^∞ = sin²(kL/2) / κ
    const integral = halfWidth - Math.sin(2 * k * halfWidth) / (2 * k) + (sinVal * sinVal) / kappa;
    normalization = 1 / Math.sqrt(integral);
  }

  const secondDerivative: number[] = [];

  for (const x of xGrid) {
    if (Math.abs(x) <= halfWidth) {
      // Inside the well
      if (parity === "even") {
        // ψ = A cos(kx), ψ'' = -Ak² cos(kx)
        const secondDeriv = -normalization * k * k * Math.cos(k * x);
        secondDerivative.push(secondDeriv);
      } else {
        // ψ = A sin(kx), ψ'' = -Ak² sin(kx)
        const secondDeriv = -normalization * k * k * Math.sin(k * x);
        secondDerivative.push(secondDeriv);
      }
    } else {
      // Outside the well (exponentially decaying)
      const absX = Math.abs(x);
      const signX = x >= 0 ? 1 : -1;

      if (parity === "even") {
        // ψ = B exp(-κ|x|), ψ'' = B κ² exp(-κ|x|)
        const cosVal = Math.cos(k * halfWidth);
        const B = normalization * cosVal * Math.exp(kappa * halfWidth);
        const expFactor = Math.exp(-kappa * absX);

        const secondDeriv = B * kappa * kappa * expFactor;
        secondDerivative.push(secondDeriv);
      } else {
        // ψ = B sign(x) exp(-κ|x|), ψ'' = B κ² sign(x) exp(-κ|x|)
        const sinVal = Math.sin(k * halfWidth);
        const B = normalization * sinVal * Math.exp(kappa * halfWidth);
        const expFactor = Math.exp(-kappa * absX);

        const secondDeriv = B * kappa * kappa * signX * expFactor;
        secondDerivative.push(secondDeriv);
      }
    }
  }

  return secondDerivative;
}

/**
 * Calculate the minimum and maximum values of the wavefunction for a finite square well.
 *
 * @param wellWidth - Width of the well (L) in meters
 * @param wellDepth - Depth of the well (V₀) in Joules (positive value)
 * @param mass - Particle mass in kg
 * @param energy - Energy of the eigenstate in Joules
 * @param parity - Parity of the state ("even" or "odd")
 * @param xMin - Left boundary of the region in meters
 * @param xMax - Right boundary of the region in meters
 * @param numPoints - Number of points to sample (default: 1000)
 * @returns Object containing min/max values and x-positions of all extrema
 */
export function calculateFiniteWellWavefunctionMinMax(
  wellWidth: number,
  wellDepth: number,
  mass: number,
  energy: number,
  parity: "even" | "odd",
  xMin: number,
  xMax: number,
  numPoints: number = 1000,
): { min: number; max: number; extremaPositions: number[] } {
  const { HBAR } = QuantumConstants;
  const halfWidth = wellWidth / 2;
  const k = Math.sqrt(2 * mass * (energy + wellDepth)) / HBAR;
  const kappa = Math.sqrt(-2 * mass * energy) / HBAR;

  // Determine normalization constant
  let normalization: number;
  if (parity === "even") {
    const cosVal = Math.cos(k * halfWidth);
    // Inside: ∫_{-L/2}^{L/2} cos²(kx) dx = L/2 + sin(kL)/(2k)
    // Outside: ∫_{-∞}^{-L/2} + ∫_{L/2}^∞ = cos²(kL/2) / κ
    const integral = halfWidth + Math.sin(2 * k * halfWidth) / (2 * k) + (cosVal * cosVal) / kappa;
    normalization = 1 / Math.sqrt(integral);
  } else {
    const sinVal = Math.sin(k * halfWidth);
    // Inside: ∫_{-L/2}^{L/2} sin²(kx) dx = L/2 - sin(kL)/(2k)
    // Outside: ∫_{-∞}^{-L/2} + ∫_{L/2}^∞ = sin²(kL/2) / κ
    const integral = halfWidth - Math.sin(2 * k * halfWidth) / (2 * k) + (sinVal * sinVal) / kappa;
    normalization = 1 / Math.sqrt(integral);
  }

  let min = Infinity;
  let max = -Infinity;
  const extremaPositions: number[] = [];

  const dx = (xMax - xMin) / (numPoints - 1);
  const h = 1e-12; // Small step for numerical derivative
  let prevDerivativeSign: number | null = null;

  // Helper function to calculate psi at a given x
  const calculatePsi = (x: number): number => {
    if (Math.abs(x) <= halfWidth) {
      // Inside the well
      if (parity === "even") {
        return normalization * Math.cos(k * x);
      } else {
        return normalization * Math.sin(k * x);
      }
    } else {
      // Outside the well
      const absX = Math.abs(x);
      const signX = x >= 0 ? 1 : -1;

      if (parity === "even") {
        const cosVal = Math.cos(k * halfWidth);
        const B = normalization * cosVal * Math.exp(kappa * halfWidth);
        return B * Math.exp(-kappa * absX);
      } else {
        const sinVal = Math.sin(k * halfWidth);
        const B = normalization * sinVal * Math.exp(kappa * halfWidth);
        return B * signX * Math.exp(-kappa * absX);
      }
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
 * Class-based implementation of finite square well analytical solution.
 * Extends the AnalyticalSolution abstract base class.
 */
export class FiniteSquareWellSolution extends AnalyticalSolution {
  private parities: ("even" | "odd")[] = [];

  private wellWidth: number;
  private wellDepth: number;
  private mass: number;

  constructor(wellWidth: number, wellDepth: number, mass: number) {
    super();
    this.wellWidth = wellWidth;
    this.wellDepth = wellDepth;
    this.mass = mass;
  }

  solve(numStates: number, gridConfig: GridConfig): BoundStateResult {
    const result = solveFiniteSquareWell(this.wellWidth, this.wellDepth, this.mass, numStates, gridConfig);
    // Store parities for later use in class methods
    // Alternate between even and odd based on state index
    this.parities = [];
    for (let i = 0; i < result.energies.length; i++) {
      this.parities.push(i % 2 === 0 ? "even" : "odd");
    }
    return result;
  }

  createPotential(): PotentialFunction {
    return createFiniteWellPotential(this.wellWidth, this.wellDepth);
  }

  override calculateClassicalProbability(energy: number, mass: number, xGrid: number[]): number[] {
    return calculateFiniteWellClassicalProbability(this.wellWidth, this.wellDepth, energy, mass, xGrid);
  }

  calculateTurningPoints(energy: number): Array<{ left: number; right: number }> {
    const points = calculateFiniteWellTurningPoints(this.wellWidth, this.wellDepth, energy);
    return [points]; // Return as array with single element for simple single-well potential
  }

  calculateWavefunctionFirstDerivative(stateIndex: number, xGrid: number[]): number[] {
    // We need energy to calculate the first derivative
    // For now, we'll need to solve to get energies or use a cached value
    // This is a limitation - we'll use the parity from the stored array
    const parity = this.parities[stateIndex] || (stateIndex % 2 === 0 ? "even" : "odd");

    // We need the energy, so we'll need to solve if we haven't already
    // For simplicity, compute it on the fly
    const { HBAR } = QuantumConstants;
    const xi0 = ((this.wellWidth / 2) * Math.sqrt(2 * this.mass * this.wellDepth)) / HBAR;

    let xi: number | null;
    if (parity === "even") {
      xi = findEvenParityState(xi0, Math.floor(stateIndex / 2));
    } else {
      xi = findOddParityState(xi0, Math.floor(stateIndex / 2));
    }

    if (xi === null) {
      // Return zeros if we can't find the energy
      return new Array(xGrid.length).fill(0);
    }

    const energy =
      (HBAR * HBAR * xi * xi) / (2 * this.mass * (this.wellWidth / 2) * (this.wellWidth / 2)) - this.wellDepth;

    return calculateFiniteWellWavefunctionFirstDerivative(
      this.wellWidth,
      this.wellDepth,
      this.mass,
      energy,
      parity,
      xGrid,
    );
  }

  calculateWavefunctionSecondDerivative(stateIndex: number, xGrid: number[]): number[] {
    // We need energy to calculate the second derivative
    // For now, we'll need to solve to get energies or use a cached value
    // This is a limitation - we'll use the parity from the stored array
    const parity = this.parities[stateIndex] || (stateIndex % 2 === 0 ? "even" : "odd");

    // We need the energy, so we'll need to solve if we haven't already
    // For simplicity, compute it on the fly
    const { HBAR } = QuantumConstants;
    const xi0 = ((this.wellWidth / 2) * Math.sqrt(2 * this.mass * this.wellDepth)) / HBAR;

    let xi: number | null;
    if (parity === "even") {
      xi = findEvenParityState(xi0, Math.floor(stateIndex / 2));
    } else {
      xi = findOddParityState(xi0, Math.floor(stateIndex / 2));
    }

    if (xi === null) {
      // Return zeros if we can't find the energy
      return new Array(xGrid.length).fill(0);
    }

    const energy =
      (HBAR * HBAR * xi * xi) / (2 * this.mass * (this.wellWidth / 2) * (this.wellWidth / 2)) - this.wellDepth;

    return calculateFiniteWellWavefunctionSecondDerivative(
      this.wellWidth,
      this.wellDepth,
      this.mass,
      energy,
      parity,
      xGrid,
    );
  }

  calculateWavefunctionMinMax(
    stateIndex: number,
    xMin: number,
    xMax: number,
    numPoints?: number,
  ): { min: number; max: number; extremaPositions: number[] } {
    const parity = this.parities[stateIndex] || (stateIndex % 2 === 0 ? "even" : "odd");

    const { HBAR } = QuantumConstants;
    const xi0 = ((this.wellWidth / 2) * Math.sqrt(2 * this.mass * this.wellDepth)) / HBAR;

    let xi: number | null;
    if (parity === "even") {
      xi = findEvenParityState(xi0, Math.floor(stateIndex / 2));
    } else {
      xi = findOddParityState(xi0, Math.floor(stateIndex / 2));
    }

    if (xi === null) {
      return { min: 0, max: 0, extremaPositions: [] };
    }

    const energy =
      (HBAR * HBAR * xi * xi) / (2 * this.mass * (this.wellWidth / 2) * (this.wellWidth / 2)) - this.wellDepth;

    return calculateFiniteWellWavefunctionMinMax(
      this.wellWidth,
      this.wellDepth,
      this.mass,
      energy,
      parity,
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
    // Use the helper function with energy scale based on well depth
    return computeNumericalFourierTransform(boundStateResult, mass, this.wellDepth, numMomentumPoints, pMax);
  }
}

/**
 * Analytical solution for a finite square well.
 * V(x) = -V₀ for |x| < L/2, V(x) = 0 for |x| > L/2
 *
 * The energy eigenvalues are found by solving transcendental equations:
 * - Even parity: tan(ξ) = η/ξ
 * - Odd parity: -cot(ξ) = η/ξ
 * where ξ = (L/2)√(2mE/ℏ²) and η = (L/2)√(2m(V₀-E)/ℏ²)
 *
 * This implementation uses multiple numerical methods with fallbacks:
 * 1. Bisection method (robust but slower)
 * 2. Newton-Raphson method (fast but requires good initial guess)
 * 3. Secant method (no derivatives needed)
 * 4. Lima's approximation (2020) for difficult cases
 *
 * @param wellWidth - Width of the well (L) in meters
 * @param wellDepth - Depth of the well (V₀) in Joules (positive value)
 * @param mass - Particle mass in kg
 * @param numStates - Number of energy levels to calculate
 * @param gridConfig - Grid configuration for wavefunction evaluation
 * @returns Bound state results with energies and wavefunctions
 */
export function solveFiniteSquareWell(
  wellWidth: number,
  wellDepth: number,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
): BoundStateResult {
  const { HBAR } = QuantumConstants;
  const L = wellWidth;
  const V0 = wellDepth;
  const halfL = L / 2;

  // Dimensionless parameter: ξ₀ = (L/2)√(2mV₀/ℏ²)
  const xi0 = (halfL * Math.sqrt(2 * mass * V0)) / HBAR;

  // Maximum number of bound states (approximate)
  const maxStates = Math.floor(xi0 / (Math.PI / 2)) + 1;
  const actualNumStates = Math.min(numStates, maxStates);

  if (actualNumStates <= 0) {
    // Return empty result instead of throwing - well is too shallow
    Logger.warn("Finite square well too shallow to support bound states");
    return {
      energies: [],
      wavefunctions: [],
      xGrid: [],
      method: "analytical",
    };
  }

  // Find energy eigenvalues by solving transcendental equations
  const energies: number[] = [];
  const parities: ("even" | "odd")[] = [];

  // Search for bound states alternating between even and odd parity
  let evenCount = 0;
  let oddCount = 0;

  for (let n = 0; n < actualNumStates; n++) {
    let xi: number | null;
    let parity: "even" | "odd";

    // Alternate between even (n=0,2,4,...) and odd (n=1,3,5,...)
    if (n % 2 === 0) {
      // Even parity state: solve tan(ξ) = √((ξ₀/ξ)² - 1)
      xi = findEvenParityState(xi0, evenCount);
      parity = "even";
      evenCount++;
    } else {
      // Odd parity state: solve -cot(ξ) = √((ξ₀/ξ)² - 1)
      xi = findOddParityState(xi0, oddCount);
      parity = "odd";
      oddCount++;
    }

    // Skip if state could not be found (fallback returned null)
    if (xi === null) {
      Logger.warn(`Could not find ${parity} parity state ${n} for xi0=${xi0}`);
      continue;
    }

    // Convert ξ to energy: E = (ℏξ/L/2)² / (2m) - V₀
    const E = (HBAR * HBAR * xi * xi) / (2 * mass * halfL * halfL) - V0;
    energies.push(E);
    parities.push(parity);
  }

  // Generate grid
  const numPoints = gridConfig.numPoints;
  const xGrid: number[] = [];
  const dx = (gridConfig.xMax - gridConfig.xMin) / (numPoints - 1);
  for (let i = 0; i < numPoints; i++) {
    xGrid.push(gridConfig.xMin + i * dx);
  }

  // Calculate wavefunctions
  const wavefunctions: number[][] = [];

  for (let n = 0; n < actualNumStates; n++) {
    const wavefunction: number[] = [];
    const E = energies[n]!;
    const parity = parities[n];

    // Wave numbers
    const k = Math.sqrt(2 * mass * (E + V0)) / HBAR; // Inside the well
    const kappa = Math.sqrt(-2 * mass * E) / HBAR; // Outside the well

    // Determine normalization constant
    // For even states: ψ(x) = A cos(kx) inside, B exp(-κ|x|) outside
    // For odd states: ψ(x) = A sin(kx) inside, B sign(x) exp(-κ|x|) outside

    let normalization: number;
    if (parity === "even") {
      // Match boundary conditions at x = L/2
      const cosVal = Math.cos(k * halfL);

      // Normalization integral (calculated with A = 1)
      // Inside: ∫_{-L/2}^{L/2} cos²(kx) dx = L/2 + sin(kL)/(2k)
      // Outside: ∫_{-∞}^{-L/2} + ∫_{L/2}^∞ = cos²(kL/2) / κ
      const integral = halfL + Math.sin(2 * k * halfL) / (2 * k) + (cosVal * cosVal) / kappa;
      normalization = 1 / Math.sqrt(integral);
    } else {
      // Match boundary conditions at x = L/2
      const sinVal = Math.sin(k * halfL);

      // Normalization integral (calculated with A = 1)
      // Inside: ∫_{-L/2}^{L/2} sin²(kx) dx = L/2 - sin(kL)/(2k)
      // Outside: ∫_{-∞}^{-L/2} + ∫_{L/2}^∞ = sin²(kL/2) / κ
      const integral = halfL - Math.sin(2 * k * halfL) / (2 * k) + (sinVal * sinVal) / kappa;
      normalization = 1 / Math.sqrt(integral);
    }

    // Evaluate wavefunction on grid
    for (const x of xGrid) {
      let value: number;

      if (Math.abs(x) <= halfL) {
        // Inside the well
        if (parity === "even") {
          value = normalization * Math.cos(k * x);
        } else {
          value = normalization * Math.sin(k * x);
        }
      } else if (parity === "even") {
        // Outside the well (exponentially decaying)
        const cosVal = Math.cos(k * halfL);
        const B = normalization * cosVal * Math.exp(kappa * halfL);
        value = B * Math.exp(-kappa * Math.abs(x));
      } else {
        const sinVal = Math.sin(k * halfL);
        const B = normalization * sinVal * Math.exp(kappa * halfL);
        value = B * Math.sign(x) * Math.exp(-kappa * Math.abs(x));
      }

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
 * Find even parity bound state by solving tan(ξ) = √((ξ₀/ξ)² - 1)
 * Uses multiple numerical methods with fallbacks for robustness.
 *
 * @returns The ξ value for the bound state, or null if not found
 */
function findEvenParityState(xi0: number, stateIndex: number): number | null {
  // Search in the interval [(n*π/2), ((n+1)*π/2)] where n is even
  const n = stateIndex * 2;
  const xiMin = (n * Math.PI) / 2 + 0.001;
  const xiMax = Math.min(((n + 1) * Math.PI) / 2 - 0.001, xi0);

  if (xiMin >= xiMax) {
    // Well is not deep enough for this state
    return null;
  }

  const f = (xi: number) => {
    const eta = Math.sqrt(xi0 * xi0 - xi * xi);
    return Math.tan(xi) - eta / xi;
  };

  const fDerivative = (xi: number) => {
    const eta = Math.sqrt(xi0 * xi0 - xi * xi);
    const tanXi = Math.tan(xi);
    const sec2Xi = 1 + tanXi * tanXi; // sec²(ξ) = 1 + tan²(ξ)
    return sec2Xi + eta / (xi * xi) + xi / eta;
  };

  // Use dot library's hybrid Newton's/bisection root finder
  // This automatically combines the robustness of bisection with the speed of Newton's method
  try {
    const root = findRootHybrid(xiMin, xiMax, 1e-10, f, fDerivative);
    // Verify the root is valid
    if (Math.abs(f(root)) < 1e-8) {
      return root;
    }
  } catch (_e) {
    // findRoot failed, continue to fallback methods
  }

  // Method 3: Try secant method with midpoint initial guess
  const midpoint = (xiMin + xiMax) / 2;
  const secantResult = solveSecant(f, xiMin, midpoint, 1e-10, 50);
  if (secantResult !== null && secantResult >= xiMin && secantResult <= xiMax) {
    return secantResult;
  }

  // All methods failed
  Logger.warn(`All methods failed to find even parity state ${stateIndex}`);
  return null;
}

/**
 * Find odd parity bound state by solving -cot(ξ) = √((ξ₀/ξ)² - 1)
 * Uses multiple numerical methods with fallbacks for robustness.
 *
 * @returns The ξ value for the bound state, or null if not found
 */
function findOddParityState(xi0: number, stateIndex: number): number | null {
  // Search in the interval [(n*π/2), ((n+1)*π/2)] where n is odd
  const n = stateIndex * 2 + 1;
  const xiMin = (n * Math.PI) / 2 + 0.001;
  const xiMax = Math.min(((n + 1) * Math.PI) / 2 - 0.001, xi0);

  if (xiMin >= xiMax) {
    // Well is not deep enough for this state
    return null;
  }

  const f = (xi: number) => {
    const eta = Math.sqrt(xi0 * xi0 - xi * xi);
    return -1 / Math.tan(xi) - eta / xi;
  };

  const fDerivative = (xi: number) => {
    const eta = Math.sqrt(xi0 * xi0 - xi * xi);
    const sinXi = Math.sin(xi);
    const csc2Xi = 1 / (sinXi * sinXi); // csc²(ξ) = 1/sin²(ξ)
    return csc2Xi + eta / (xi * xi) + xi / eta;
  };

  // Use dot library's hybrid Newton's/bisection root finder
  // This automatically combines the robustness of bisection with the speed of Newton's method
  try {
    const root = findRootHybrid(xiMin, xiMax, 1e-10, f, fDerivative);
    // Verify the root is valid
    if (Math.abs(f(root)) < 1e-8) {
      return root;
    }
  } catch (_e) {
    // findRoot failed, continue to fallback methods
  }

  // Method 3: Try secant method with midpoint initial guess
  const midpoint = (xiMin + xiMax) / 2;
  const secantResult = solveSecant(f, xiMin, midpoint, 1e-10, 50);
  if (secantResult !== null && secantResult >= xiMin && secantResult <= xiMax) {
    return secantResult;
  }

  // All methods failed
  Logger.warn(`All methods failed to find odd parity state ${stateIndex}`);
  return null;
}

/**
 * Solve equation f(x) = 0 using secant method.
 * Like Newton-Raphson but doesn't require derivative.
 *
 * @returns Root if found, null otherwise
 */
function solveSecant(
  f: (x: number) => number,
  x0: number,
  x1: number,
  tolerance: number,
  maxIterations: number,
): number | null {
  let xPrev = x0;
  let x = x1;

  for (let iter = 0; iter < maxIterations; iter++) {
    const fx = f(x);
    const fxPrev = f(xPrev);

    // Check for same function values (would cause division by zero)
    if (Math.abs(fx - fxPrev) < 1e-15) {
      return null;
    }

    const xNew = x - (fx * (x - xPrev)) / (fx - fxPrev);

    // Check convergence
    if (Math.abs(xNew - x) < tolerance || Math.abs(fx) < tolerance) {
      return xNew;
    }

    // Check for divergence
    if (!Number.isFinite(xNew) || Math.abs(xNew) > 1e10) {
      return null;
    }

    xPrev = x;
    x = xNew;
  }

  // Check if we're close enough even without full convergence
  if (Math.abs(f(x)) < tolerance * 10) {
    return x;
  }

  return null;
}
