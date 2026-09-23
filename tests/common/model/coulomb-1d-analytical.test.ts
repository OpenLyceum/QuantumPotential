import { describe, expect, it } from "vitest";
import { solveCoulomb1DPotential } from "../../../src/common/model/analytical-solutions/coulomb-1d-potential.js";
import QuantumConstants from "../../../src/common/model/QuantumConstants.js";

const { HBAR, ELEMENTARY_CHARGE } = QuantumConstants;
const mass = 9.1093837139e-31;
const alpha = ELEMENTARY_CHARGE ** 2 / (4 * Math.PI * 8.8541878188e-12);
const rydberg = (mass * alpha * alpha) / (2 * HBAR * HBAR);
const result = solveCoulomb1DPotential(alpha, mass, 4, { xMin: -8e-9, xMax: 8e-9, numPoints: 8001 });
const dx = result.xGrid[1]! - result.xGrid[0]!;

describe("regular 1D Coulomb solution", () => {
  it("uses the Rydberg spectrum and normalized, mutually orthogonal odd states", () => {
    for (let state = 0; state < 4; state++) {
      expect(result.energies[state]! / rydberg).toBeCloseTo(-1 / (state + 1) ** 2, 12);
      const psi = result.wavefunctions[state]!;
      expect(psi[4000]).toBe(0);
      for (let i = 0; i < 4000; i += 83) {
        expect(psi[i]! + psi[8000 - i]!).toBeCloseTo(0, 8);
      }
      const norm = psi.reduce((sum, value) => sum + value * value * dx, 0);
      expect(norm).toBeCloseTo(1, 3);
      for (let other = 0; other < state; other++) {
        const overlap = psi.reduce((sum, value, i) => sum + value * result.wavefunctions[other]![i]! * dx, 0);
        expect(Math.abs(overlap)).toBeLessThan(0.001);
      }
    }
  });

  it("satisfies the Schrödinger equation away from the singularity", () => {
    for (let state = 0; state < 4; state++) {
      const psi = result.wavefunctions[state]!;
      const energy = result.energies[state]!;
      for (const index of [4050, 4100, 4200, 4400, 4600]) {
        const x = result.xGrid[index]!;
        const secondDerivative = (psi[index + 1]! - 2 * psi[index]! + psi[index - 1]!) / (dx * dx);
        const hPsi = (-(HBAR * HBAR) / (2 * mass)) * secondDerivative - (alpha / x) * psi[index]!;
        expect(Math.abs(hPsi - energy * psi[index]!)).toBeLessThan(0.003 * rydberg * Math.max(...psi.map(Math.abs)));
      }
    }
  });
});
