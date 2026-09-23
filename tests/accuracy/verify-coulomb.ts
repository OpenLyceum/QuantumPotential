/** Checks the regular 1D Coulomb eigenstates used by the simulation. */
import { strict as assert } from "node:assert";
import { solveCoulomb1DPotential } from "../../src/common/model/analytical-solutions/coulomb-1d-potential.js";

const hbar = 1.054571817e-34;
const mass = 9.1093837015e-31;
const charge = 1.602176634e-19;
const epsilon0 = 8.8541878128e-12;
const alpha = (charge * charge) / (4 * Math.PI * epsilon0);
const rydberg = (mass * alpha * alpha) / (2 * hbar * hbar);
const result = solveCoulomb1DPotential(alpha, mass, 5, { xMin: -8e-9, xMax: 8e-9, numPoints: 4001 });
const dx = result.xGrid[1]! - result.xGrid[0]!;

for (let state = 0; state < 5; state++) {
  const principal = state + 1;
  assert.ok(Math.abs(result.energies[state]! + rydberg / principal ** 2) < rydberg * 1e-12);
  const psi = result.wavefunctions[state]!;
  const norm = psi.reduce((sum, value) => sum + value * value * dx, 0);
  assert.ok(Math.abs(norm - 1) < 5e-4, `state ${state} norm ${norm}`);
  for (let i = 0; i < 100; i++) {
    assert.ok(Math.abs(psi[i]! + psi[psi.length - 1 - i]!) < 1e-6);
  }
}

console.log("Regular 1D Coulomb energies, parity, and normalization verified.");
