/**
 * Closed-form spectra checked against an independent fine-grid Numerov solution of the same
 * potential. This is what caught the Pöschl-Teller solver using the deep-well approximation
 * s ≈ λ − ½ instead of the exact index s(s + 1) = λ², and the Rosen-Morse and Eckart solvers using
 * spectra that were not those of their potentials.
 */

import { describe, expect, it } from "vitest";
import {
  createEckartPotential,
  solveEckartPotential,
} from "../../../src/common/model/analytical-solutions/eckart-potential.js";
import { solvePoschlTellerPotential } from "../../../src/common/model/analytical-solutions/poschl-teller-potential.js";
import {
  createRosenMorsePotential,
  solveRosenMorsePotential,
} from "../../../src/common/model/analytical-solutions/rosen-morse-potential.js";
import type { GridConfig, PotentialFunction } from "../../../src/common/model/PotentialFunction.js";
import QuantumConstants from "../../../src/common/model/QuantumConstants.js";
import { Schrodinger1DSolver } from "../../../src/common/model/Schrodinger1DSolver.js";

const { ELECTRON_MASS, EV_TO_JOULES } = QuantumConstants;
const NM = 1e-9;

/** Numerov solution on an odd, fine grid (the solver needs x = 0 on the grid only for symmetric grids). */
function solveNumerov(potential: PotentialFunction, numStates: number, grid: GridConfig) {
  const fineGrid = { ...grid, numPoints: 4001 };
  return new Schrodinger1DSolver().solveNumerical(potential, ELECTRON_MASS, numStates, fineGrid);
}

function expectSameSpectrum(analytical: number[], numerical: number[], relativeTolerance: number): void {
  expect(numerical.length).toBeGreaterThanOrEqual(analytical.length);
  analytical.forEach((energy, n) => {
    expect(Math.abs(numerical[n]! - energy) / Math.abs(energy)).toBeLessThan(relativeTolerance);
  });
}

describe("analytical spectra agree with a fine-grid Numerov solution", () => {
  it("Pöschl-Teller, shallow well (few bound states)", () => {
    const depth = 0.5 * EV_TO_JOULES;
    const width = 0.5 * NM;
    const grid: GridConfig = { xMin: -6 * NM, xMax: 6 * NM, numPoints: 600 };

    const analytical = solvePoschlTellerPotential(depth, width, ELECTRON_MASS, 10, grid);
    const numerical = solveNumerov((x) => -depth / Math.cosh(x / width) ** 2, 10, grid);

    expectSameSpectrum(analytical.energies, numerical.energies, 5e-3);
  });

  it.each([
    ["deep, tilted", 5, 0.5, 1.0],
    ["shallow, tilted", 0.5, 0.5, 0.6],
    ["tilted the other way", 2, -0.8, 0.8],
  ])("Rosen-Morse, %s well", (_label, depthEv, tiltEv, widthNm) => {
    const depth = depthEv * EV_TO_JOULES;
    const tilt = tiltEv * EV_TO_JOULES;
    const width = widthNm * NM;
    const grid: GridConfig = { xMin: -12 * width, xMax: 12 * width, numPoints: 600 };

    const analytical = solveRosenMorsePotential(depth, tilt, width, ELECTRON_MASS, 6, grid);
    const potential = createRosenMorsePotential(depth, tilt, width);
    const numerical = solveNumerov(potential, 12, grid);

    // Only states below both asymptotes (±V₁) are bound in the infinite system
    expectSameSpectrum(analytical.energies, numerical.energies, 5e-3);
    for (const energy of analytical.energies) {
      expect(energy).toBeLessThan(-Math.abs(tilt));
    }
  });

  it("Eckart, with a well (V₁ ≈ V₀)", () => {
    const depth = 3 * EV_TO_JOULES;
    const barrier = 3.5 * EV_TO_JOULES;
    const width = 0.5 * NM;
    const grid: GridConfig = { xMin: -15 * width, xMax: 20 * width, numPoints: 600 };

    const analytical = solveEckartPotential(depth, barrier, width, ELECTRON_MASS, 6, grid);
    const potential = createEckartPotential(depth, barrier, width);
    const numerical = solveNumerov(potential, 12, grid);

    expectSameSpectrum(analytical.energies, numerical.energies, 5e-3);
    // Bound states sit above the bottom of the well and below both asymptotes (V₀ − V₁ and 0)
    const minimum = -(barrier * barrier) / (4 * depth);
    for (const energy of analytical.energies) {
      expect(energy).toBeGreaterThan(minimum);
      expect(energy).toBeLessThan(Math.min(0, depth - barrier));
    }
  });

  it("Eckart at the sim defaults: states only inside the shallow dip", () => {
    const depth = 5 * EV_TO_JOULES;
    const barrier = 0.5 * EV_TO_JOULES;
    const grid: GridConfig = { xMin: -10 * NM, xMax: 10 * NM, numPoints: 200 };

    const { energies } = solveEckartPotential(depth, barrier, 4 * NM, ELECTRON_MASS, 5, grid);

    // The old solver returned six states here, all far below the −0.0125 eV minimum of V
    expect(energies.length).toBeGreaterThan(0);
    for (const energy of energies) {
      expect(energy).toBeGreaterThan(-(barrier * barrier) / (4 * depth));
      expect(energy).toBeLessThan(0);
    }
  });

  it("Eckart with no dip (V₁ ≤ 0) has no bound states", () => {
    const grid: GridConfig = { xMin: -10 * NM, xMax: 10 * NM, numPoints: 200 };
    expect(() => solveEckartPotential(5 * EV_TO_JOULES, -0.5 * EV_TO_JOULES, 1 * NM, ELECTRON_MASS, 5, grid)).toThrow();
  });
});
