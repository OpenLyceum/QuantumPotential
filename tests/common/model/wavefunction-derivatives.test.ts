/**
 * BaseModel.getWavefunctionAtPosition falls back to finite differences when the potential has no
 * closed-form solution (e.g. the numerically solved multi-square well on the Many Wells screen).
 * The second derivative used to be computed as (ψᵢ − 2ψ(x) + ψᵢ₊₁)/h² with ψ(x) interpolated between
 * ψᵢ and ψᵢ₊₁, which is not a curvature at all (≈ 0 near a maximum).
 */

import { describe, expect, it } from "vitest";
import { ManyWellsModel } from "../../../src/many-wells/model/ManyWellsModel.js";

describe("wavefunction derivatives (finite-difference fallback)", () => {
  it("gives a consistent, negative ψ''/ψ across a grid cell at the ground-state peak", () => {
    const model = new ManyWellsModel();
    const boundStates = model.getBoundStates();
    expect(boundStates).not.toBeNull();
    const { xGrid, wavefunctions } = boundStates!;
    const psi = wavefunctions[0]!;

    // Grid index of the largest |ψ| (away from the edges so derivatives are defined)
    let peak = 2;
    for (let i = 2; i < psi.length - 3; i++) {
      if (Math.abs(psi[i]!) > Math.abs(psi[peak]!)) {
        peak = i;
      }
    }
    // ψ''/ψ = −2m(E − V)/ħ² is smooth inside a well, so it must agree at two points of the same grid
    // cell. (The old formula scaled as (1 − 2t) and flipped sign across the cell.)
    const ratioAt = (t: number): number => {
      const xNm = (xGrid[peak]! * (1 - t) + xGrid[peak + 1]! * t) * 1e9;
      const at = model.getWavefunctionAtPosition(0, xNm);
      expect(at).not.toBeNull();
      return at!.secondDerivative / at!.value; // nm⁻²
    };
    const r1 = ratioAt(0.25);
    const r2 = ratioAt(0.75);
    expect(r1).toBeLessThan(0);
    expect(r2).toBeLessThan(0);
    expect(Math.abs(r1 - r2) / Math.abs(r1)).toBeLessThan(0.1);
    model.dispose();
  });
});
