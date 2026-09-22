/**
 * Helper functions for computing Fourier transforms of wavefunctions.
 *
 * This module provides default implementations for analytical solutions
 * that don't have closed-form Fourier transforms, as well as utilities
 * for converting between momentum and wavenumber representations.
 *
 * @example
 * ```typescript
 * // Get Fourier transform in momentum space
 * const solver = new FiniteSquareWellSolution(wellWidth, wellDepth, mass);
 * const positionResult = solver.solve(numStates, gridConfig);
 * const momentumResult = solver.calculateFourierTransform(positionResult, mass);
 *
 * // Convert to wavenumber space if preferred for visualization
 * const wavenumberResult = convertToWavenumber(momentumResult);
 * console.log(wavenumberResult.kGrid); // Wavenumber values in rad/m
 * console.log(wavenumberResult.wavenumberWavefunctions); // Same wavefunctions
 *
 * // Convert back to momentum space if needed
 * const backToMomentum = convertToMomentum(wavenumberResult);
 * ```
 */

import { numericalFourierTransform } from "../LinearAlgebraUtils.js";
import type { BoundStateResult, FourierTransformResult, WavenumberTransformResult } from "../PotentialFunction.js";
import QuantumConstants from "../QuantumConstants.js";

/**
 * Compute numerical Fourier transform for a bound state result.
 *
 * This is a generic implementation that uses FFT to transform position-space
 * wavefunctions to momentum space. It can be used by any analytical solution
 * that doesn't have a simple closed-form Fourier transform.
 *
 * @param boundStateResult - Position-space wavefunction results
 * @param mass - Particle mass in kg
 * @param energyScale - Typical energy scale for the potential (used to estimate pMax)
 * @param numMomentumPoints - Optional number of momentum points
 * @param pMax - Optional maximum momentum
 * @returns Fourier transform result
 */
export function computeNumericalFourierTransform(
  boundStateResult: BoundStateResult,
  mass: number,
  energyScale: number,
  numMomentumPoints?: number,
  pMax?: number,
): FourierTransformResult {
  const numStates = boundStateResult.energies.length;

  // Determine number of momentum points
  const nMomentum = numMomentumPoints || boundStateResult.xGrid.length;

  // Determine pMax if not provided
  // Use energy scale to estimate typical momentum: p ~ sqrt(2 * m * E)
  const defaultPMax = Math.sqrt(2 * mass * Math.abs(energyScale)) * 5;
  const actualPMax = pMax || defaultPMax;

  // Use numerical Fourier transform for each state
  const pGrid: number[] = [];
  const momentumWavefunctions: number[][] = [];

  for (let stateIndex = 0; stateIndex < numStates; stateIndex++) {
    const psi = boundStateResult.wavefunctions[stateIndex]!;
    const xGrid = boundStateResult.xGrid;

    const { pGrid: pGridState, phiP } = numericalFourierTransform(psi, xGrid, mass, nMomentum, actualPMax);

    if (stateIndex === 0) {
      // Use pGrid from first state
      pGrid.push(...pGridState);
    }

    momentumWavefunctions.push(phiP);
  }

  return {
    pGrid,
    momentumWavefunctions,
    method: "numerical",
  };
}

/**
 * Convert a Fourier transform result from momentum space to wavenumber space.
 *
 * The relationship between momentum and wavenumber is:
 *   k = p/ℏ
 *
 * where:
 *   - p is momentum in kg·m/s
 *   - k is wavenumber in rad/m (or 1/m)
 *   - ℏ is the reduced Planck constant
 *
 * The wavefunctions remain the same, only the grid is converted.
 * Note: The normalization is preserved because ∫|φ(p)|² dp = ∫|φ(k)|² ℏ dk,
 * but since we're returning the same wavefunction values, the view layer
 * should account for the ℏ factor if needed for proper normalization plots.
 *
 * @param fourierResult - Fourier transform result in momentum space
 * @returns Fourier transform result in wavenumber space
 */
export function convertToWavenumber(fourierResult: FourierTransformResult): WavenumberTransformResult {
  const { HBAR } = QuantumConstants;

  // Convert momentum grid to wavenumber grid: k = p/ℏ
  const kGrid = fourierResult.pGrid.map((p) => p / HBAR);

  return {
    kGrid,
    wavenumberWavefunctions: fourierResult.momentumWavefunctions,
    method: fourierResult.method,
  };
}

/**
 * Convert a wavenumber transform result back to momentum space.
 *
 * The relationship between wavenumber and momentum is:
 *   p = ℏk
 *
 * @param wavenumberResult - Fourier transform result in wavenumber space
 * @returns Fourier transform result in momentum space
 */
export function convertToMomentum(wavenumberResult: WavenumberTransformResult): FourierTransformResult {
  const { HBAR } = QuantumConstants;

  // Convert wavenumber grid to momentum grid: p = ℏk
  const pGrid = wavenumberResult.kGrid.map((k) => k * HBAR);

  return {
    pGrid,
    momentumWavefunctions: wavenumberResult.wavenumberWavefunctions,
    method: wavenumberResult.method,
  };
}
