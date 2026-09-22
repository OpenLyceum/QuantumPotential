/**
 * Fourier Grid Hamiltonian (FGH) method for solving the 1D
 * time-independent Schrödinger equation.
 *
 * This method uses plane wave basis (Fourier basis):
 * - Kinetic energy is diagonal in momentum space: T_k = ℏ²k²/(2m)
 * - Potential energy is diagonal in position space: V(x)
 * - Hamiltonian is constructed by transforming between spaces using FFT
 *
 * Natural for periodic systems with spectral accuracy.
 *
 * Reference: Marston & Balint-Kurti, J. Chem. Phys. 91, 3571 (1989)
 */

import qppw from "../../QPPWNamespace.js";
import {
  type Complex,
  cubicSplineInterpolation,
  DotMatrix,
  diagonalize,
  fft,
  fftFreq,
  ifft,
  matrixToArray,
  normalizeWavefunction,
} from "./LinearAlgebraUtils.js";
import type { BoundStateResult, EnergyOnlyResult, GridConfig, PotentialFunction } from "./PotentialFunction.js";
import QuantumConstants from "./QuantumConstants.js";
import { standardizeWavefunction } from "./WavefunctionStandardization.js";

/**
 * Solve the 1D Schrödinger equation using FGH method.
 *
 * @param potential - Function V(x) that returns potential energy in Joules
 * @param mass - Particle mass in kg
 * @param numStates - Number of lowest bound states to return
 * @param gridConfig - Grid configuration
 * @param energiesOnly - If true, only compute energies (faster, no wavefunctions)
 * @returns Bound state results or energy-only results
 */
export function solveFGH(
  potential: PotentialFunction,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
  energiesOnly?: true,
): EnergyOnlyResult;
export function solveFGH(
  potential: PotentialFunction,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
  energiesOnly: false,
): BoundStateResult;
export function solveFGH(
  potential: PotentialFunction,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
  energiesOnly: boolean = false,
): BoundStateResult | EnergyOnlyResult {
  const { xMin, xMax, numPoints } = gridConfig;
  // L = (xMax - xMin) / 2 for periodic domain [-L, L]
  const dx = (xMax - xMin) / numPoints; // Note: periodic grid, no endpoint
  const N = numPoints;

  // Generate grid (periodic, exclude endpoint)
  const xGrid: number[] = [];
  for (let i = 0; i < N; i++) {
    xGrid.push(xMin + i * dx);
  }

  // Generate momentum space grid
  const waveNumberGrid = fftFreq(N, dx);

  // Kinetic energy in momentum space: T_k = ℏ²k²/(2m)
  const { HBAR } = QuantumConstants;
  const TK = waveNumberGrid.map((waveNumber) => (HBAR * HBAR * waveNumber * waveNumber) / (2 * mass));

  // Potential energy in position space
  const VX = xGrid.map(potential);

  // Build Hamiltonian matrix using FGH method
  // H_ij = ∫ φ_i*(x) H φ_j(x) dx
  // where φ_j(x) are plane waves
  const H = buildFGHHamiltonian(N, TK, VX);

  // Convert to array for diagonalization
  const hamiltonianArray = matrixToArray(H);

  // Diagonalize Hamiltonian
  const eigen = diagonalize(hamiltonianArray);

  // Sort eigenvalues and eigenvectors by energy
  const sortedIndices = eigen.eigenvalues
    .map((e, i) => ({ energy: e, index: i }))
    .sort((a, b) => a.energy - b.energy)
    .map((item) => item.index);

  // Extract the lowest numStates bound states
  const energies: number[] = [];

  // Calculate boundary potential once
  const VBoundary = Math.max(potential(xMin), potential(xMax));

  for (let i = 0; i < Math.min(numStates, N); i++) {
    const idx = sortedIndices[i]!;
    const energy = eigen.eigenvalues[idx]!;

    // Only include bound states (energy < V at boundaries)
    if (energy < VBoundary) {
      energies.push(energy);
    }
  }

  // If only energies requested, return early without computing wavefunctions
  if (energiesOnly) {
    return {
      energies,
      method: "fgh",
    };
  }

  // Compute wavefunctions
  const wavefunctions: number[][] = [];
  for (let i = 0; i < Math.min(numStates, N); i++) {
    const idx = sortedIndices[i]!;
    const energy = eigen.eigenvalues[idx]!;

    // Only include bound states (energy < V at boundaries)
    if (energy < VBoundary) {
      // Normalize wavefunction
      const wavefunction = eigen.eigenvectors[idx]!;
      const normalizedPsi = normalizeWavefunction(wavefunction, dx);
      // Standardize sign for consistency across solvers
      const standardizedPsi = standardizeWavefunction(normalizedPsi, xGrid);
      wavefunctions.push(standardizedPsi);
    }
  }

  // Interpolate wavefunctions to finer grid (8x more points)
  if (wavefunctions.length === 0) {
    return {
      energies,
      wavefunctions: [],
      xGrid,
      method: "fgh",
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
    method: "fgh",
  };
}

/**
 * Build the FGH Hamiltonian matrix.
 * H = T + V, where T is kinetic energy (non-diagonal due to FFT transform)
 * and V is potential energy (diagonal).
 *
 * @param N - Matrix dimension
 * @param T_k - Kinetic energy in momentum space
 * @param V_x - Potential energy in position space
 * @returns N×N Hamiltonian matrix
 */
function buildFGHHamiltonian(N: number, Tk: number[], Vx: number[]): DotMatrix {
  const H = new DotMatrix(N, N);

  // Build kinetic energy matrix by applying T_k in momentum space
  // For each basis function (column j), apply kinetic energy operator
  for (let j = 0; j < N; j++) {
    // Create basis vector in position space (delta function at grid point j)
    const psiX: Complex[] = [];
    for (let i = 0; i < N; i++) {
      psiX.push({ real: i === j ? 1.0 : 0.0, imaginary: 0.0 });
    }

    // Transform to momentum space
    const psiK = fft(psiX);

    // Apply kinetic energy in momentum space
    for (let i = 0; i < N; i++) {
      psiK[i] = {
        real: psiK[i]!.real * Tk[i]!,
        imaginary: psiK[i]!.imaginary * Tk[i]!,
      };
    }

    // Transform back to position space
    const TPsiX = ifft(psiK);

    // Store in kinetic energy contribution to H
    for (let i = 0; i < N; i++) {
      H.set(i, j, TPsiX[i]!.real);
    }
  }

  // Add potential energy (diagonal)
  for (let i = 0; i < N; i++) {
    H.set(i, i, H.get(i, i) + Vx[i]!);
  }

  return H;
}

qppw.register("FGHSolver", { solveFGH });
