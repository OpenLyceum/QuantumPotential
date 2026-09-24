/**
 * Wavenumber-space wavefunction of a solved bound state, by direct quadrature of
 *
 *   φ(k) = (1/√(2π)) ∫ ψ(x) e^(−ikx) dx
 *
 * on the solver's own grid, so every potential (analytical or Numerov) goes through the same
 * transform of the same ψ that the position charts show.
 *
 * The k range is chosen per state from ⟨k²⟩ = ∫ |ψ'(x)|² dx: a window of several RMS wavenumbers
 * holds the whole distribution, including the slow 1/k⁴ tails of states with a kink (infinite well
 * walls, 1D Coulomb cusp). A fixed range either truncates highly excited states or leaves the
 * ground state as a spike a few grid points wide.
 */

/** Half-width of the k window, in units of the state's RMS wavenumber √⟨k²⟩. */
const K_WINDOW_IN_RMS = 4;

/** Samples across the k window (odd, so k = 0 is on the grid). */
const NUMBER_OF_K_POINTS = 801;

export type WavenumberTransform = {
  /** Angular wavenumber k in rad/m. */
  kGrid: number[];
  /** |φ(k)|² in m, normalized so that ∫ |φ(k)|² dk = 1. */
  density: number[];
};

/**
 * Transforms one position-space wavefunction ψ(x) (SI units, ∫|ψ|² dx = 1) on a uniform grid.
 * Returns null when the state carries no curvature information (flat or single-point grid).
 */
export function computeWavenumberTransform(
  xGrid: readonly number[],
  psi: readonly number[],
): WavenumberTransform | null {
  const n = xGrid.length;
  if (n < 3 || psi.length !== n) {
    return null;
  }
  const dx = xGrid[1]! - xGrid[0]!;

  // ⟨k²⟩ = ∫ |ψ'|² dx, from forward differences
  let meanKSquared = 0;
  for (let j = 0; j < n - 1; j++) {
    const slope = (psi[j + 1]! - psi[j]!) / dx;
    meanKSquared += slope * slope * dx;
  }
  const kMax = K_WINDOW_IN_RMS * Math.sqrt(meanKSquared);
  if (!(kMax > 0 && Number.isFinite(kMax))) {
    return null;
  }

  const dk = (2 * kMax) / (NUMBER_OF_K_POINTS - 1);
  const kGrid: number[] = [];
  const density: number[] = [];
  const x0 = xGrid[0]!;

  for (let i = 0; i < NUMBER_OF_K_POINTS; i++) {
    const k = -kMax + i * dk;

    // e^(−ikx_j) by complex rotation from x0 (trapezoidal weights: half at both ends)
    const stepReal = Math.cos(k * dx);
    const stepImaginary = -Math.sin(k * dx);
    let phaseReal = Math.cos(k * x0);
    let phaseImaginary = -Math.sin(k * x0);
    let sumReal = 0;
    let sumImaginary = 0;
    for (let j = 0; j < n; j++) {
      const weight = j === 0 || j === n - 1 ? 0.5 * psi[j]! : psi[j]!;
      sumReal += weight * phaseReal;
      sumImaginary += weight * phaseImaginary;
      const nextReal = phaseReal * stepReal - phaseImaginary * stepImaginary;
      phaseImaginary = phaseReal * stepImaginary + phaseImaginary * stepReal;
      phaseReal = nextReal;
    }

    kGrid.push(k);
    density.push(((sumReal * sumReal + sumImaginary * sumImaginary) * dx * dx) / (2 * Math.PI));
  }

  return { kGrid, density };
}
