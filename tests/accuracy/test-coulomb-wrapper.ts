/**
 * Test the Coulomb 1D numerical wrapper to verify it produces odd-parity solutions.
 */

import { solveCoulomb1DNumerical } from "../../src/common/model/analytical-solutions/coulomb-1d-numerical-wrapper.js";
import { solveCoulomb1DPotential } from "../../src/common/model/analytical-solutions/coulomb-1d-potential.js";
import { solveDVR } from "../../src/common/model/DVRSolver.js";
import { solveFGH } from "../../src/common/model/FGHSolver.js";
import { solveMatrixNumerov } from "../../src/common/model/MatrixNumerovSolver.js";

// Physical constants
const M_E = 9.1093837015e-31;
const E_CHARGE = 1.602176634e-19;
const EPSILON_0 = 8.8541878128e-12;
const K_E = 1 / (4 * Math.PI * EPSILON_0);
const ALPHA_H = K_E * E_CHARGE * E_CHARGE;

console.log("=== Testing Coulomb 1D Numerical Wrapper ===\n");

const gridConfig = {
  xMin: -30e-10,
  xMax: 30e-10,
  numPoints: 128,
};

// Get analytical solution as reference
const analytical = solveCoulomb1DPotential(ALPHA_H, M_E, 5, gridConfig);

console.log("Analytical energies (eV):");
for (let i = 0; i < 3; i++) {
  console.log(`  E_${i} = ${(analytical.energies[i] / E_CHARGE).toFixed(6)} eV`);
}

// Test wrapper with different solvers
const solvers = [
  { name: "DVR", solver: solveDVR },
  { name: "MatrixNumerov", solver: solveMatrixNumerov },
  { name: "FGH", solver: solveFGH },
];

for (const { name, solver } of solvers) {
  console.log(`\n=== ${name} (via wrapper) ===`);

  try {
    const result = solveCoulomb1DNumerical(ALPHA_H, M_E, 5, gridConfig, solver);

    console.log("Energies (eV):");
    for (let i = 0; i < Math.min(3, result.energies.length); i++) {
      const energyEV = result.energies[i] / E_CHARGE;
      const analyticalEV = analytical.energies[i] / E_CHARGE;
      const error = Math.abs(((energyEV - analyticalEV) / analyticalEV) * 100);
      console.log(`  E_${i} = ${energyEV.toFixed(6)} eV (error: ${error.toFixed(2)}%)`);
    }

    console.log("\nParity check (should ALL be ODD):");
    let allOdd = true;
    for (let state = 0; state < Math.min(3, result.wavefunctions.length); state++) {
      const wf = result.wavefunctions[state];
      const midIdx = Math.floor(wf.length / 2);
      const offset = 30;
      const leftVal = wf[midIdx - offset];
      const rightVal = wf[midIdx + offset];

      const oddError = Math.abs(leftVal + rightVal) / Math.max(Math.abs(leftVal), Math.abs(rightVal));
      const evenError = Math.abs(leftVal - rightVal) / Math.max(Math.abs(leftVal), Math.abs(rightVal));

      const isOdd = oddError < evenError;
      const parity = isOdd ? "ODD" : "EVEN";
      allOdd = allOdd && isOdd;

      console.log(`  n=${state}: ψ(-x) = ${leftVal.toExponential(3)}, ψ(x) = ${rightVal.toExponential(3)}`);
      console.log(`        Parity: ${parity} ${isOdd ? "✓" : "✗ INCORRECT"}`);
    }

    console.log(`\nAll odd: ${allOdd ? "✓ PASS" : "✗ FAIL"}`);
  } catch (error) {
    console.log(`ERROR: ${error}`);
  }
}

console.log("\n=== End of Test ===");
