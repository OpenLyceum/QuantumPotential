/**
 * Analytical solution for the finite triangular potential well.
 *
 * V(x) = height + offset    for x < 0
 * V(x) = offset             at x = 0
 * V(x) = offset + (height/width) * x    for 0 < x < width
 * V(x) = height + offset    for x > width
 *
 * This creates a triangular well with minimum at x = 0.
 * The solution involves Airy functions Ai(z) and Bi(z).
 *
 * Bound states exist when: offset < E < height + offset
 *
 * REFERENCES:
 * - Griffiths, D. J., & Schroeter, D. F. (2018). "Introduction to Quantum Mechanics" (3rd ed.).
 *   Cambridge University Press. Problem 2.44, pp. 89-90.
 *   https://doi.org/10.1017/9781316995433
 *   Triangular well using Airy function solutions.
 *
 * - Landau, L. D., & Lifshitz, E. M. (1977). "Quantum Mechanics: Non-Relativistic Theory" (3rd ed.).
 *   Pergamon Press. Section 25, pp. 78-81.
 *   Quasi-classical approximation for linear potential.
 *
 * - Miller, S. C., & Good, R. H. (1953). "A WKB-Type Approximation to the Schrödinger Equation"
 *   Physical Review, 91(1), 174-179.
 *   https://doi.org/10.1103/PhysRev.91.174
 *   Connection formulas at linear turning points.
 *
 * - Vallée, O., & Soares, M. (2004). "Airy Functions and Applications to Physics".
 *   Imperial College Press. Chapter 5, pp. 115-145.
 *   https://doi.org/10.1142/p345
 *   Comprehensive treatment of Airy functions in quantum mechanics.
 *
 * - Abramowitz, M., & Stegun, I. A. (1964). "Handbook of Mathematical Functions".
 *   National Bureau of Standards. Section 10.4, pp. 446-452.
 *   https://doi.org/10.1119/1.15378
 *   Properties and zeros of Airy functions.
 *
 * SOLUTION USING AIRY FUNCTIONS:
 * For linear potential V(x) = F·x + V₀, the Schrödinger equation becomes:
 *   ψ''(x) + (2m/ℏ²)[E - F·x - V₀]ψ(x) = 0
 * This is the Airy equation with solution:
 *   ψ(x) = A·Ai(α(x - x₀)) + B·Bi(α(x - x₀))
 * where α = (2mF/ℏ²)^(1/3), x₀ = (E - V₀)/F is the classical turning point
 *
 * TRANSCENDENTAL EQUATION (from boundary matching):
 * Boundary conditions at x=0 and x=width lead to a transcendental equation
 * that determines allowed energies. Must be solved numerically.
 */

import type { BoundStateResult, FourierTransformResult, GridConfig, PotentialFunction } from "../PotentialFunction.js";
import QuantumConstants from "../QuantumConstants.js";
import { AnalyticalSolution } from "./AnalyticalSolution.js";
import {
  applySignConvention,
  calculateAiryAlpha,
  generateGrid,
  normalizeWavefunction,
  refineBisection,
} from "./airy-utilities.js";
import { computeNumericalFourierTransform } from "./fourier-transform-helper.js";
import { airyAi, airyAiPrime, airyBi, airyBiPrime } from "./math-utilities.js";

/**
 * Class-based implementation of triangular potential analytical solution.
 * Extends the AnalyticalSolution abstract base class.
 */
export class TriangularPotentialSolution extends AnalyticalSolution {
  private height: number;
  private width: number;
  private offset: number;
  private mass: number;

  constructor(height: number, width: number, offset: number, mass: number) {
    super();
    this.height = height;
    this.width = width;
    this.offset = offset;
    this.mass = mass;
  }

  solve(numStates: number, gridConfig: GridConfig): BoundStateResult {
    return solveTriangularPotential(this.height, this.width, this.offset, this.mass, numStates, gridConfig);
  }

  createPotential(): PotentialFunction {
    return createTriangularPotential(this.height, this.width, this.offset);
  }

  calculateClassicalProbability(energy: number, mass: number, xGrid: number[]): number[] {
    return calculateTriangularPotentialClassicalProbability(this.height, this.width, this.offset, energy, mass, xGrid);
  }

  calculateWavefunctionZeros(_stateIndex: number, energy: number): number[] {
    return calculateTriangularPotentialWavefunctionZeros(this.height, this.width, this.offset, this.mass, energy);
  }

  calculateTurningPoints(energy: number): Array<{ left: number; right: number }> {
    const points = calculateTriangularPotentialTurningPoints(this.height, this.width, this.offset, energy);
    return [points]; // Return as array with single element for simple single-well potential
  }

  calculateWavefunctionFirstDerivative(stateIndex: number, xGrid: number[]): number[] {
    // Need energy to calculate first derivative
    // Solve if not already done
    const result = this.solve(stateIndex + 1, {
      xMin: xGrid[0]!,
      xMax: xGrid[xGrid.length - 1]!,
      numPoints: 100,
    });
    const energy = result.energies[stateIndex]!;

    return calculateTriangularPotentialWavefunctionFirstDerivative(
      this.height,
      this.width,
      this.offset,
      this.mass,
      energy,
      xGrid,
    );
  }

  calculateWavefunctionSecondDerivative(stateIndex: number, xGrid: number[]): number[] {
    // Need energy to calculate second derivative
    // Solve if not already done
    const result = this.solve(stateIndex + 1, {
      xMin: xGrid[0]!,
      xMax: xGrid[xGrid.length - 1]!,
      numPoints: 100,
    });
    const energy = result.energies[stateIndex]!;

    return calculateTriangularPotentialWavefunctionSecondDerivative(
      this.height,
      this.width,
      this.offset,
      this.mass,
      energy,
      xGrid,
    );
  }

  calculateWavefunctionMinMax(
    stateIndex: number,
    xMin: number,
    xMax: number,
    numPoints?: number,
  ): { min: number; max: number; extremaPositions: number[] } {
    // Need energy to calculate min/max
    // Solve if not already done
    const result = this.solve(stateIndex + 1, {
      xMin,
      xMax,
      numPoints: 100,
    });
    const energy = result.energies[stateIndex]!;

    return calculateTriangularPotentialWavefunctionMinMax(
      this.height,
      this.width,
      this.offset,
      this.mass,
      energy,
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
    return calculateTriangularPotentialSuperpositionMinMax(
      this.height,
      this.width,
      this.offset,
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
    return computeNumericalFourierTransform(boundStateResult, mass, this.height, numMomentumPoints, pMax);
  }
}

/**
 * Analytical solution for the finite triangular potential well.
 *
 * @param height - Height of the potential barrier (Joules)
 * @param width - Width of the triangular region (meters)
 * @param offset - Energy offset/minimum of the well (Joules)
 * @param mass - Particle mass in kg
 * @param numStates - Number of energy levels to calculate
 * @param gridConfig - Grid configuration for wavefunction evaluation
 * @returns Bound state results with energies and wavefunctions
 */
export function solveTriangularPotential(
  height: number,
  width: number,
  offset: number,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
): BoundStateResult {
  const { HBAR } = QuantumConstants;

  // Slope of the linear potential region: F = height / width
  const F = height / width;

  // Barrier height (maximum potential)
  const V0 = height + offset;

  // Scaling parameter for Airy functions
  const alpha = calculateAiryAlpha(mass, F);

  // Find bound state energies by solving transcendental equation
  const energies: number[] = [];

  // Energy must be between offset (minimum) and V0 (barrier height)
  const Emin = offset + 1e-6 * Math.abs(height);
  const Emax = V0 - 1e-6 * Math.abs(height);

  // Number of search points for initial bracketing
  const numSearchPoints = 1000;
  const dE = (Emax - Emin) / numSearchPoints;

  // Function to evaluate the transcendental equation
  const transcendentalFunction = (E: number): number => {
    // Decay constant in barrier regions
    const kappa = Math.sqrt(2 * mass * (V0 - E)) / HBAR;

    // Classical turning point in linear region
    const x0 = (E - offset) / F;

    // Airy function arguments at boundaries
    const z0 = alpha * (0 - x0);
    const zW = alpha * (width - x0);

    // Evaluate Airy functions and derivatives
    const Ai0 = airyAi(z0);
    const Bi0 = airyBi(z0);
    const AiW = airyAi(zW);
    const BiW = airyBi(zW);
    const AiPrime0 = airyAiPrime(z0);
    const BiPrime0 = airyBiPrime(z0);
    const AiPrimeW = airyAiPrime(zW);
    const BiPrimeW = airyBiPrime(zW);

    // Boundary matching coefficients
    const leftAi = kappa * Ai0 - alpha * AiPrime0;
    const leftBi = kappa * Bi0 - alpha * BiPrime0;
    const rightAi = kappa * AiW + alpha * AiPrimeW;
    const rightBi = kappa * BiW + alpha * BiPrimeW;

    // Transcendental equation: leftBi * rightAi - leftAi * rightBi = 0
    return leftBi * rightAi - leftAi * rightBi;
  };

  // Find sign changes to bracket roots
  let prevF = transcendentalFunction(Emin);
  const brackets: [number, number][] = [];

  for (let i = 1; i <= numSearchPoints; i++) {
    const E = Emin + i * dE;
    const currF = transcendentalFunction(E);

    if (prevF * currF < 0) {
      brackets.push([E - dE, E]);
    }

    prevF = currF;

    if (brackets.length >= numStates * 2) {
      break;
    }
  }

  // Refine each bracket using bisection
  for (const [Ea, Eb] of brackets) {
    const energy = refineBisection(transcendentalFunction, Ea, Eb, 1e-12, 100);
    if (energy !== null) {
      energies.push(energy);

      if (energies.length >= numStates) {
        break;
      }
    }
  }

  // Sort energies
  energies.sort((a, b) => a - b);

  const actualNumStates = energies.length;

  if (actualNumStates === 0) {
    return {
      energies: [],
      wavefunctions: [],
      xGrid: [],
      method: "analytical",
    };
  }

  // Generate grid
  const { xGrid, dx } = generateGrid(gridConfig);

  // Calculate wavefunctions
  const wavefunctions: number[][] = [];

  for (let n = 0; n < actualNumStates; n++) {
    const E = energies[n]!;

    // Decay constant
    const kappa = Math.sqrt(2 * mass * (V0 - E)) / HBAR;

    // Classical turning point
    const x0 = (E - offset) / F;

    // Airy function arguments at boundaries
    const z0 = alpha * (0 - x0);
    const zW = alpha * (width - x0);

    // Get Airy functions at left boundary (z0 is typically negative for bound states)
    const Ai0 = airyAi(z0);
    const Bi0 = airyBi(z0);
    const AiPrime0 = airyAiPrime(z0);
    const BiPrime0 = airyBiPrime(z0);

    // Boundary matching at x=0 (left boundary)
    // ψ must match exponential decay: ψ = C*exp(κx) for x<0
    // Continuity: A*Ai(z0) + B*Bi(z0) = C
    // Derivative continuity: α*(A*Ai'(z0) + B*Bi'(z0)) = κ*C
    // This gives: κ*(A*Ai0 + B*Bi0) = α*(A*Ai'0 + B*Bi'0)
    // Rearranging: A*(κ*Ai0 - α*Ai'0) = -B*(κ*Bi0 - α*Bi'0)
    const leftAi = kappa * Ai0 - alpha * AiPrime0;
    const leftBi = kappa * Bi0 - alpha * BiPrime0;

    // For numerical stability, compute A/B ratio from left boundary
    // A/B = -leftBi / leftAi
    // But we need to be careful: for bound states, both boundary conditions
    // should give the same ratio. Use the one that's more stable.

    // Compute coefficients using left boundary condition
    // Normalize so that |A|² + |B|² = 1 for better numerical behavior
    let A: number, B: number;

    if (Math.abs(leftAi) > 1e-12) {
      const ratio = -leftBi / leftAi; // A/B
      // Normalize: A = ratio/sqrt(1 + ratio²), B = 1/sqrt(1 + ratio²)
      const normFactor = 1.0 / Math.sqrt(1.0 + ratio * ratio);
      A = ratio * normFactor;
      B = normFactor;
    } else if (Math.abs(leftBi) > 1e-12) {
      // leftAi ≈ 0 means A can be anything, use B/A ratio instead
      const ratio = -leftAi / leftBi; // B/A
      const normFactor = 1.0 / Math.sqrt(1.0 + ratio * ratio);
      A = normFactor;
      B = ratio * normFactor;
    } else {
      // Both are small - use default
      A = 1;
      B = 0;
    }

    // Verify the solution doesn't blow up by checking the ratio A*Ai + B*Bi
    // at a point where z is moderately positive (but not too large)
    const zTest = Math.min(zW, 3.0); // Test at z=3 or zW, whichever is smaller
    if (zTest > 0) {
      const AiTest = airyAi(zTest);
      const BiTest = airyBi(zTest);
      const psiTest = A * AiTest + B * BiTest;

      // If the wavefunction is already blowing up at z=3,
      // the coefficient ratio needs adjustment
      // For true bound state, |ψ| should be decaying, not growing
      if (Math.abs(psiTest) > 100 * Math.abs(A * Ai0 + B * Bi0)) {
        // Coefficients are causing blow-up, try to minimize Bi contribution
        // Use the asymptotic behavior: for decay, we need mostly Ai
        A = 1;
        B = (-A * airyAi(zTest)) / airyBi(zTest);
        // Re-normalize
        const norm = Math.sqrt(A * A + B * B);
        A /= norm;
        B /= norm;
      }
    }

    // Compute unnormalized wavefunction
    //
    // Key insight: In the classically forbidden region (x > x0), the physical
    // solution must decay. The combination A*Ai + B*Bi should produce this decay,
    // but numerical errors cause Bi to dominate and blow up.
    //
    // Solution: For x > x0 (positive z), use only the decaying Ai solution
    // and match amplitude at the classical turning point z=0.
    const psiRaw: number[] = [];

    // Compute wavefunction at x=0 for left region
    const psiAt0 = A * Ai0 + B * Bi0;

    // Value at classical turning point (z=0)
    const psiAtX0 = A * airyAi(0) + B * airyBi(0);

    // For the forbidden region, we use WKB-like decay
    // The local wavevector in the linear potential is:
    // k(x) = sqrt(2m(V(x)-E)/ℏ²) = sqrt(2m*F*(x-x0)/ℏ²) = alpha^(3/2) * sqrt(x-x0)
    // WKB: ψ ~ exp(-∫k dx) = exp(-2/3 * alpha^(3/2) * (x-x0)^(3/2))
    // This matches the asymptotic form of Ai(z) for large z

    for (const x of xGrid) {
      let psi: number;

      if (x < 0) {
        // Region I: exponential decay to the left
        psi = psiAt0 * Math.exp(kappa * x);
      } else if (x <= x0) {
        // Region II-a: classically allowed region (0 <= x <= x0)
        // Use full Airy combination here where both are well-behaved
        const z = alpha * (x - x0); // z <= 0 here
        psi = A * airyAi(z) + B * airyBi(z);
      } else if (x < width) {
        // Region II-b: classically forbidden within linear potential (x0 < x < width)
        // Use WKB/asymptotic decay to avoid Bi blow-up
        const z = alpha * (x - x0); // z > 0 here

        // Use Ai-only with amplitude matched at turning point
        // Ai(z) for large z ~ exp(-2/3 * z^(3/2)) / (2*sqrt(pi)*z^(1/4))
        // But for moderate z, use actual Ai
        if (z < 4.0) {
          // For small positive z, Ai is still accurate
          // Scale to match amplitude at turning point
          const aiAtZ = airyAi(z);
          const aiAt0 = airyAi(0);
          psi = psiAtX0 * (aiAtZ / aiAt0);
        } else {
          // For larger z, use asymptotic form of Ai
          const zeta = (2.0 / 3.0) * z ** 1.5;
          const aiAt0 = airyAi(0);
          // Ai(z)/Ai(0) ~ (1/(2*sqrt(pi)*z^(1/4))) * exp(-zeta) / Ai(0)
          const ratio = ((1.0 / (2.0 * Math.sqrt(Math.PI) * z ** 0.25)) * Math.exp(-zeta)) / aiAt0;
          psi = psiAtX0 * ratio;
        }
      } else {
        // Region III: exponential decay in right barrier (x >= width)
        // Continue exponential decay from end of linear region
        const zAtWidth = alpha * (width - x0);
        let psiAtWidth: number;

        if (zAtWidth < 4.0) {
          const aiAtWidth = airyAi(zAtWidth);
          const aiAt0 = airyAi(0);
          psiAtWidth = psiAtX0 * (aiAtWidth / aiAt0);
        } else {
          const zeta = (2.0 / 3.0) * zAtWidth ** 1.5;
          const aiAt0 = airyAi(0);
          const ratio = ((1.0 / (2.0 * Math.sqrt(Math.PI) * zAtWidth ** 0.25)) * Math.exp(-zeta)) / aiAt0;
          psiAtWidth = psiAtX0 * ratio;
        }

        psi = psiAtWidth * Math.exp(-kappa * (x - width));
      }

      psiRaw.push(psi);
    }

    // Normalize and apply sign convention
    const normalizedPsi = normalizeWavefunction(psiRaw, dx);
    const wavefunction = applySignConvention(normalizedPsi, n);
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
 * Create the potential function for a finite triangular potential well.
 * V(x) = height + offset for x < 0
 * V(x) = offset + (height/width) * x for 0 ≤ x ≤ width
 * V(x) = height + offset for x > width
 *
 * @param height - Height of the potential barrier (Joules)
 * @param width - Width of the triangular region (meters)
 * @param offset - Energy offset/minimum of the well (Joules)
 * @returns Potential function V(x) in Joules
 */
export function createTriangularPotential(height: number, width: number, offset: number): (x: number) => number {
  const F = height / width;
  const V0 = height + offset;

  return (x: number) => {
    if (x < 0) {
      return V0;
    } else if (x <= width) {
      return offset + F * x;
    } else {
      return V0;
    }
  };
}

/**
 * Compute the normalization constant for a triangular potential wavefunction.
 * This ensures ∫|ψ|² dx = 1 through numerical integration.
 *
 * @param height - Height of the potential barrier (Joules)
 * @param width - Width of the triangular region (meters)
 * @param offset - Energy offset/minimum of the well (Joules)
 * @param mass - Particle mass in kg
 * @param energy - Energy of the eigenstate in Joules
 * @param A - Coefficient for Ai in the Airy solution
 * @param B - Coefficient for Bi in the Airy solution
 * @param xMin - Left boundary for integration (meters)
 * @param xMax - Right boundary for integration (meters)
 * @param numPoints - Number of integration points (default: 1000)
 * @returns Normalization constant N such that ∫|N·ψ|² dx = 1
 */
function computeTriangularPotentialNormalization(
  height: number,
  width: number,
  offset: number,
  mass: number,
  energy: number,
  A: number,
  B: number,
  xMin: number,
  xMax: number,
  numPoints: number = 1000,
): number {
  const { HBAR } = QuantumConstants;
  const F = height / width;
  const V0 = height + offset;
  const alpha = calculateAiryAlpha(mass, F);
  const kappa = Math.sqrt(2 * mass * (V0 - energy)) / HBAR;
  const x0 = (energy - offset) / F;

  const z0 = alpha * (0 - x0);
  const Ai0 = airyAi(z0);
  const Bi0 = airyBi(z0);
  const psiAt0 = A * Ai0 + B * Bi0;
  const psiAtX0 = A * airyAi(0) + B * airyBi(0);

  let integral = 0;
  const dx = (xMax - xMin) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const x = xMin + i * dx;
    let psi: number;

    if (x < 0) {
      psi = psiAt0 * Math.exp(kappa * x);
    } else if (x <= x0) {
      const z = alpha * (x - x0);
      psi = A * airyAi(z) + B * airyBi(z);
    } else if (x < width) {
      const z = alpha * (x - x0);
      if (z < 4.0) {
        const aiAtZ = airyAi(z);
        const aiAt0 = airyAi(0);
        psi = psiAtX0 * (aiAtZ / aiAt0);
      } else {
        const zeta = (2.0 / 3.0) * z ** 1.5;
        const aiAt0 = airyAi(0);
        const ratio = ((1.0 / (2.0 * Math.sqrt(Math.PI) * z ** 0.25)) * Math.exp(-zeta)) / aiAt0;
        psi = psiAtX0 * ratio;
      }
    } else {
      const zAtWidth = alpha * (width - x0);
      let psiAtWidth: number;
      if (zAtWidth < 4.0) {
        const aiAtWidth = airyAi(zAtWidth);
        const aiAt0 = airyAi(0);
        psiAtWidth = psiAtX0 * (aiAtWidth / aiAt0);
      } else {
        const zeta = (2.0 / 3.0) * zAtWidth ** 1.5;
        const aiAt0 = airyAi(0);
        const ratio = ((1.0 / (2.0 * Math.sqrt(Math.PI) * zAtWidth ** 0.25)) * Math.exp(-zeta)) / aiAt0;
        psiAtWidth = psiAtX0 * ratio;
      }
      psi = psiAtWidth * Math.exp(-kappa * (x - width));
    }

    // Trapezoidal rule
    if (i === 0 || i === numPoints - 1) {
      integral += 0.5 * psi * psi;
    } else {
      integral += psi * psi;
    }
  }

  integral *= dx;

  return integral > 0 ? 1.0 / Math.sqrt(integral) : 1.0;
}

/**
 * Calculate classical probability density for a finite triangular potential well.
 * P(x) ∝ 1/v(x) = 1/√[2(E - V(x))/m]
 *
 * @param height - Height of the potential barrier (Joules)
 * @param width - Width of the triangular region (meters)
 * @param offset - Energy offset/minimum of the well (Joules)
 * @param energy - Energy of the particle in Joules
 * @param mass - Particle mass in kg
 * @param xGrid - Array of x positions in meters
 * @returns Array of normalized classical probability density values (in 1/meters)
 */
export function calculateTriangularPotentialClassicalProbability(
  height: number,
  width: number,
  offset: number,
  energy: number,
  mass: number,
  xGrid: number[],
): number[] {
  const potentialFn = createTriangularPotential(height, width, offset);
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
 * Calculate the classical turning points for a finite triangular potential well.
 * Left turning point is at x = 0, right turning point is where E = offset + F*x
 *
 * @param height - Height of the potential barrier (Joules)
 * @param width - Width of the triangular region (meters)
 * @param offset - Energy offset/minimum of the well (Joules)
 * @param energy - Energy of the particle in Joules
 * @returns Object with left and right turning point positions (in meters)
 */
export function calculateTriangularPotentialTurningPoints(
  height: number,
  width: number,
  offset: number,
  energy: number,
): { left: number; right: number } {
  const F = height / width;

  // Left turning point is at x = 0 (start of linear region)
  const left = 0;

  // Right turning point where E = offset + F*x => x = (E - offset)/F
  const right = Math.min((energy - offset) / F, width);

  return { left, right };
}

/**
 * Calculate wavefunction zeros for finite triangular potential (numerical approach).
 * Since the wavefunction involves Airy functions, zeros must be found numerically.
 *
 * @param height - Height of the potential barrier (Joules)
 * @param width - Width of the triangular region (meters)
 * @param offset - Energy offset/minimum of the well (Joules)
 * @param mass - Particle mass in kg
 * @param energy - Energy of the eigenstate in Joules
 * @param searchRange - Range to search for zeros (in meters)
 * @returns Array of x positions (in meters) where wavefunction is zero
 */
export function calculateTriangularPotentialWavefunctionZeros(
  height: number,
  width: number,
  offset: number,
  mass: number,
  energy: number,
  searchRange: number = 20e-9,
): number[] {
  const F = height / width;
  const V0 = height + offset;
  const alpha = calculateAiryAlpha(mass, F);
  const x0 = (energy - offset) / F;

  // Get coefficients A and B from boundary conditions (similar to solver)
  const { HBAR } = QuantumConstants;
  const kappa = Math.sqrt(2 * mass * (V0 - energy)) / HBAR;

  const z0 = alpha * (0 - x0);
  const Ai0 = airyAi(z0);
  const Bi0 = airyBi(z0);
  const AiPrime0 = airyAiPrime(z0);
  const BiPrime0 = airyBiPrime(z0);

  const leftAi = kappa * Ai0 - alpha * AiPrime0;
  const leftBi = kappa * Bi0 - alpha * BiPrime0;

  let A: number, B: number;
  if (Math.abs(leftAi) > 1e-12) {
    const ratio = -leftBi / leftAi;
    const normFactor = 1.0 / Math.sqrt(1.0 + ratio * ratio);
    A = ratio * normFactor;
    B = normFactor;
  } else {
    A = 1;
    B = 0;
  }

  const psiAt0 = A * Ai0 + B * Bi0;
  const psiAtX0 = A * airyAi(0) + B * airyBi(0);

  // Helper function to evaluate wavefunction
  const evaluatePsi = (x: number): number => {
    if (x < 0) {
      return psiAt0 * Math.exp(kappa * x);
    } else if (x <= x0) {
      const z = alpha * (x - x0);
      return A * airyAi(z) + B * airyBi(z);
    } else if (x < width) {
      const z = alpha * (x - x0);
      if (z < 4.0) {
        const aiAtZ = airyAi(z);
        const aiAt0 = airyAi(0);
        return psiAtX0 * (aiAtZ / aiAt0);
      } else {
        const zeta = (2.0 / 3.0) * z ** 1.5;
        const aiAt0 = airyAi(0);
        const ratio = ((1.0 / (2.0 * Math.sqrt(Math.PI) * z ** 0.25)) * Math.exp(-zeta)) / aiAt0;
        return psiAtX0 * ratio;
      }
    } else {
      const zAtWidth = alpha * (width - x0);
      let psiAtWidth: number;
      if (zAtWidth < 4.0) {
        const aiAtWidth = airyAi(zAtWidth);
        const aiAt0 = airyAi(0);
        psiAtWidth = psiAtX0 * (aiAtWidth / aiAt0);
      } else {
        const zeta = (2.0 / 3.0) * zAtWidth ** 1.5;
        const aiAt0 = airyAi(0);
        const ratio = ((1.0 / (2.0 * Math.sqrt(Math.PI) * zAtWidth ** 0.25)) * Math.exp(-zeta)) / aiAt0;
        psiAtWidth = psiAtX0 * ratio;
      }
      return psiAtWidth * Math.exp(-kappa * (x - width));
    }
  };

  const zeros: number[] = [];
  const numSamples = 1000;
  const dx = (2 * searchRange) / numSamples;

  // Evaluate wavefunction at first point
  let prevX = -searchRange;
  let prevVal = evaluatePsi(prevX);

  for (let i = 1; i <= numSamples; i++) {
    const x = -searchRange + i * dx;
    const val = evaluatePsi(x);

    // Sign change detected
    if (prevVal * val < 0) {
      // Use bisection to refine
      let left = prevX;
      let right = x;
      for (let iter = 0; iter < 20; iter++) {
        const mid = (left + right) / 2;
        const valMid = evaluatePsi(mid);

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
 * Calculate the first derivative of the wavefunction for a finite triangular potential.
 * Uses numerical differentiation.
 *
 * @param height - Height of the potential barrier (Joules)
 * @param width - Width of the triangular region (meters)
 * @param offset - Energy offset/minimum of the well (Joules)
 * @param mass - Particle mass in kg
 * @param energy - Energy of the eigenstate in Joules
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of first derivative values
 */
export function calculateTriangularPotentialWavefunctionFirstDerivative(
  height: number,
  width: number,
  offset: number,
  mass: number,
  energy: number,
  xGrid: number[],
): number[] {
  const { HBAR } = QuantumConstants;
  const F = height / width;
  const V0 = height + offset;
  const alpha = calculateAiryAlpha(mass, F);
  const kappa = Math.sqrt(2 * mass * (V0 - energy)) / HBAR;
  const x0 = (energy - offset) / F;

  // Get coefficients A and B from boundary conditions
  const z0 = alpha * (0 - x0);
  const Ai0 = airyAi(z0);
  const Bi0 = airyBi(z0);
  const AiPrime0 = airyAiPrime(z0);
  const BiPrime0 = airyBiPrime(z0);

  const leftAi = kappa * Ai0 - alpha * AiPrime0;
  const leftBi = kappa * Bi0 - alpha * BiPrime0;

  let A: number, B: number;
  if (Math.abs(leftAi) > 1e-12) {
    const ratio = -leftBi / leftAi;
    const normFactor = 1.0 / Math.sqrt(1.0 + ratio * ratio);
    A = ratio * normFactor;
    B = normFactor;
  } else {
    A = 1;
    B = 0;
  }

  // Compute normalization constant
  const xMin = Math.min(...xGrid);
  const xMax = Math.max(...xGrid);
  const normalization = computeTriangularPotentialNormalization(
    height,
    width,
    offset,
    mass,
    energy,
    A,
    B,
    xMin,
    xMax,
    1000,
  );

  const psiAt0 = A * Ai0 + B * Bi0;
  const psiAtX0 = A * airyAi(0) + B * airyBi(0);

  const firstDerivative: number[] = [];
  const h = 1e-12;

  // Helper function to evaluate wavefunction
  const evaluatePsi = (x: number): number => {
    if (x < 0) {
      return normalization * psiAt0 * Math.exp(kappa * x);
    } else if (x <= x0) {
      const z = alpha * (x - x0);
      return normalization * (A * airyAi(z) + B * airyBi(z));
    } else if (x < width) {
      const z = alpha * (x - x0);
      if (z < 4.0) {
        const aiAtZ = airyAi(z);
        const aiAt0 = airyAi(0);
        return normalization * psiAtX0 * (aiAtZ / aiAt0);
      } else {
        const zeta = (2.0 / 3.0) * z ** 1.5;
        const aiAt0 = airyAi(0);
        const ratio = ((1.0 / (2.0 * Math.sqrt(Math.PI) * z ** 0.25)) * Math.exp(-zeta)) / aiAt0;
        return normalization * psiAtX0 * ratio;
      }
    } else {
      const zAtWidth = alpha * (width - x0);
      let psiAtWidth: number;
      if (zAtWidth < 4.0) {
        const aiAtWidth = airyAi(zAtWidth);
        const aiAt0 = airyAi(0);
        psiAtWidth = psiAtX0 * (aiAtWidth / aiAt0);
      } else {
        const zeta = (2.0 / 3.0) * zAtWidth ** 1.5;
        const aiAt0 = airyAi(0);
        const ratio = ((1.0 / (2.0 * Math.sqrt(Math.PI) * zAtWidth ** 0.25)) * Math.exp(-zeta)) / aiAt0;
        psiAtWidth = psiAtX0 * ratio;
      }
      return normalization * psiAtWidth * Math.exp(-kappa * (x - width));
    }
  };

  for (const x of xGrid) {
    const psiMinus = evaluatePsi(x - h);
    const psiPlus = evaluatePsi(x + h);

    // First derivative using central difference
    const firstDeriv = (psiPlus - psiMinus) / (2 * h);
    firstDerivative.push(firstDeriv);
  }

  return firstDerivative;
}

/**
 * Calculate the second derivative of the wavefunction for a finite triangular potential.
 * Uses numerical differentiation.
 *
 * @param height - Height of the potential barrier (Joules)
 * @param width - Width of the triangular region (meters)
 * @param offset - Energy offset/minimum of the well (Joules)
 * @param mass - Particle mass in kg
 * @param energy - Energy of the eigenstate in Joules
 * @param xGrid - Array of x positions in meters where derivatives should be evaluated
 * @returns Array of second derivative values
 */
export function calculateTriangularPotentialWavefunctionSecondDerivative(
  height: number,
  width: number,
  offset: number,
  mass: number,
  energy: number,
  xGrid: number[],
): number[] {
  const { HBAR } = QuantumConstants;
  const F = height / width;
  const V0 = height + offset;
  const alpha = calculateAiryAlpha(mass, F);
  const kappa = Math.sqrt(2 * mass * (V0 - energy)) / HBAR;
  const x0 = (energy - offset) / F;

  // Get coefficients A and B from boundary conditions
  const z0 = alpha * (0 - x0);
  const Ai0 = airyAi(z0);
  const Bi0 = airyBi(z0);
  const AiPrime0 = airyAiPrime(z0);
  const BiPrime0 = airyBiPrime(z0);

  const leftAi = kappa * Ai0 - alpha * AiPrime0;
  const leftBi = kappa * Bi0 - alpha * BiPrime0;

  let A: number, B: number;
  if (Math.abs(leftAi) > 1e-12) {
    const ratio = -leftBi / leftAi;
    const normFactor = 1.0 / Math.sqrt(1.0 + ratio * ratio);
    A = ratio * normFactor;
    B = normFactor;
  } else {
    A = 1;
    B = 0;
  }

  // Compute normalization constant
  const xMin = Math.min(...xGrid);
  const xMax = Math.max(...xGrid);
  const normalization = computeTriangularPotentialNormalization(
    height,
    width,
    offset,
    mass,
    energy,
    A,
    B,
    xMin,
    xMax,
    1000,
  );

  const psiAt0 = A * Ai0 + B * Bi0;
  const psiAtX0 = A * airyAi(0) + B * airyBi(0);

  const secondDerivative: number[] = [];
  const h = 1e-12;

  // Helper function to evaluate wavefunction
  const evaluatePsi = (x: number): number => {
    if (x < 0) {
      return normalization * psiAt0 * Math.exp(kappa * x);
    } else if (x <= x0) {
      const z = alpha * (x - x0);
      return normalization * (A * airyAi(z) + B * airyBi(z));
    } else if (x < width) {
      const z = alpha * (x - x0);
      if (z < 4.0) {
        const aiAtZ = airyAi(z);
        const aiAt0 = airyAi(0);
        return normalization * psiAtX0 * (aiAtZ / aiAt0);
      } else {
        const zeta = (2.0 / 3.0) * z ** 1.5;
        const aiAt0 = airyAi(0);
        const ratio = ((1.0 / (2.0 * Math.sqrt(Math.PI) * z ** 0.25)) * Math.exp(-zeta)) / aiAt0;
        return normalization * psiAtX0 * ratio;
      }
    } else {
      const zAtWidth = alpha * (width - x0);
      let psiAtWidth: number;
      if (zAtWidth < 4.0) {
        const aiAtWidth = airyAi(zAtWidth);
        const aiAt0 = airyAi(0);
        psiAtWidth = psiAtX0 * (aiAtWidth / aiAt0);
      } else {
        const zeta = (2.0 / 3.0) * zAtWidth ** 1.5;
        const aiAt0 = airyAi(0);
        const ratio = ((1.0 / (2.0 * Math.sqrt(Math.PI) * zAtWidth ** 0.25)) * Math.exp(-zeta)) / aiAt0;
        psiAtWidth = psiAtX0 * ratio;
      }
      return normalization * psiAtWidth * Math.exp(-kappa * (x - width));
    }
  };

  for (const x of xGrid) {
    const psiMinus = evaluatePsi(x - h);
    const psi = evaluatePsi(x);
    const psiPlus = evaluatePsi(x + h);

    // Second derivative using central difference
    const secondDeriv = (psiPlus - 2 * psi + psiMinus) / (h * h);
    secondDerivative.push(secondDeriv);
  }

  return secondDerivative;
}

/**
 * Calculate the minimum and maximum values of the wavefunction for a finite triangular potential.
 *
 * @param height - Height of the potential barrier (Joules)
 * @param width - Width of the triangular region (meters)
 * @param offset - Energy offset/minimum of the well (Joules)
 * @param mass - Particle mass in kg
 * @param energy - Energy of the eigenstate in Joules
 * @param xMin - Left boundary of the region in meters
 * @param xMax - Right boundary of the region in meters
 * @param numPoints - Number of points to sample (default: 1000)
 * @returns Object containing min/max values and x-positions of all extrema
 */
export function calculateTriangularPotentialWavefunctionMinMax(
  height: number,
  width: number,
  offset: number,
  mass: number,
  energy: number,
  xMin: number,
  xMax: number,
  numPoints: number = 1000,
): { min: number; max: number; extremaPositions: number[] } {
  const { HBAR } = QuantumConstants;
  const F = height / width;
  const V0 = height + offset;
  const alpha = calculateAiryAlpha(mass, F);
  const kappa = Math.sqrt(2 * mass * (V0 - energy)) / HBAR;
  const x0 = (energy - offset) / F;

  // Get coefficients A and B from boundary conditions
  const z0 = alpha * (0 - x0);
  const Ai0 = airyAi(z0);
  const Bi0 = airyBi(z0);
  const AiPrime0 = airyAiPrime(z0);
  const BiPrime0 = airyBiPrime(z0);

  const leftAi = kappa * Ai0 - alpha * AiPrime0;
  const leftBi = kappa * Bi0 - alpha * BiPrime0;

  let A: number, B: number;
  if (Math.abs(leftAi) > 1e-12) {
    const ratio = -leftBi / leftAi;
    const normFactor = 1.0 / Math.sqrt(1.0 + ratio * ratio);
    A = ratio * normFactor;
    B = normFactor;
  } else {
    A = 1;
    B = 0;
  }

  // Compute normalization constant
  const normalization = computeTriangularPotentialNormalization(
    height,
    width,
    offset,
    mass,
    energy,
    A,
    B,
    xMin,
    xMax,
    numPoints,
  );

  const psiAt0 = A * Ai0 + B * Bi0;
  const psiAtX0 = A * airyAi(0) + B * airyBi(0);

  let min = Infinity;
  let max = -Infinity;
  const extremaPositions: number[] = [];

  const dx = (xMax - xMin) / (numPoints - 1);
  const h = 1e-12; // Small step for numerical derivative
  let prevDerivativeSign: number | null = null;

  // Helper function to calculate psi at a given x
  const calculatePsi = (x: number): number => {
    if (x < 0) {
      return normalization * psiAt0 * Math.exp(kappa * x);
    } else if (x <= x0) {
      const z = alpha * (x - x0);
      return normalization * (A * airyAi(z) + B * airyBi(z));
    } else if (x < width) {
      const z = alpha * (x - x0);
      if (z < 4.0) {
        const aiAtZ = airyAi(z);
        const aiAt0 = airyAi(0);
        return normalization * psiAtX0 * (aiAtZ / aiAt0);
      } else {
        const zeta = (2.0 / 3.0) * z ** 1.5;
        const aiAt0 = airyAi(0);
        const ratio = ((1.0 / (2.0 * Math.sqrt(Math.PI) * z ** 0.25)) * Math.exp(-zeta)) / aiAt0;
        return normalization * psiAtX0 * ratio;
      }
    } else {
      const zAtWidth = alpha * (width - x0);
      let psiAtWidth: number;
      if (zAtWidth < 4.0) {
        const aiAtWidth = airyAi(zAtWidth);
        const aiAt0 = airyAi(0);
        psiAtWidth = psiAtX0 * (aiAtWidth / aiAt0);
      } else {
        const zeta = (2.0 / 3.0) * zAtWidth ** 1.5;
        const aiAt0 = airyAi(0);
        const ratio = ((1.0 / (2.0 * Math.sqrt(Math.PI) * zAtWidth ** 0.25)) * Math.exp(-zeta)) / aiAt0;
        psiAtWidth = psiAtX0 * ratio;
      }
      return normalization * psiAtWidth * Math.exp(-kappa * (x - width));
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
 * Calculate the minimum and maximum values of a superposition of wavefunctions
 * for a finite triangular potential.
 *
 * The superposition is: Ψ(x,t) = Σ cₙ ψₙ(x) exp(-iEₙt/ℏ)
 * We return the min/max of the real part of this complex-valued function.
 *
 * @param height - Height of the potential barrier (Joules)
 * @param width - Width of the triangular region (meters)
 * @param offset - Energy offset/minimum of the well (Joules)
 * @param mass - Particle mass in kg
 * @param coefficients - Complex coefficients for each eigenstate (as [real, imag] pairs)
 * @param energies - Energy eigenvalues in Joules
 * @param time - Time in seconds
 * @param xMin - Left boundary of the region in meters
 * @param xMax - Right boundary of the region in meters
 * @param numPoints - Number of points to sample (default: 1000)
 * @returns Object containing min and max values of the superposition's real part
 */
export function calculateTriangularPotentialSuperpositionMinMax(
  height: number,
  width: number,
  offset: number,
  mass: number,
  coefficients: Array<[number, number]>,
  energies: number[],
  time: number,
  xMin: number,
  xMax: number,
  numPoints: number = 1000,
): { min: number; max: number } {
  const { HBAR } = QuantumConstants;
  const F = height / width;
  const V0 = height + offset;
  const alpha = calculateAiryAlpha(mass, F);

  let min = Infinity;
  let max = -Infinity;

  const dx = (xMax - xMin) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const x = xMin + i * dx;
    let realPart = 0;

    for (let n = 0; n < coefficients.length; n++) {
      const [cReal, cImag] = coefficients[n]!;
      const energy = energies[n]!;

      const kappa = Math.sqrt(2 * mass * (V0 - energy)) / HBAR;
      const x0 = (energy - offset) / F;

      // Get coefficients A and B from boundary conditions
      const z0 = alpha * (0 - x0);
      const Ai0 = airyAi(z0);
      const Bi0 = airyBi(z0);
      const AiPrime0 = airyAiPrime(z0);
      const BiPrime0 = airyBiPrime(z0);

      const leftAi = kappa * Ai0 - alpha * AiPrime0;
      const leftBi = kappa * Bi0 - alpha * BiPrime0;

      let A: number, B: number;
      if (Math.abs(leftAi) > 1e-12) {
        const ratio = -leftBi / leftAi;
        const normFactor = 1.0 / Math.sqrt(1.0 + ratio * ratio);
        A = ratio * normFactor;
        B = normFactor;
      } else {
        A = 1;
        B = 0;
      }

      // Compute normalization constant for this state
      const normalization = computeTriangularPotentialNormalization(
        height,
        width,
        offset,
        mass,
        energy,
        A,
        B,
        xMin,
        xMax,
        numPoints,
      );

      const psiAt0 = A * Ai0 + B * Bi0;
      const psiAtX0 = A * airyAi(0) + B * airyBi(0);

      // Calculate wavefunction value
      let psi: number;
      if (x < 0) {
        psi = normalization * psiAt0 * Math.exp(kappa * x);
      } else if (x <= x0) {
        const z = alpha * (x - x0);
        psi = normalization * (A * airyAi(z) + B * airyBi(z));
      } else if (x < width) {
        const z = alpha * (x - x0);
        if (z < 4.0) {
          const aiAtZ = airyAi(z);
          const aiAt0 = airyAi(0);
          psi = normalization * psiAtX0 * (aiAtZ / aiAt0);
        } else {
          const zeta = (2.0 / 3.0) * z ** 1.5;
          const aiAt0 = airyAi(0);
          const ratio = ((1.0 / (2.0 * Math.sqrt(Math.PI) * z ** 0.25)) * Math.exp(-zeta)) / aiAt0;
          psi = normalization * psiAtX0 * ratio;
        }
      } else {
        const zAtWidth = alpha * (width - x0);
        let psiAtWidth: number;
        if (zAtWidth < 4.0) {
          const aiAtWidth = airyAi(zAtWidth);
          const aiAt0 = airyAi(0);
          psiAtWidth = psiAtX0 * (aiAtWidth / aiAt0);
        } else {
          const zeta = (2.0 / 3.0) * zAtWidth ** 1.5;
          const aiAt0 = airyAi(0);
          const ratio = ((1.0 / (2.0 * Math.sqrt(Math.PI) * zAtWidth ** 0.25)) * Math.exp(-zeta)) / aiAt0;
          psiAtWidth = psiAtX0 * ratio;
        }
        psi = normalization * psiAtWidth * Math.exp(-kappa * (x - width));
      }

      // Time evolution: exp(-iEt/ℏ) = cos(Et/ℏ) - i*sin(Et/ℏ)
      const phase = (-energy * time) / HBAR;
      const cosPhase = Math.cos(phase);
      const sinPhase = Math.sin(phase);

      // Complex multiplication: real part
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
