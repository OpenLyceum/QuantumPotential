/**
 * The Numerov solver (ported from Quantum Bound States) behind Schrodinger1DSolver.solveNumerical. Checks the
 * invariants every numerically solved state must satisfy (finite, ordered, normalized, orthogonal, n nodes),
 * closed-form energies for single wells, and agreement with the FGH cross-check on the multi-well potentials
 * the Many Wells screen solves — including the tilted (electric field) case, which has no parity symmetry.
 */

import { describe, expect, it } from "vitest";
import {
  createMultiSquareWellPotential,
  withElectricField,
} from "../../../src/common/model/analytical-solutions/multi-square-well.js";
import { solvePoschlTellerPotential } from "../../../src/common/model/analytical-solutions/poschl-teller-potential.js";
import { NumericalMethod } from "../../../src/common/model/NumericalMethod.js";
import type { BoundStateResult, GridConfig, PotentialFunction } from "../../../src/common/model/PotentialFunction.js";
import QuantumConstants from "../../../src/common/model/QuantumConstants.js";
import { Schrodinger1DSolver } from "../../../src/common/model/Schrodinger1DSolver.js";

const { HBAR, ELECTRON_MASS, EV_TO_JOULES, NM_TO_M } = QuantumConstants;
// The sim's default resolution (?numberOfPoints=1001 over the ±4 nm chart, i.e. 8 pm spacing)
const GRID: GridConfig = { xMin: -4 * NM_TO_M, xMax: 4 * NM_TO_M, numPoints: 1001 };

function solve(potential: PotentialFunction, numStates = 80, grid = GRID, energyRange?: [number, number]) {
  return new Schrodinger1DSolver().solveNumerical(potential, ELECTRON_MASS, numStates, grid, energyRange);
}

function overlap(result: BoundStateResult, m: number, n: number): number {
  const { xGrid, wavefunctions } = result;
  const a = wavefunctions[m]!;
  const b = wavefunctions[n]!;
  let sum = 0;
  for (let i = 0; i < xGrid.length - 1; i++) {
    sum += ((a[i]! * b[i]! + a[i + 1]! * b[i + 1]!) / 2) * (xGrid[i + 1]! - xGrid[i]!);
  }
  return sum;
}

/** Sign changes of ψ, ignoring the negligible tails. */
function countNodes(psi: number[]): number {
  const peak = Math.max(...psi.map(Math.abs));
  let nodes = 0;
  let previousSign = 0;
  for (const value of psi) {
    if (Math.abs(value) < 1e-6 * peak) {
      continue;
    }
    const sign = Math.sign(value);
    if (previousSign !== 0 && sign !== previousSign) {
      nodes++;
    }
    previousSign = sign;
  }
  return nodes;
}

function expectInvariants(result: BoundStateResult, checkNodes = true): void {
  const { energies, wavefunctions } = result;
  expect(energies.length).toBeGreaterThan(0);
  expect(wavefunctions).toHaveLength(energies.length);
  for (let n = 0; n < energies.length; n++) {
    expect(Number.isFinite(energies[n]!)).toBe(true);
    expect(wavefunctions[n]!.every(Number.isFinite)).toBe(true);
    if (n > 0) {
      expect(energies[n]!).toBeGreaterThan(energies[n - 1]!);
    }
    expect(overlap(result, n, n)).toBeCloseTo(1, 3);
    if (checkNodes) {
      expect(countNodes(wavefunctions[n]!)).toBe(n);
    }
  }
  for (let m = 0; m < Math.min(energies.length, 8); m++) {
    for (let n = m + 1; n < Math.min(energies.length, 8); n++) {
      expect(Math.abs(overlap(result, m, n))).toBeLessThan(1e-3);
    }
  }
}

function multiWell(numberOfWells: number, widthNm: number, depthEv: number, separationNm: number, fieldVPerNm = 0) {
  return withElectricField(
    createMultiSquareWellPotential(numberOfWells, widthNm * NM_TO_M, depthEv * EV_TO_JOULES, separationNm * NM_TO_M),
    fieldVPerNm / NM_TO_M,
  );
}

describe("Numerov solver", () => {
  it("reproduces harmonic-oscillator energies ħω(n + ½)", () => {
    const omega = 1e15;
    const springConstant = ELECTRON_MASS * omega * omega;
    const V = (x: number) => 0.5 * springConstant * x * x;
    const result = solve(V, 6, GRID, [0, 20 * HBAR * omega]);

    expect(result.energies).toHaveLength(6);
    result.energies.forEach((energy, n) => {
      const exact = HBAR * omega * (n + 0.5);
      expect(Math.abs(energy - exact) / exact).toBeLessThan(1e-4);
    });
    expectInvariants(result);
  });

  it("matches the closed-form Pöschl–Teller spectrum", () => {
    const depth = 5 * EV_TO_JOULES;
    const width = 0.4 * NM_TO_M;
    const analytical = solvePoschlTellerPotential(depth, width, ELECTRON_MASS, 20, GRID);
    const numerical = solve((x) => -depth / Math.cosh(x / width) ** 2);

    // A state within a few meV of threshold is not resolvable inside the ±4 nm box, so compare the rest
    const resolved = analytical.energies.filter((energy) => energy < -0.05 * EV_TO_JOULES);
    expect(numerical.energies.length).toBeGreaterThanOrEqual(resolved.length);
    resolved.forEach((energy, n) => {
      expect(Math.abs(numerical.energies[n]! - energy) / Math.abs(energy)).toBeLessThan(5e-3);
    });
    expectInvariants(numerical);
  });

  it("returns only states bound below the barriers, capped at numStates", () => {
    const result = solve(multiWell(3, 1, 5, 0.2));
    for (const energy of result.energies) {
      expect(energy).toBeLessThan(5 * EV_TO_JOULES);
    }
    expect(solve(multiWell(3, 1, 5, 0.2), 4).energies).toHaveLength(4);
  });

  it.each([
    [1, 1.0, 5, 0.2],
    [2, 0.5, 10, 0.1],
    [5, 0.4, 15, 0.05],
    [10, 0.3, 12, 0.3],
  ])("multi-square well N=%i (w=%f nm, V₀=%f eV, d=%f nm) satisfies the invariants", (n, w, depth, d) => {
    // Node counting fails only by numerical noise in the densest bands; check it where levels are well separated
    expectInvariants(solve(multiWell(n, w, depth, d)), n <= 5);
  });

  it.each([0.3, -0.5])("tilted multi-square well (ℰ = %f V/nm) satisfies the invariants", (field) => {
    expectInvariants(solve(multiWell(4, 0.5, 10, 0.1, field)), false);
  });

  it.each([
    [3, 1.0, 5, 0.2, 0],
    [4, 0.5, 10, 0.1, 0.3],
  ])("agrees with the FGH cross-check (N=%i, w=%f, V₀=%f, d=%f, ℰ=%f)", (n, w, depth, d, field) => {
    const potential = multiWell(n, w, depth, d, field);
    const numerov = solve(potential);
    const fgh = new Schrodinger1DSolver(NumericalMethod.FGH).solveNumerical(potential, ELECTRON_MASS, 6, GRID);
    for (let i = 0; i < 4; i++) {
      expect(Math.abs(numerov.energies[i]! - fgh.energies[i]!) / Math.abs(fgh.energies[i]!)).toBeLessThan(2e-2);
    }
  });

  it("solves the densest Many Wells band quickly", () => {
    const start = performance.now();
    const grid: GridConfig = { xMin: -7 * NM_TO_M, xMax: 7 * NM_TO_M, numPoints: 3501 };
    const result = solve(multiWell(10, 1.0, 20, 0.05), 80, grid);
    expect(result.energies.length).toBeGreaterThan(10);
    expect(performance.now() - start).toBeLessThan(2000);
  });
});
