/**
 * WaveFunctionNormalizer normalizes wave functions using the trapezoidal rule for numerical integration.
 * It ensures that the probability density integrates to unity: that is ∫|ψ|² dx = 1
 *
 * Note that we implicitly assume that the wave function is real-valued, the grid is equally spaced, and that the
 * wave function is zero outside the bounds of the spatial grid. The last point is the most likely to fail. It is
 * usually valid for bound states, but may not hold for high-energy states that have large probability outside
 * (although the errors would normally be small). Since the purpose of the normalization is to ensure correct relative
 * probabilities when superposing states, small errors in normalization are not usually critical.
 *
 * Ported from phetsims/quantum-bound-states (© University of Colorado Boulder, GPL-3.0).
 *
 * @author Martin Veillette
 */

export default class WaveFunctionNormalizer {
  private constructor() {
    // Not intended for instantiation.
  }

  /**
   * Normalizes using trapezoidal rule, with O(h²) accuracy.
   */
  public static normalize(psi: number[], dx: number): number[] {
    const integral = WaveFunctionNormalizer.calculateTrapezoidalIntegral(psi, dx);
    const normalization = Math.sqrt(integral);
    return WaveFunctionNormalizer.scaleWaveFunction(psi, normalization);
  }

  /**
   * Calculates ∫|ψ|² dx using trapezoidal rule.
   */
  private static calculateTrapezoidalIntegral(psi: number[], dx: number): number {
    let integral = 0;

    for (let i = 0; i < psi.length - 1; i++) {
      const term = (psi[i]! * psi[i]! + psi[i + 1]! * psi[i + 1]!) / 2;
      integral += term;
    }

    return integral * dx;
  }

  /**
   * Scales wave function: ψ → ψ / normalization.
   */
  private static scaleWaveFunction(psi: number[], normalization: number): number[] {
    // Avoid division by zero
    if (normalization === 0 || !Number.isFinite(normalization)) {
      return psi.slice(); // Return copy of original
    }

    return psi.map((value) => value / normalization);
  }
}
