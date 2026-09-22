/**
 * Matrix Numerov method for solving the 1D time-independent Schrödinger equation.
 *
 * This method reformulates the Numerov finite difference scheme as a matrix
 * eigenvalue problem, combining the accuracy of the Numerov formula with the
 * robustness of matrix diagonalization.
 *
 * The TISE is: -ℏ²/(2m) d²ψ/dx² + V(x)ψ = Eψ
 *
 * Following Walker's formulation, this is recast as a standard eigenvalue problem:
 * [-ℏ²/(2m) * B^{-1} * A + V] * ψ = E * ψ
 * where:
 * - A = (I_{-1} - 2I_0 + I_1)/d² is the discrete second derivative operator
 * - B = (I_{-1} + 10I_0 + I_1)/12 is the Numerov overlap matrix
 * - The factor B^{-1} * A gives the Numerov representation of the second derivative
 * - The negative sign accounts for the kinetic energy operator
 *
 * References:
 * - T. G. Walker, "Matrix Numerov method for solving Schrödinger's equation"
 *   https://pages.physics.wisc.edu/~tgwalker/106.Numerov.pdf
 */

import qppw from "../../QPPWNamespace.js";
import {
  cubicSplineInterpolation,
  DotMatrix,
  diagonalize,
  matrixToArray,
  normalizeWavefunction,
} from "./LinearAlgebraUtils.js";
import type { BoundStateResult, EnergyOnlyResult, GridConfig, PotentialFunction } from "./PotentialFunction.js";
import QuantumConstants from "./QuantumConstants.js";
import { standardizeWavefunction } from "./WavefunctionStandardization.js";

/**
 * Solve the 1D Schrödinger equation using the matrix Numerov method.
 *
 * This method combines the O(h⁴) accuracy of the Numerov formula with matrix
 * diagonalization, making it more robust than the shooting method for finding
 * all eigenvalues simultaneously.
 *
 * @param potential - Function V(x) that returns potential energy in Joules
 * @param mass - Particle mass in kg
 * @param numStates - Number of bound states to find
 * @param gridConfig - Grid configuration
 * @param energiesOnly - If true, only compute energies (faster, no wavefunctions)
 * @returns Bound state results or energy-only results
 */
export function solveMatrixNumerov(
  potential: PotentialFunction,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
  energiesOnly?: true,
): EnergyOnlyResult;
export function solveMatrixNumerov(
  potential: PotentialFunction,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
  energiesOnly: false,
): BoundStateResult;
export function solveMatrixNumerov(
  potential: PotentialFunction,
  mass: number,
  numStates: number,
  gridConfig: GridConfig,
  energiesOnly: boolean = false,
): BoundStateResult | EnergyOnlyResult {
  const { xMin, xMax, numPoints } = gridConfig;
  const dx = (xMax - xMin) / (numPoints - 1);

  // Generate grid
  const xGrid: number[] = [];
  for (let i = 0; i < numPoints; i++) {
    xGrid.push(xMin + i * dx);
  }

  // Evaluate potential on grid
  const V = xGrid.map(potential);

  const N = numPoints;
  const { HBAR } = QuantumConstants;

  // Following Walker (Am. J. Phys. 80, 1017 (2012)), equation (5):
  // [ℏ²/(2m) * B^{-1} * A + V] * ψ = E * ψ
  //
  // where:
  // - A = (I_{-1} - 2I_0 + I_1)/d² is the second derivative operator
  // - B = (I_{-1} + 10I_0 + I_1)/12 is the Numerov overlap matrix
  // - V = diag(...V_i...) is the potential energy

  const h2 = dx * dx;

  // Initialize matrices
  const A = new DotMatrix(N, N);
  const B = new DotMatrix(N, N);

  // Construct A = (I_{-1} - 2I_0 + I_1)/d²
  for (let i = 0; i < N; i++) {
    A.set(i, i, -2 / h2);
    if (i > 0) {
      A.set(i, i - 1, 1 / h2);
      A.set(i - 1, i, 1 / h2);
    }
  }

  // Construct B = (I_{-1} + 10I_0 + I_1)/12
  for (let i = 0; i < N; i++) {
    B.set(i, i, 10 / 12);
    if (i > 0) {
      B.set(i, i - 1, 1 / 12);
      B.set(i - 1, i, 1 / 12);
    }
  }

  // Compute Hamiltonian H = -ℏ²/(2m) * B^{-1} * A + V
  // Note: The minus sign is crucial! The discrete second derivative operator A
  // has the opposite sign convention from the kinetic energy operator.
  const Binv = B.inverse();
  const BinvA = Binv.times(A) as DotMatrix;
  const kineticFactor = -(HBAR * HBAR) / (2 * mass); // Negative!
  const T = BinvA.copy().timesEquals(kineticFactor); // Kinetic energy operator

  // Add potential energy (diagonal)
  const H = T.copy();
  for (let i = 0; i < N; i++) {
    H.set(i, i, H.get(i, i) + V[i]!);
  }

  // Convert to array and diagonalize to get eigenvalues and eigenvectors
  const HArray = matrixToArray(H);
  const eigen = diagonalize(HArray);

  // Sort eigenvalues by energy
  const sortedIndices = eigen.eigenvalues
    .map((e, i) => ({ energy: e, index: i }))
    .sort((a, b) => a.energy - b.energy)
    .map((item) => item.index);

  // Extract bound states
  const energies: number[] = [];

  // Estimate boundary potential
  const VBoundary = Math.max(V[0]!, V[N - 1]!);

  for (let i = 0; i < Math.min(numStates, N); i++) {
    const idx = sortedIndices[i]!;
    const energy = eigen.eigenvalues[idx]!;

    // Only include bound states (E < V at boundaries)
    // Also filter out negative energies that are too large (numerical artifacts)
    if (energy < VBoundary && isFinite(energy)) {
      energies.push(energy);
    }
  }

  // If only energies requested, return early without computing wavefunctions
  if (energiesOnly) {
    return {
      energies,
      method: "numerov",
    };
  }

  // Compute wavefunctions
  const wavefunctions: number[][] = [];
  for (let i = 0; i < Math.min(numStates, N); i++) {
    const idx = sortedIndices[i]!;
    const energy = eigen.eigenvalues[idx]!;

    // Only include bound states (E < V at boundaries)
    // Also filter out negative energies that are too large (numerical artifacts)
    if (energy < VBoundary && isFinite(energy)) {
      // Extract and normalize wavefunction
      const wavefunction = [...eigen.eigenvectors[idx]!];

      // Apply boundary conditions (force ψ=0 at boundaries)
      wavefunction[0] = 0;
      wavefunction[N - 1] = 0;

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
      method: "numerov", // Use same method tag as traditional Numerov
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
    method: "numerov", // Use same method tag as traditional Numerov
  };
}

qppw.register("MatrixNumerovSolver", { solveMatrixNumerov });
