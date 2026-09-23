/**
 * Numerov shooting (Preferences → Numerical Method → Numerov). Its bisection used an absolute
 * 1e-10 J tolerance on energies of ~1e-19 J, so it never refined and every energy was the midpoint
 * of the coarse 1-in-1000 scan bracket (≈1 % off for a harmonic oscillator).
 */

import { describe, expect, it } from "vitest";
import { solveNumerov } from "../../../src/common/model/NumerovSolver.js";
import type { GridConfig } from "../../../src/common/model/PotentialFunction.js";
import QuantumConstants from "../../../src/common/model/QuantumConstants.js";

const { HBAR, ELECTRON_MASS } = QuantumConstants;

describe("Numerov shooting", () => {
  it("reproduces harmonic-oscillator energies ħω(n + ½)", () => {
    const omega = 1e15;
    const springConstant = ELECTRON_MASS * omega * omega;
    const x0 = Math.sqrt(HBAR / (ELECTRON_MASS * omega));
    const grid: GridConfig = { xMin: -8 * x0, xMax: 8 * x0, numPoints: 400 };
    const V = (x: number) => 0.5 * springConstant * x * x;

    const { energies } = solveNumerov(V, ELECTRON_MASS, 4, grid, 0, V(grid.xMax));

    expect(energies).toHaveLength(4);
    energies.forEach((energy, n) => {
      const exact = HBAR * omega * (n + 0.5);
      expect(Math.abs(energy - exact) / exact).toBeLessThan(1e-3);
    });
  });
});
