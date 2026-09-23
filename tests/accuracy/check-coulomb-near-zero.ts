/**
 * Check the behavior of 1D Coulomb wavefunction near x=0
 */

import { solveCoulomb1DPotential } from "../../src/common/model/analytical-solutions/coulomb-1d-potential.js";

// Physical constants (SI units)
const M_E = 9.1093837015e-31; // Electron mass (kg)
const E_CHARGE = 1.602176634e-19; // Elementary charge (C)
const EPSILON_0 = 8.8541878128e-12; // Vacuum permittivity (F/m)
const K_E = 1 / (4 * Math.PI * EPSILON_0); // Coulomb constant

// Hydrogen-like Coulomb strength: α = e²/(4πε₀)
const ALPHA_H = K_E * E_CHARGE * E_CHARGE; // ≈ 2.307e-28 J·m

// Use a fine grid very close to x=0
const gridConfig = {
  xMin: -1e-10, // ±1 Å
  xMax: 1e-10,
  numPoints: 201, // 0.01 Å spacing
};

const result = solveCoulomb1DPotential(ALPHA_H, M_E, 1, gridConfig);

console.log("=== 1D Coulomb Near x=0 ===\n");
console.log(
  `Grid: ${gridConfig.numPoints} points from ${(gridConfig.xMin * 1e10).toFixed(3)} to ${(gridConfig.xMax * 1e10).toFixed(3)} Å`,
);
console.log(
  `Grid spacing: ${(((gridConfig.xMax - gridConfig.xMin) / (gridConfig.numPoints - 1)) * 1e10).toFixed(4)} Å\n`,
);

// Find the middle of the grid (x=0 or closest to it)
const midIdx = Math.floor(result.xGrid.length / 2);

console.log("Ground state (n=0) wavefunction near x=0:\n");
console.log("  Index |    x (Å)    |   ψ(x)   |  |ψ(x)|/|x| ");
console.log("--------+-------------+----------+-----------");

const wf = result.wavefunctions[0];

// Print 10 points on each side of x=0
for (let i = midIdx - 10; i <= midIdx + 10; i++) {
  const x = result.xGrid[i];
  const psi = wf[i];
  const ratio = Math.abs(x) > 1e-15 ? Math.abs(psi / x) : 0;

  console.log(
    `  ${i.toString().padStart(5)} | ${(x * 1e10).toFixed(7).padStart(11)} | ${psi.toExponential(2).padStart(8)} | ${ratio.toExponential(2).padStart(9)}`,
  );
}

// Check if ψ(x)/x is approximately constant near x=0 (linear behavior)
console.log("\n=== Analysis ===\n");

// Take points very close to x=0 but not exactly at x=0
const testIndices = [midIdx - 3, midIdx - 2, midIdx - 1, midIdx + 1, midIdx + 2, midIdx + 3];
const ratios = testIndices.map((i) => {
  const x = result.xGrid[i];
  const psi = wf[i];
  return psi / x; // Should be approximately constant if ψ ~ x
});

console.log("ψ(x)/x values (should be constant if ψ ~ C*x):");
for (let i = 0; i < testIndices.length; i++) {
  const idx = testIndices[i];
  const x = result.xGrid[idx];
  console.log(`  x = ${(x * 1e10).toFixed(6).padStart(9)} Å: ψ/x = ${ratios[i].toExponential(4)}`);
}

// Check standard deviation of ratios
const meanRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
const variance = ratios.reduce((sum, r) => sum + (r - meanRatio) ** 2, 0) / ratios.length;
const stdDev = Math.sqrt(variance);
const relativeStdDev = (stdDev / Math.abs(meanRatio)) * 100;

console.log(`\nMean ψ/x: ${meanRatio.toExponential(4)}`);
console.log(`Std dev: ${stdDev.toExponential(4)}`);
console.log(`Relative std dev: ${relativeStdDev.toFixed(2)}%`);

if (relativeStdDev < 5) {
  console.log("\n✓ PASS: ψ(x) has linear behavior near x=0 (ψ ~ C*x)");
} else {
  console.log("\n✗ FAIL: ψ(x) does NOT have linear behavior near x=0");
  console.log("  Expected: ψ(x) ≈ C*x with constant C");
  console.log("  Found: ψ(x)/x varies significantly");
}

// Check derivative continuity by computing numerical derivatives
console.log("\n=== Derivative Check ===\n");
console.log("Left derivative (approaching 0 from left):");
const dx = result.xGrid[1] - result.xGrid[0];
const leftDerivative = (wf[midIdx] - wf[midIdx - 1]) / dx;
console.log(`  dψ/dx at x ≈ ${(result.xGrid[midIdx - 1] * 1e10).toFixed(6)} Å: ${leftDerivative.toExponential(4)}`);

console.log("\nRight derivative (approaching 0 from right):");
const rightDerivative = (wf[midIdx + 1] - wf[midIdx]) / dx;
console.log(`  dψ/dx at x ≈ ${(result.xGrid[midIdx] * 1e10).toFixed(6)} Å: ${rightDerivative.toExponential(4)}`);

const derivativeRatio = Math.abs((leftDerivative - rightDerivative) / leftDerivative) * 100;
console.log(`\nDerivative difference: ${derivativeRatio.toFixed(2)}%`);

if (derivativeRatio < 10) {
  console.log("✓ PASS: Derivative is continuous at x=0");
} else {
  console.log("✗ FAIL: Derivative has a discontinuity at x=0");
}
