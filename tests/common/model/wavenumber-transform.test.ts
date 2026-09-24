/**
 * The wavenumber chart's φ(k) is a direct Fourier transform of the solved ψ(x). It once plotted FFT
 * values against a mismatched k axis (numerical potentials), a mis-normalized closed form (harmonic
 * oscillator) and a k range that cut the infinite-well ground state off at 1–3% of its peak.
 */

import { describe, expect, it } from "vitest";
import { PotentialType } from "../../../src/common/model/PotentialFunction.js";
import { IntroModel } from "../../../src/intro/model/IntroModel.js";

describe("wavenumber transform", () => {
  it("matches the closed-form infinite-well spectrum and holds the whole distribution", () => {
    const model = new IntroModel();
    model.potentialTypeProperty.value = PotentialType.INFINITE_WELL;
    const L = model.wellWidthProperty.value * 1e-9;

    for (const index of [0, 1, 4]) {
      const n = index + 1;
      const kn = (n * Math.PI) / L;
      const { kGrid, density } = model.getWavenumberTransform(index)!;
      const peak = Math.max(...density);

      // |φ_n(k)|² = (4 k_n² / πL) · [cos or sin(kL/2) / (k² − k_n²)]²
      for (let i = 0; i < kGrid.length; i += 37) {
        const k = kGrid[i]!;
        if (Math.abs(k * k - kn * kn) < 1e-3 * kn * kn) {
          continue;
        }
        const trig = n % 2 === 1 ? Math.cos((k * L) / 2) : Math.sin((k * L) / 2);
        const exact = ((4 * kn * kn) / (Math.PI * L)) * (trig / (k * k - kn * kn)) ** 2;
        expect(Math.abs(density[i]! - exact) / peak).toBeLessThan(1e-4);
      }

      // Nothing visible is cut off at the ends of the k window, and ∫|φ|² dk ≈ 1
      expect(Math.max(density[0]!, density[density.length - 1]!) / peak).toBeLessThan(0.01);
      const dk = kGrid[1]! - kGrid[0]!;
      expect(density.reduce((sum, value) => sum + value, 0) * dk).toBeCloseTo(1, 2);
    }
    model.dispose();
  });

  it("gives Δx·Δk = n + ½ for harmonic-oscillator states", () => {
    const model = new IntroModel();
    model.potentialTypeProperty.value = PotentialType.HARMONIC_OSCILLATOR;
    for (const index of [0, 1, 2, 5]) {
      expect(model.getWavenumberDistribution(index)?.uncertaintyProduct).toBeCloseTo(index + 0.5, 2);
    }
    model.dispose();
  });

  it("respects the uncertainty bound for every single-well ground state", () => {
    const model = new IntroModel();
    for (const type of [
      PotentialType.FINITE_WELL,
      PotentialType.MORSE,
      PotentialType.POSCHL_TELLER,
      PotentialType.ROSEN_MORSE,
      PotentialType.ECKART,
      PotentialType.ASYMMETRIC_TRIANGLE,
      PotentialType.TRIANGULAR,
    ]) {
      model.potentialTypeProperty.value = type;
      const product = model.getWavenumberDistribution(0)?.uncertaintyProduct;
      expect(product, type).toBeGreaterThanOrEqual(0.499);
      expect(product, type).toBeLessThan(0.6);
    }
    model.dispose();
  });
});
