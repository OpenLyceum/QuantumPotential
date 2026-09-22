/**
 * Exact-energy checks for the closed-form bound-state solutions. These are the reference the
 * numerical solvers are compared against, so they are pinned to textbook formulas here.
 */

import { describe, expect, it } from "vitest";
import { solveHarmonicOscillator } from "../../../src/common/model/analytical-solutions/harmonic-oscillator.js";
import { solveInfiniteWell } from "../../../src/common/model/analytical-solutions/infinite-square-well.js";
import type { GridConfig } from "../../../src/common/model/PotentialFunction.js";
import QuantumConstants from "../../../src/common/model/QuantumConstants.js";

const { HBAR, ELECTRON_MASS } = QuantumConstants;
const NM = 1e-9;

describe("infinite square well", () => {
  const width = 1 * NM;
  const grid: GridConfig = { xMin: -width / 2, xMax: width / 2, numPoints: 401 };
  const result = solveInfiniteWell(width, ELECTRON_MASS, 5, grid);

  it("returns the requested number of states on the requested grid", () => {
    expect(result.energies).toHaveLength(5);
    expect(result.wavefunctions).toHaveLength(5);
    expect(result.xGrid).toHaveLength(grid.numPoints);
  });

  it("has energies E_n = n²π²ħ²/(2mL²)", () => {
    result.energies.forEach((energy, i) => {
      const n = i + 1;
      const exact = (n * n * Math.PI * Math.PI * HBAR * HBAR) / (2 * ELECTRON_MASS * width * width);
      expect(energy).toBeCloseTo(exact, 30);
      expect(Math.abs(energy - exact) / exact).toBeLessThan(1e-9);
    });
  });

  it("returns normalized wavefunctions", () => {
    const dx = result.xGrid[1]! - result.xGrid[0]!;
    for (const psi of result.wavefunctions) {
      const norm = psi.reduce((sum, value) => sum + value * value, 0) * dx;
      expect(norm).toBeCloseTo(1, 2);
    }
  });
});

describe("harmonic oscillator", () => {
  const omega = 1e15; // rad/s
  const springConstant = ELECTRON_MASS * omega * omega;
  const grid: GridConfig = { xMin: -5 * NM, xMax: 5 * NM, numPoints: 401 };
  const result = solveHarmonicOscillator(springConstant, ELECTRON_MASS, 6, grid);

  it("has evenly spaced energies E_n = ħω(n + ½)", () => {
    result.energies.forEach((energy, n) => {
      const exact = HBAR * omega * (n + 0.5);
      expect(Math.abs(energy - exact) / exact).toBeLessThan(1e-9);
    });
  });
});
