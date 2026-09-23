/**
 * NumerovIntegrator integrates trial solutions of the 1D Schrödinger equation on a uniform spatial grid using
 * the Numerov recurrence.
 *
 * The Numerov formula is:
 *   ψ_(j+1) = [(2 - 10f_j)ψ_j - (1+f_(j-1))ψ_(j-1)] / (1+f_(j+1))
 *   where f_j = (h²/12) k²(x_j) and k²(x) = 2m(E - V(x))/ℏ²
 *
 * Forward integration (increasing grid index j): start from x_min, seed the first interior point, and use the
 * recurrence above to obtain ψ at larger x.
 *
 * Backward integration (decreasing j): start from x_max, seed the first interior point from that end, and use the
 * algebraically equivalent recurrence solved for ψ_(j-1) so ψ is filled toward smaller x.
 *
 * Each sweep may rescale the already-computed segment by a positive constant if its amplitude becomes very large.
 * This prevents overflow while preserving node count, log-derivative matching, and final normalized wave-function shape.
 *
 * See https://arxiv.org/abs/2203.15262 or similar references for details.
 *
 * Ported from phetsims/quantum-bound-states (© University of Colorado Boulder, GPL-3.0).
 *
 * @author Martin Veillette
 */

import NumerovConstants from "./NumerovConstants.js";
import type XGrid from "./XGrid.js";

const HBAR = NumerovConstants.HBAR;

// Amplitude at which a sweep in progress is rescaled. Trial solutions grow exponentially through
// classically forbidden regions, so a deep or wide barrier can drive the amplitude past the
// double-precision ceiling (~1.8e308) before the sweep reaches the far boundary, at which point the
// remaining points are all Infinity or NaN and the node count is destroyed. Triggering at 1e100
// leaves over 200 decades of headroom, far more than a single step can consume.
const RESCALE_TRIGGER = 1e100;

// Amplitude that the already-computed portion of the sweep is rescaled to when the trigger is
// exceeded. It sits roughly midway between the trigger above and the denormal floor below, so the
// rescale leaves comparable room for continued growth and for the decayed early portion of the
// sweep, and a long sweep across several barriers rescales rarely rather than every few steps.
const RESCALE_TARGET = 1e50;

// Clamp forbidden-region boundary seeds so steep repulsive walls do not underflow the initial
// amplitude to zero and collapse the recurrence.
const MAX_FORBIDDEN_SEED_EXPONENT = 50;

export default class NumerovIntegrator {
  private constructor() {
    // Not intended for instantiation.
  }

  /**
   * Integrates the Schrödinger equation using Numerov, sweeping **forward in x** (left to right):
   * grid indices j = 0, 1, ..., N-1 correspond to increasing x, and ψ is stepped from x_min
   * toward x_max.
   *
   * @param E - Trial energy (eV)
   * @param V - Potential energy array (eV) corresponding to xGrid points
   * @param xGrid - grid of x-coordinates with uniform spacing (nm)
   * @param mass - Particle mass in electron masses
   * @returns Wave function array
   */
  public static integrate(E: number, V: number[], xGrid: XGrid, mass: number): number[] {
    const N = xGrid.numberOfPoints;
    const dx = xGrid.dx;

    // Validate that V array matches grid length.
    if (V.length !== N) {
      throw new Error(`V.length (${V.length}) must equal grid.getLength() (${N})`);
    }

    // Initialize the wave function array.
    const psi = new Array<number>(N).fill(0);

    // Numerov factors f_j = (h²/12)·k²(x_j), in a typed array: this is the solver's innermost loop.
    const f = calculateNumerovFactors(E, V, mass, dx);

    // ψ = 0 at x_min; seed ψ₁, then Numerov sweep with increasing index (x_min to x_max).
    setBoundaryConditions(psi, E, V, mass, dx, N, "left");
    integrateForwardOnGrid(psi, f);

    return psi;
  }

  /**
   * Integrates using Numerov, sweeping **backward in x** (right to left): grid indices decrease
   * from the high-x end, equivalent to the forward recurrence solved for ψ_(j-1):
   * ψ_(j-1) = [(2 - 10f_j)ψ_j - (1 + f_(j+1))ψ_(j+1)] / (1 + f_(j-1)).
   *
   * Boundary: ψ(x_max) = 0 with ψ(x_{N-2}) seeded like the forward case at the opposite end.
   * Used with the forward solution for midpoint matching.
   *
   * @param E - Trial energy (eV)
   * @param V - Potential energy array (eV)
   * @param xGrid - grid of x-coordinates with uniform spacing (nm)
   * @param mass - Particle mass in electron masses
   * @returns ψ at all grid points in left-to-right order (filled from x_max inward)
   */
  public static integrateBackward(E: number, V: number[], xGrid: XGrid, mass: number): number[] {
    const N = xGrid.numberOfPoints;
    const dx = xGrid.dx;

    if (V.length !== N) {
      throw new Error(`V.length (${V.length}) must equal grid.getLength() (${N})`);
    }

    const psi = new Array<number>(N).fill(0);
    const f = calculateNumerovFactors(E, V, mass, dx);

    // ψ = 0 at x_max; seed ψ_{N-2}, then Numerov sweep with decreasing index (x_max to x_min).
    setBoundaryConditions(psi, E, V, mass, dx, N, "right");
    integrateBackwardOnGrid(psi, f);

    return psi;
  }
}

/**
 * One Numerov step **backward** along the grid (decreasing j): ψ_(j-1) from ψ_j and ψ_(j+1).
 * ψ_(j-1) = [(2 - 10f_j)ψ_j - (1 + f_(j+1))ψ_(j+1)] / (1 + f_(j-1))
 */
function numerovStepBackward(psiJ: number, psiJPlus1: number, fJMinus1: number, fJ: number, fJPlus1: number): number {
  return ((2 - 10 * fJ) * psiJ - (1 + fJPlus1) * psiJPlus1) / (1 + fJMinus1);
}

/**
 * Gets the initial value of psi needed by setBoundaryConditions.
 * @param k2 - a value from the array of k² values
 * @param dx - Grid spacing
 * @param psiScale - how much to scale the psi value
 */
function getInitialPsi(k2: number, dx: number, psiScale: number): number {
  let psi: number;
  if (k2 >= 0) {
    // When k² = 0 (energy equals local potential exactly), sin(0)=0 collapses the seed to zero
    // and the entire integration stays at zero. Fall back to psiScale so the wave function
    // propagates as a linear function, which is the correct behavior for k²=0.
    const kx = Math.sqrt(k2) * dx;
    psi = kx > 0 ? psiScale * Math.sin(kx) : psiScale;
  } else {
    // Clamp the exponent so steep repulsive walls like Morse do not underflow the seed to zero.
    const kappa = Math.sqrt(Math.abs(k2));
    psi = psiScale * Math.exp(-Math.min(kappa * dx, MAX_FORBIDDEN_SEED_EXPONENT));
  }
  return psi;
}

/**
 * Sets ψ = 0 at one domain end and seed the first interior point from that end.
 * The seed scale is arbitrary because the solver later normalizes or compares ratios, but it
 * must be finite and nonzero for the recurrence to propagate.
 *
 * @param psi - Wave function array (modified in place)
 * @param E - Trial energy (eV)
 * @param V - Potential energy array (eV)
 * @param mass - Particle mass in electron masses
 * @param dx - Grid spacing
 * @param N - Number of grid points
 * @param end - 'left': ψ₀=0, seed ψ₁; 'right': ψ_{N-1}=0, seed ψ_{N-2}
 */
function setBoundaryConditions(
  psi: number[],
  E: number,
  V: readonly number[],
  mass: number,
  dx: number,
  N: number,
  end: "left" | "right",
): void {
  const L = N * dx;
  const psiScale = 1 / (N * Math.sqrt(L));

  if (end === "left") {
    // Adjust 2 points at the beginning of the psi array.
    let i = 0;
    psi[i] = 0;
    i++;
    psi[i] = getInitialPsi(calculateK2(E, V[i]!, mass), dx, psiScale);
  } else {
    // Adjust 2 points at the end of the psi array.
    let i = N - 1;
    psi[i] = 0;
    i--;
    psi[i] = getInitialPsi(calculateK2(E, V[i]!, mass), dx, psiScale);
  }
}

/**
 * Applies the Numerov recurrence **forward in x**: for j = 1, ..., N-2 compute ψ_(j+1) from ψ_j and ψ_(j-1).
 * Requires left-end boundary already set (ψ₀, ψ₁) via setBoundaryConditions(..., 'left').
 */
function integrateForwardOnGrid(psi: number[], f: Float64Array): void {
  const N = psi.length;
  let previous = psi[0]!;
  let current = psi[1]!;

  for (let j = 1; j < N - 1; j++) {
    let next = numerovStepForward(current, previous, f[j]!, f[j - 1]!, f[j + 1]!);
    psi[j + 1] = next;

    if (Math.abs(next) > RESCALE_TRIGGER) {
      const scale = RESCALE_TARGET / Math.abs(next);
      rescaleWaveFunction(psi, 0, j + 1, scale);
      current *= scale;
      next = psi[j + 1]!;
    }
    previous = current;
    current = next;
  }
}

/**
 * Applies the Numerov recurrence **backward in x**: for j = N-2, ..., 1 compute ψ_(j-1) from ψ_j and ψ_(j+1).
 * Requires right-end boundary already set (ψ_{N-1}, ψ_{N-2}) via setBoundaryConditions(..., 'right').
 */
function integrateBackwardOnGrid(psi: number[], f: Float64Array): void {
  const N = psi.length;

  for (let j = N - 2; j > 0; j--) {
    psi[j - 1] = numerovStepBackward(psi[j]!, psi[j + 1]!, f[j - 1]!, f[j]!, f[j + 1]!);

    if (Math.abs(psi[j - 1]!) > RESCALE_TRIGGER) {
      rescaleWaveFunction(psi, j - 1, N - 1, RESCALE_TARGET / Math.abs(psi[j - 1]!));
    }
  }
}

/**
 * Calculates k² = 2m(E - V)/ℏ² at one point.
 *
 * @param E - Trial energy (eV)
 * @param v - Potential energy (eV)
 * @param mass - Particle mass in electron masses
 */
function calculateK2(E: number, v: number, mass: number): number {
  return (2 * mass * (E - v)) / (HBAR * HBAR);
}

/**
 * Calculates Numerov factors f_j = (h²/12) * k²(x_j) for all grid points.
 *
 * @param E - Trial energy (eV)
 * @param V - Potential energy array (eV)
 * @param mass - Particle mass in electron masses
 * @param dx - Grid spacing (nm)
 * @returns Array of Numerov factors
 */
function calculateNumerovFactors(E: number, V: readonly number[], mass: number, dx: number): Float64Array {
  const factor = ((dx * dx) / 12) * ((2 * mass) / (HBAR * HBAR));
  const f = new Float64Array(V.length);
  for (let j = 0; j < V.length; j++) {
    f[j] = factor * (E - V[j]!);
  }
  return f;
}

/**
 * One Numerov step **forward** along the grid (increasing j).
 * ψ_(j+1) = [(2 - 10f_j)ψ_j - (1+f_(j-1))ψ_(j-1)] / (1+f_(j+1))
 *
 * @param psi_j - Wave function at current point
 * @param psi_jMinus1 - Wave function at previous point
 * @param f_j - Numerov factor at current point
 * @param f_jMinus1 - Numerov factor at previous point
 * @param f_jPlus1 - Numerov factor at next point
 * @returns Wave function at next point (larger index / larger x)
 */
function numerovStepForward(psiJ: number, psiJMinus1: number, fJ: number, fJMinus1: number, fJPlus1: number): number {
  const numerator = (2 - 10 * fJ) * psiJ - (1 + fJMinus1) * psiJMinus1;
  const denominator = 1 + fJPlus1;
  return numerator / denominator;
}

/**
 * Rescales part of the wave function in place.
 * Multiplying a left or right integration by a positive constant preserves node count,
 * Wronskian sign, and stitched wave-function shape, while preventing intermediate overflow.
 */
function rescaleWaveFunction(psi: number[], startIndex: number, endIndex: number, scale: number): void {
  for (let k = startIndex; k <= endIndex; k++) {
    psi[k]! *= scale;
  }
}
