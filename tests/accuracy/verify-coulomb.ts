/**
 * Verification test for Coulomb wavefunction implementations.
 * Compares implementations against known analytical formulas.
 */

import { solveCoulomb1DPotential } from "../../src/common/model/analytical-solutions/coulomb-1d-potential.js";
import { solveCoulomb3DPotential } from "../../src/common/model/analytical-solutions/coulomb-3d-potential.js";

// Physical constants (SI units)
const HBAR = 1.054571817e-34; // Reduced Planck constant (J·s)
const M_E = 9.1093837015e-31; // Electron mass (kg)
const E_CHARGE = 1.602176634e-19; // Elementary charge (C)
const EPSILON_0 = 8.8541878128e-12; // Vacuum permittivity (F/m)
const K_E = 1 / (4 * Math.PI * EPSILON_0); // Coulomb constant

// Hydrogen-like Coulomb strength: α = e²/(4πε₀)
const ALPHA_H = K_E * E_CHARGE * E_CHARGE; // ≈ 2.307e-28 J·m

// Bohr radius: a₀ = ℏ²/(m_e * α)
const A_0 = (HBAR * HBAR) / (M_E * ALPHA_H); // ≈ 5.29e-11 m

// Rydberg energy: E_R = m_e * α² / (2 * ℏ²) = 13.6 eV
const E_RYDBERG = (M_E * ALPHA_H * ALPHA_H) / (2 * HBAR * HBAR);
const E_RYDBERG_EV = E_RYDBERG / E_CHARGE;

console.log("=== Coulomb Wavefunction Verification ===\n");
console.log("Physical constants:");
console.log(`  Bohr radius a₀ = ${(A_0 * 1e10).toFixed(4)} Å`);
console.log(`  Rydberg energy E_R = ${E_RYDBERG_EV.toFixed(2)} eV`);
console.log("");

// ===================================================================
// TEST 1: 3D Coulomb Potential (Hydrogen Atom, L=0)
// ===================================================================
console.log("=== 3D COULOMB POTENTIAL (Hydrogen Atom, L=0) ===\n");

// Expected energies: E_n = -E_R/n² = -13.6 eV/n²
const expected3DEnergies = [
  -E_RYDBERG, // n=1: -13.6 eV
  -E_RYDBERG / 4, // n=2: -3.4 eV
  -E_RYDBERG / 9, // n=3: -1.51 eV
  -E_RYDBERG / 16, // n=4: -0.85 eV
  -E_RYDBERG / 25, // n=5: -0.54 eV
];

// Solve 3D Coulomb
const gridConfig = {
  xMin: 0.1e-10, // Avoid r=0 singularity
  xMax: 30e-10, // ~60 Bohr radii
  numPoints: 1000,
};

const result3D = solveCoulomb3DPotential(ALPHA_H, M_E, 5, gridConfig);

console.log("Energy eigenvalues (3D Hydrogen, L=0):");
console.log("  n  | Computed (eV)  | Expected (eV)  | Error (%)");
console.log("-----+----------------+----------------+----------");

const energyErrors3D = [];
for (let i = 0; i < 5; i++) {
  const n = i + 1;
  const computedEV = result3D.energies[i] / E_CHARGE;
  const expectedEV = expected3DEnergies[i] / E_CHARGE;
  const error = Math.abs(((computedEV - expectedEV) / expectedEV) * 100);
  energyErrors3D.push(error);
  console.log(
    `  ${n}  | ${computedEV.toFixed(6).padStart(14)} | ${expectedEV.toFixed(6).padStart(14)} | ${error.toFixed(4).padStart(8)}`,
  );
}

// Check if all 3D energies match
const all3DEnergyCorrect = energyErrors3D.every((e) => e < 0.001);
console.log(`\n3D Energy check: ${all3DEnergyCorrect ? "PASS ✓" : "FAIL ✗"}`);

// Verify wavefunction at specific points
// R_10(r) = 2/a₀^(3/2) * exp(-r/a₀)
// R_20(r) = (1/(2a₀))^(3/2) * (2 - r/a₀) * exp(-r/(2a₀))
console.log("\nWavefunction verification (3D):");

// Find grid index closest to r = a₀
const rTestBohr = A_0; // 1 Bohr radius
const idxBohr = result3D.xGrid.findIndex((r) => r >= rTestBohr);
const rActual = result3D.xGrid[idxBohr];

// Theoretical R_10(a₀) = 2/a₀^(3/2) * exp(-1)
const R10Theory = (2 / A_0 ** 1.5) * Math.exp(-1);
const R10Computed = result3D.wavefunctions[0][idxBohr];

// Check if they match in shape (could differ by normalization)
console.log(`\nAt r = ${(rActual * 1e10).toFixed(3)} Å (≈ a₀):`);
console.log(`  R_10 computed:    ${R10Computed.toExponential(4)}`);
console.log(`  R_10 theoretical: ${R10Theory.toExponential(4)}`);

// Check normalization by computing integral of |R|² r² dr
// For properly normalized radial wavefunction: ∫₀^∞ |R_nl|² r² dr = 1
console.log("\nNormalization check (∫|R|²r²dr should = 1):");
for (let state = 0; state < 3; state++) {
  const n = state + 1;
  const wf = result3D.wavefunctions[state];
  const dr = result3D.xGrid[1] - result3D.xGrid[0];
  let integral = 0;
  for (let i = 0; i < result3D.xGrid.length; i++) {
    const r = result3D.xGrid[i];
    integral += wf[i] * wf[i] * r * r * dr;
  }
  console.log(`  n=${n}: ∫|R_{${n}0}|²r²dr = ${integral.toFixed(4)}`);
}

// ===================================================================
// TEST 2: 1D Coulomb Potential
// ===================================================================
console.log("\n\n=== 1D COULOMB POTENTIAL ===\n");

// For 1D Coulomb with ψ(0)=0 boundary condition:
// E_n = -E_R/(n+1/2)² for n = 0, 1, 2, ...
// This is the "half-line" Coulomb problem
const expected1DEnergies = [
  -E_RYDBERG / (0.5 * 0.5), // n=0: E_0 = -4 * E_R
  -E_RYDBERG / (1.5 * 1.5), // n=1: E_1 = -E_R/2.25
  -E_RYDBERG / (2.5 * 2.5), // n=2: E_2 = -E_R/6.25
  -E_RYDBERG / (3.5 * 3.5), // n=3: E_3 = -E_R/12.25
  -E_RYDBERG / (4.5 * 4.5), // n=4: E_4 = -E_R/20.25
];

const gridConfig1D = {
  xMin: -30e-10,
  xMax: 30e-10,
  numPoints: 1000,
};

const result1D = solveCoulomb1DPotential(ALPHA_H, M_E, 5, gridConfig1D);

console.log("Energy eigenvalues (1D Coulomb):");
console.log("  n  | Computed (eV)   | Expected (eV)   | Error (%)");
console.log("-----+-----------------+-----------------+----------");

const energyErrors1D = [];
for (let i = 0; i < 5; i++) {
  const computedEV = result1D.energies[i] / E_CHARGE;
  const expectedEV = expected1DEnergies[i] / E_CHARGE;
  const error = Math.abs(((computedEV - expectedEV) / expectedEV) * 100);
  energyErrors1D.push(error);
  console.log(
    `  ${i}  | ${computedEV.toFixed(6).padStart(15)} | ${expectedEV.toFixed(6).padStart(15)} | ${error.toFixed(4).padStart(8)}`,
  );
}

const all1DEnergyCorrect = energyErrors1D.every((e) => e < 0.001);
console.log(`\n1D Energy check: ${all1DEnergyCorrect ? "PASS ✓" : "FAIL ✗"}`);

// Check normalization for 1D: ∫|ψ|²dx = 1
console.log("\nNormalization check for 1D (∫|ψ|²dx should = 1):");
const dx = result1D.xGrid[1] - result1D.xGrid[0];
for (let state = 0; state < 3; state++) {
  const wf = result1D.wavefunctions[state];
  let integral = 0;
  for (let i = 0; i < result1D.xGrid.length; i++) {
    integral += wf[i] * wf[i] * dx;
  }
  console.log(`  n=${state}: ∫|ψ_${state}|²dx = ${integral.toFixed(4)}`);
}

// Check symmetry - 1D Coulomb with E_n = -E_R/(n+1/2)² should have ODD parity
console.log("\nParity check:");
console.log("  Energy formula E_n = -E_R/(n+1/2)² is for ODD-parity states");
console.log("  (wavefunctions should satisfy ψ(-x) = -ψ(x))");
console.log("");
for (let state = 0; state < 3; state++) {
  const wf = result1D.wavefunctions[state];
  const midIdx = Math.floor(wf.length / 2);
  const offset = 50;
  const leftVal = wf[midIdx - offset]; // ψ(-x)
  const rightVal = wf[midIdx + offset]; // ψ(x)

  // Check if even: ψ(-x) = ψ(x)
  const evenError = Math.abs(leftVal - rightVal);
  // Check if odd: ψ(-x) = -ψ(x)
  const oddError = Math.abs(leftVal + rightVal);

  const isEven = evenError < oddError;
  const parity = isEven ? "EVEN" : "ODD";
  const expected = "ODD";
  const correct = parity === expected;

  console.log(`  n=${state}: ψ(-x) = ${leftVal.toExponential(3)}, ψ(x) = ${rightVal.toExponential(3)}`);
  console.log(`        Parity: ${parity} (expected ${expected}) ${correct ? "✓" : "✗ INCORRECT"}`);
}

// ===================================================================
// SUMMARY
// ===================================================================
console.log("\n\n=== SUMMARY ===\n");

if (all3DEnergyCorrect) {
  console.log("3D Coulomb energies: CORRECT ✓");
} else {
  console.log("3D Coulomb energies: INCORRECT ✗");
}

if (all1DEnergyCorrect) {
  console.log("1D Coulomb energies: CORRECT ✓");
} else {
  console.log("1D Coulomb energies: INCORRECT ✗");
}

// Additional checks
console.log("\n--- Detailed Analysis ---\n");

// 3D: Check R_10(0) should approach 2/a₀^(3/2)
const R10AtOrigin = result3D.wavefunctions[0][0];
console.log("3D R_10 at first grid point:");
console.log(`  Computed: ${R10AtOrigin.toExponential(4)}`);
console.log(`  Expected (≈ 2/a₀^(3/2)): ${(2 / A_0 ** 1.5).toExponential(4)}`);

// 1D: Odd parity means ψ(0) = 0 (wavefunction passes through zero at origin)
const wf01d = result1D.wavefunctions[0];
// Find index closest to x=0
const closestToZeroIdx = result1D.xGrid.reduce(
  (minIdx, x, idx, arr) => (Math.abs(x) < Math.abs(arr[minIdx]) ? idx : minIdx),
  0,
);
const xAtClosest = result1D.xGrid[closestToZeroIdx];
const atClosestToZero = wf01d[closestToZeroIdx];
const nearCenter1D = wf01d[closestToZeroIdx + 50]; // Just away from center
const awayFromCenter1D = wf01d[closestToZeroIdx + 200];

console.log("\n1D ψ_0 shape check (odd parity):");
console.log(`  x closest to 0: ${(xAtClosest * 1e10).toExponential(4)} Å`);
console.log(`  ψ at x≈0: ${atClosestToZero.toExponential(4)}`);
console.log(`  Near center: ${nearCenter1D.toExponential(4)}`);
console.log(`  Away from center: ${awayFromCenter1D.toExponential(4)}`);

// For odd parity, check that:
// 1. ψ changes sign around x=0 (values on opposite sides have opposite signs)
// 2. ψ(x) = -ψ(-x) approximately (antisymmetry)
const leftOfCenter = wf01d[closestToZeroIdx - 1];
const rightOfCenter = wf01d[closestToZeroIdx + 1];
const signChange = leftOfCenter * rightOfCenter < 0;

// Check antisymmetry using grid symmetry: x[i] = -x[N-1-i]
// For a grid from -L to +L with N points, points at indices i and (N-1-i) are symmetric
const testIdx = 400; // About 6 Angstroms from center
const symmetricIdx = result1D.xGrid.length - 1 - testIdx;
const leftValSym = wf01d[testIdx];
const rightValSym = wf01d[symmetricIdx];
const xLeft = result1D.xGrid[testIdx];
const xRight = result1D.xGrid[symmetricIdx];
const antisymmetryError = Math.abs(leftValSym + rightValSym) / Math.max(Math.abs(leftValSym), Math.abs(rightValSym));
const isAntisymmetric = antisymmetryError < 0.05; // Should be very close for symmetric grid points

console.log(`  Sign change around x=0: ${signChange ? "PASS ✓" : "FAIL ✗"}`);
console.log(
  `  Antisymmetry at x=${(xLeft * 1e10).toFixed(2)} and ${(xRight * 1e10).toFixed(2)} Å: ${isAntisymmetric ? "PASS ✓" : "FAIL ✗"} (error: ${(antisymmetryError * 100).toFixed(1)}%)`,
);

// If x=0 is exactly on the grid, check ψ(0) = 0
if (Math.abs(xAtClosest) < 1e-15) {
  const isZeroAtOrigin = Math.abs(atClosestToZero) < 1e-10;
  console.log(`  ψ(0) = 0 (exact): ${isZeroAtOrigin ? "PASS ✓" : "FAIL ✗"}`);
}

console.log("\n=== End of Verification ===");
