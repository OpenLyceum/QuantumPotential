/**
 * Harmonic-oscillator coherent-state coefficients c_n = e^(−α²/2) α^n/√n!. The direct formula
 * overflowed to NaN for large displacements (found by the fuzzer: NaN reached the phase-colour chart).
 */

import { describe, expect, it } from "vitest";
import { calculateCoherentStateCoefficients } from "../../../src/common/model/analytical-solutions/harmonic-oscillator.js";
import QuantumConstants from "../../../src/common/model/QuantumConstants.js";

const { HBAR, ELECTRON_MASS } = QuantumConstants;
const omega = 1e15;
const springConstant = ELECTRON_MASS * omega * omega;
const x0 = Math.sqrt(HBAR / (ELECTRON_MASS * omega)); // α = x/(√2 x0)

describe("coherent-state coefficients", () => {
  it("follow the Poisson distribution: ⟨n⟩ = α²", () => {
    const alpha = 2;
    const { amplitudes } = calculateCoherentStateCoefficients(
      alpha * Math.SQRT2 * x0,
      springConstant,
      ELECTRON_MASS,
      40,
    );
    const meanN = amplitudes.reduce((sum, c, n) => sum + n * c * c, 0);
    expect(meanN).toBeCloseTo(alpha * alpha, 6);
  });

  it.each([50, -50, 0])("stay finite and normalized for α = %d", (alpha) => {
    const { amplitudes } = calculateCoherentStateCoefficients(
      alpha * Math.SQRT2 * x0,
      springConstant,
      ELECTRON_MASS,
      200,
    );
    expect(amplitudes.every(Number.isFinite)).toBe(true);
    expect(amplitudes.reduce((sum, c) => sum + c * c, 0)).toBeCloseTo(1, 10);
  });
});
