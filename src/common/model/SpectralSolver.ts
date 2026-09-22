/**
 * Spectral Methods (Chebyshev) for solving the 1D
 * time-independent Schrödinger equation.
 *
 * This method expands the wavefunction in Chebyshev polynomials:
 * ψ(x) = Σ c_n T_n(x)
 *
 * Uses Chebyshev-Gauss-Lobatto collocation points and differentiation matrices.
 * Provides spectral (exponential) convergence for smooth functions.
 *
 * Reference: Boyd, "Chebyshev and Fourier Spectral Methods", 2nd ed. (2001)
 */

import qppw from "../../QPPWNamespace.js";
import {
  cubicSplineInterpolation,
  DotMatrix,
  diagonalize,
  extractInteriorMatrix,
  matrixToArray,
  normalizeWavefunctionChebyshev,
  symmetrizeMatrix,
} from "./LinearAlgebraUtils.js";
import type { BoundStateResult, EnergyOnlyResult, GridConfig, PotentialFunction } from "./PotentialFunction.js";
import QuantumConstants from "./QuantumConstants.js";
import { standardizeWavefunction } from "./WavefunctionStandardization.js";

/**
 * Solve the 1D Schrödinger equation using Chebyshev spectral method.
 *
 * @param potential - Function V(x) that returns potential energy in Joules
 * @param mass - Particle mass in kg
 * @param numStates - Number of lowest bound states to return
 * @param gridConfig - Grid configuration
 * @param energiesOnly - If true, only compute energies (faster, no wavefunctions)
 * @returns Bound state results or energy-only results
 */
export function solveSpectral(
  potential: PotentialFunction,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
  energiesOnly?: true,
): EnergyOnlyResult;
export function solveSpectral(
  potential: PotentialFunction,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
  energiesOnly: false,
): BoundStateResult;
export function solveSpectral(
  potential: PotentialFunction,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
  energiesOnly: boolean = false,
): BoundStateResult | EnergyOnlyResult {
  const { xMin, xMax, numPoints } = gridConfig;
  const N = numPoints;

  // Generate Chebyshev-Gauss-Lobatto points in [-1, 1]
  const xiGrid: number[] = [];
  for (let j = 0; j < N; j++) {
    xiGrid.push(-Math.cos((Math.PI * j) / (N - 1)));
  }

  // Map to physical domain [xMin, xMax]
  const domainMin = xMin;
  const domainMax = xMax;
  const xGrid = xiGrid.map((xi) => ((domainMax - domainMin) * xi + (domainMax + domainMin)) / 2);

  // Chebyshev differentiation matrix in [-1, 1]
  const D = chebyshevDifferentiationMatrix(N);

  // Scale for physical domain: d/dx = (2/(b-a)) * d/dξ
  // Second derivative: d²/dx² = (2/(b-a))² * d²/dξ²
  const domainScalingFactor = 2 / (domainMax - domainMin);

  // Compute second derivative matrix D² using dot's Matrix.times()
  const D2 = D.times(D) as DotMatrix;

  // Apply domain scaling to second derivative matrix
  const scaleFactor = domainScalingFactor * domainScalingFactor;
  D2.timesEquals(scaleFactor);

  // Construct Hamiltonian: H = T + V
  // Kinetic energy: T = -(ℏ²/2m) * d²/dx²
  const { HBAR } = QuantumConstants;
  const kineticPrefactor = -(HBAR * HBAR) / (2 * mass);

  const H = new DotMatrix(N, N);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      H.set(i, j, kineticPrefactor * D2.get(i, j));
    }
  }

  // Add potential energy (diagonal)
  for (let i = 0; i < N; i++) {
    H.set(i, i, H.get(i, i) + potential(xGrid[i]!));
  }

  // Apply boundary conditions: ψ(xMin) = ψ(xMax) = 0
  // Remove first and last rows/columns
  const HInterior = extractInteriorMatrix(H);

  // Symmetrize the Hamiltonian matrix
  // The second derivative operator with Dirichlet BCs should be self-adjoint,
  // so the matrix should be symmetric. Any asymmetry is numerical error.
  const HSymmetric = symmetrizeMatrix(HInterior);

  // Convert to array and diagonalize interior Hamiltonian
  const hamiltonianArray = matrixToArray(HSymmetric);
  const eigen = diagonalize(hamiltonianArray);

  // Sort eigenvalues and eigenvectors by energy
  const sortedIndices = eigen.eigenvalues
    .map((e, i) => ({ energy: e, index: i }))
    .sort((a, b) => a.energy - b.energy)
    .map((item) => item.index);

  // Extract the lowest numStates bound states
  const energies: number[] = [];

  // For spectral method with Dirichlet boundary conditions (ψ=0 at boundaries),
  // all eigenvalues correspond to bound states confined by the boundary conditions.
  // We simply take the lowest numStates eigenvalues.
  const interiorSize = HInterior.getRowDimension();
  for (let i = 0; i < Math.min(numStates, interiorSize); i++) {
    const idx = sortedIndices[i]!;
    const energy = eigen.eigenvalues[idx]!;
    energies.push(energy);
  }

  // If only energies requested, return early without computing wavefunctions
  if (energiesOnly) {
    return {
      energies,
      method: "spectral",
    };
  }

  // Compute wavefunctions
  const wavefunctions: number[][] = [];
  for (let i = 0; i < Math.min(numStates, interiorSize); i++) {
    const idx = sortedIndices[i]!;

    // Reconstruct full wavefunction with boundary conditions
    const psiInterior = eigen.eigenvectors[idx]!;
    const psiFull = [0, ...psiInterior, 0]; // Add zeros at boundaries

    // Normalize
    const normalizedPsi = normalizeWavefunctionChebyshev(psiFull, xMin, xMax);
    // Standardize sign for consistency across solvers
    const standardizedPsi = standardizeWavefunction(normalizedPsi, xGrid);
    wavefunctions.push(standardizedPsi);
  }

  // Interpolate wavefunctions to finer grid (8x more points)
  if (wavefunctions.length === 0) {
    return {
      energies,
      wavefunctions: [],
      xGrid,
      method: "spectral",
    };
  }

  const upsampleFactor = 8;
  const { fineXGrid } = cubicSplineInterpolation(xGrid, wavefunctions[0]!, upsampleFactor);

  const fineWavefunctions: number[][] = [];
  for (const wavefunction of wavefunctions) {
    const { fineYValues } = cubicSplineInterpolation(xGrid, wavefunction, upsampleFactor);
    fineWavefunctions.push(fineYValues);
  }

  return {
    energies,
    wavefunctions: fineWavefunctions,
    xGrid: fineXGrid,
    method: "spectral",
  };
}

/**
 * Construct Chebyshev differentiation matrix using the formula:
 * D_ij = c_i / c_j * (-1)^(i+j) / (x_i - x_j) for i ≠ j
 * D_jj = -x_j / (2(1 - x_j²)) for 0 < j < N-1
 * D_00 = (2N² + 1) / 6
 * D_NN = -(2N² + 1) / 6
 *
 * where c_i = 2 for i = 0, N-1 and c_i = 1 otherwise
 * and x_j are Chebyshev-Gauss-Lobatto points
 *
 * @param N - Number of collocation points
 * @returns N×N differentiation matrix
 */
function chebyshevDifferentiationMatrix(N: number): DotMatrix {
  // Chebyshev-Gauss-Lobatto points
  const x: number[] = [];
  for (let j = 0; j < N; j++) {
    x.push(-Math.cos((Math.PI * j) / (N - 1)));
  }

  // Weights c_i
  const c: number[] = new Array(N).fill(1);
  c[0] = 2;
  c[N - 1] = 2;

  // Build differentiation matrix
  const D = new DotMatrix(N, N);
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) {
        // Diagonal elements
        if (i === 0) {
          D.set(i, j, (2 * (N - 1) * (N - 1) + 1) / 6);
        } else if (i === N - 1) {
          D.set(i, j, -(2 * (N - 1) * (N - 1) + 1) / 6);
        } else {
          D.set(i, j, -x[j]! / (2 * (1 - x[j]! * x[j]!)));
        }
      } else {
        // Off-diagonal elements
        const sign = (-1) ** (i + j);
        D.set(i, j, ((c[i]! / c[j]!) * sign) / (x[i]! - x[j]!));
      }
    }
  }

  return D;
}

qppw.register("SpectralSolver", { solveSpectral });
