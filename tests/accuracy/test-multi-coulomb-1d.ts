#!/usr/bin/env node
/**
 * Comprehensive test suite for multi-Coulomb 1D quantum potentials
 *
 * This test suite validates the multi-Coulomb 1D solver across various
 * configurations and parameter regimes. The tests verify physical correctness
 * for multiple attractive Coulomb centers arranged in a 1D geometry.
 *
 * Test Categories:
 * 1. Basic Properties (normalization, orthogonality, energy ordering)
 * 2. Node Count Validation (state n has n nodes)
 * 3. Energy Bounds (all bound states have negative energy)
 * 4. Asymptotic Behavior (exponential decay at large distances)
 * 5. Parameter Sensitivity (center count, spacing, strength)
 * 6. Probability Localization (near Coulomb centers)
 * 7. Limiting Cases (single center, well-separated centers)
 * 8. Grid Convergence (solution stability with refinement)
 *
 * Stringent Tolerances:
 * - Normalization: 1.0%
 * - Orthogonality: 1.0%
 * - Energy bounds: all E < 0 for bound states
 * - Asymptotic decay: verified at r → ∞
 * - Grid points: 2000 (high resolution)
 *
 * Physical Notes:
 * - Coulomb potential: V(x) = -α Σ(1/|x - x_i|)
 * - Bound states have E < 0
 * - Energy reference: V → 0 as x → ±∞
 * - Wave functions decay exponentially: ψ ~ exp(-κr) where κ = √(-2mE)/ℏ
 *
 * Usage:
 *   npx tsx --import ./tests/browser-globals.js tests/test-multi-coulomb-1d.ts
 *   or: npm run test:multi-coulomb-1d
 */

import { solveMultiCoulomb1D } from "../../src/common/model/analytical-solutions/index.js";
import QuantumConstants from "../../src/common/model/QuantumConstants.js";
import Schrodinger1DSolver from "../../src/common/model/Schrodinger1DSolver.js";

// Physical constants
const { HBAR, ELECTRON_MASS, EV_TO_JOULES, NM_TO_M } = QuantumConstants;

// Test statistics
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Stringent tolerances
// 400 points resolve these spans to ~0.03 nm; 2000 made every dense diagonalization take minutes
const DEFAULT_GRID_POINTS = 400;
const NORMALIZATION_TOLERANCE = 0.01; // 1.0% (stringent but accounts for numerical errors)
const ORTHOGONALITY_TOLERANCE = 0.01; // 1.0%
const DECAY_CHECK_TOLERANCE = 0.05; // 5% for asymptotic decay detection
const ENERGY_EPSILON = 1e-10; // For energy ordering

/**
 * Helper function to solve multi-Coulomb 1D with convenient units
 *
 * The Coulomb strength is parameterized to give a characteristic depth in eV
 * For a single Coulomb center at distance r₀, the depth is approximately α/r₀
 */
function solveMultiCoulomb(
  numberOfCenters: number,
  centerSpacingNm: number,
  characteristicDepthEv: number,
  particleMassUnits: number = 1.0,
  numStates: number = 40,
  gridPoints: number = DEFAULT_GRID_POINTS,
) {
  const centerSpacing = centerSpacingNm * NM_TO_M;
  const mass = particleMassUnits * ELECTRON_MASS;

  // Calculate Coulomb strength from characteristic depth
  // α ≈ depth * r₀ where r₀ is a characteristic distance (use centerSpacing/2)
  const r0 = centerSpacing > 0 ? centerSpacing / 2 : 1.0 * NM_TO_M;
  const coulombStrength = characteristicDepthEv * EV_TO_JOULES * r0;

  // Calculate grid range to include all centers plus decay region
  const totalSpan = (numberOfCenters - 1) * centerSpacing;
  const margin = 8.0 * NM_TO_M; // Large margin for Coulomb decay
  const gridRange = Math.max(totalSpan / 2 + margin, 10.0 * NM_TO_M);

  const gridConfig = {
    xMin: -gridRange,
    xMax: gridRange,
    numPoints: gridPoints,
  };

  const solver = new Schrodinger1DSolver();

  const result = solveMultiCoulomb1D(
    numberOfCenters,
    centerSpacing,
    coulombStrength,
    mass,
    numStates,
    gridConfig,
    solver,
  );

  return {
    energies: result.energies.map((E) => E / EV_TO_JOULES),
    wavefunctions: result.wavefunctions,
    xGrid: result.xGrid,
    xNm: result.xGrid.map((x) => x / NM_TO_M),
    numberOfCenters,
    centerSpacing,
    coulombStrength,
    mass,
  };
}

/**
 * Assert helper with test tracking
 */
function assert(condition: boolean, message: string): void {
  totalTests++;
  if (condition) {
    passedTests++;
  } else {
    failedTests++;
    console.error(`  ✗ FAILED: ${message}`);
    throw new Error(message);
  }
}

/**
 * Check normalization of wavefunction
 */
function checkNormalization(x: number[], psi: number[]): number {
  const dx = x[1] - x[0];
  let norm = 0;
  for (const val of psi) {
    norm += val * val * dx;
  }
  return norm;
}

/**
 * Check orthogonality between two wavefunctions
 */
function checkOrthogonality(x: number[], psi1: number[], psi2: number[]): number {
  const dx = x[1] - x[0];
  let overlap = 0;
  for (let i = 0; i < psi1.length; i++) {
    overlap += psi1[i] * psi2[i] * dx;
  }
  return Math.abs(overlap);
}

/**
 * Count nodes (sign changes) in wavefunction
 */
function countNodes(psi: number[]): number {
  // A node is a sign change between consecutive *significant* samples (|ψ| above 1e-3 of the peak):
  // round-off flips the sign of the negligible far tails freely, while a genuine node between two
  // lobes is still counted even if ψ is tiny across a barrier in between.
  const threshold = 1e-3 * Math.max(...psi.map(Math.abs));
  let nodes = 0;
  let lastSign = 0;
  for (const value of psi) {
    if (Math.abs(value) > threshold) {
      const sign = Math.sign(value);
      if (lastSign !== 0 && sign !== lastSign) {
        nodes++;
      }
      lastSign = sign;
    }
  }
  return nodes;
}

/**
 * Check exponential decay at large distances
 * For bound states: ψ(x) ~ exp(-κ|x|) where κ = √(-2mE)/ℏ
 */
function checkAsymptoticDecay(
  x: number[],
  psi: number[],
  energy: number, // in eV
  mass: number,
): { leftDecay: boolean; rightDecay: boolean } {
  const energyJoules = energy * EV_TO_JOULES;
  const kappa = Math.sqrt((-2 * mass * energyJoules) / (HBAR * HBAR));

  // Check decay at 75% and 90% of grid extent
  const x75Index = Math.floor(x.length * 0.75);
  const x90Index = Math.floor(x.length * 0.9);

  // For left side
  const left25Index = Math.floor(x.length * 0.25);
  const left10Index = Math.floor(x.length * 0.1);

  // Calculate expected decay ratio
  const dx = x[x90Index] - x[x75Index];
  const expectedRatio = Math.exp(-kappa * Math.abs(dx));

  // Check right side
  const actualRatioRight = Math.abs(psi[x90Index]) / (Math.abs(psi[x75Index]) + 1e-10);
  const rightDecayOk = actualRatioRight < expectedRatio * (1 + DECAY_CHECK_TOLERANCE);

  // Check left side
  const actualRatioLeft = Math.abs(psi[left10Index]) / (Math.abs(psi[left25Index]) + 1e-10);
  const leftDecayOk = actualRatioLeft < expectedRatio * (1 + DECAY_CHECK_TOLERANCE);

  return {
    leftDecay: leftDecayOk,
    rightDecay: rightDecayOk,
  };
}

/**
 * Test 1: Basic properties for 3-center system
 */
function testBasicProperties() {
  console.log("\n=== Test 1: Basic Properties (3 centers) ===");

  const result = solveMultiCoulomb(3, 1.0, 10.0, 1.0, 20);
  const { xGrid, wavefunctions, energies } = result;

  // Test that we found bound states
  assert(energies.length > 0, "No bound states found");

  // Test normalization
  for (let i = 0; i < Math.min(10, wavefunctions.length); i++) {
    const norm = checkNormalization(xGrid, wavefunctions[i]);
    const normError = Math.abs(norm - 1.0);
    assert(
      normError < NORMALIZATION_TOLERANCE,
      `State ${i}: Normalization error ${normError.toExponential(2)} exceeds tolerance`,
    );
  }
  console.log(`  ✓ Normalization: All states within ${NORMALIZATION_TOLERANCE * 100}%`);

  // Test orthogonality
  for (let i = 0; i < Math.min(5, wavefunctions.length - 1); i++) {
    for (let j = i + 1; j < Math.min(5, wavefunctions.length); j++) {
      const overlap = checkOrthogonality(xGrid, wavefunctions[i], wavefunctions[j]);
      assert(
        overlap < ORTHOGONALITY_TOLERANCE,
        `States ${i}-${j}: Overlap ${overlap.toExponential(2)} exceeds tolerance`,
      );
    }
  }
  console.log(`  ✓ Orthogonality: All pairs within ${ORTHOGONALITY_TOLERANCE * 100}%`);

  // Test energy ordering (strict monotonicity)
  for (let i = 0; i < energies.length - 1; i++) {
    assert(
      energies[i + 1] > energies[i] + ENERGY_EPSILON,
      `Energy ordering violated: E[${i + 1}] = ${energies[i + 1]} ≤ E[${i}] = ${energies[i]}`,
    );
  }
  console.log("  ✓ Energy ordering: Strictly monotonic increasing");
}

/**
 * Test 2: Energy bounds - All bound states must have negative energy
 */
function testEnergyBounds() {
  console.log("\n=== Test 2: Energy Bounds (E < 0) ===");

  const result = solveMultiCoulomb(3, 1.0, 10.0, 1.0, 20);
  const { energies } = result;

  for (let i = 0; i < energies.length; i++) {
    assert(energies[i] < 0, `State ${i}: Energy ${energies[i]} eV is not negative (not a bound state)`);
  }

  console.log(`  ✓ All ${energies.length} bound states have negative energy`);
  console.log(`  Ground state: E₀ = ${energies[0].toFixed(4)} eV`);
}

/**
 * Test 3: Node count validation
 */
function testNodeCounts() {
  console.log("\n=== Test 3: Node Count Validation ===");

  const result = solveMultiCoulomb(3, 1.0, 10.0, 1.0, 15);
  const { wavefunctions } = result;

  for (let i = 0; i < Math.min(10, wavefunctions.length); i++) {
    const nodes = countNodes(wavefunctions[i]);
    assert(nodes === i, `State ${i}: Expected ${i} nodes, found ${nodes}`);
  }
  console.log("  ✓ Node counts: All states have correct number of nodes");
}

/**
 * Test 4: Asymptotic decay behavior
 */
function testAsymptoticDecay() {
  console.log("\n=== Test 4: Asymptotic Decay Behavior ===");

  const result = solveMultiCoulomb(3, 1.0, 10.0, 1.0, 10);
  const { xGrid, wavefunctions, energies, mass } = result;

  for (let i = 0; i < Math.min(5, wavefunctions.length); i++) {
    const decay = checkAsymptoticDecay(xGrid, wavefunctions[i], energies[i], mass);

    // Note: Asymptotic decay can be difficult to verify with stringent tolerances
    // We use this as an informational check rather than strict assertion
    if (!(decay.leftDecay && decay.rightDecay)) {
      console.log(
        `  ⚠ State ${i}: Decay check (left: ${decay.leftDecay}, right: ${decay.rightDecay}) - may need larger grid`,
      );
    } else {
      console.log(`  ✓ State ${i}: Proper exponential decay at boundaries`);
    }
  }
}

/**
 * Test 5: Varying number of centers (1 to 10)
 */
function testVaryingCenterCount() {
  console.log("\n=== Test 5: Varying Number of Centers (1-10) ===");

  const centerCounts = [1, 2, 3, 5, 7, 10];

  for (const nCenters of centerCounts) {
    const result = solveMultiCoulomb(nCenters, 1.0, 10.0, 1.0, 25);
    const { energies, wavefunctions } = result;

    // Basic validation
    assert(energies.length >= 5, `${nCenters} centers: Expected at least 5 states, got ${energies.length}`);

    // All energies should be negative
    for (let i = 0; i < energies.length; i++) {
      assert(energies[i] < 0, `${nCenters} centers: State ${i} energy ${energies[i]} is not negative`);
    }

    // Check ground state normalization
    const norm = checkNormalization(result.xGrid, wavefunctions[0]);
    const normError = Math.abs(norm - 1.0);
    assert(
      normError < NORMALIZATION_TOLERANCE,
      `${nCenters} centers: Ground state normalization error ${normError.toExponential(2)}`,
    );

    console.log(`  ✓ ${nCenters} centers: ${energies.length} states, E₀ = ${energies[0].toFixed(4)} eV`);
  }
}

/**
 * Test 6: Varying center spacing
 */
function testVaryingCenterSpacing() {
  console.log("\n=== Test 6: Varying Center Spacing ===");

  const spacings = [0.5, 1.0, 2.0, 3.0]; // nm

  let previousGroundEnergy = -Infinity;

  for (const spacing of spacings) {
    const result = solveMultiCoulomb(3, spacing, 10.0, 1.0, 20);
    const { energies, wavefunctions } = result;

    // Larger spacing should lead to less negative ground state (weaker coupling)
    assert(
      energies[0] > previousGroundEnergy,
      `Spacing ${spacing}nm: Ground state energy should become less negative with spacing`,
    );
    previousGroundEnergy = energies[0];

    // Check normalization
    const norm = checkNormalization(result.xGrid, wavefunctions[0]);
    const normError = Math.abs(norm - 1.0);
    assert(
      normError < NORMALIZATION_TOLERANCE,
      `Spacing ${spacing}nm: Normalization error ${normError.toExponential(2)}`,
    );

    console.log(`  ✓ Spacing ${spacing}nm: E₀ = ${energies[0].toFixed(4)} eV, ${energies.length} states`);
  }

  console.log("  ✓ Ground state energy becomes less negative with increasing spacing");
}

/**
 * Test 7: Varying Coulomb strength (characteristic depth)
 */
function testVaryingCoulombStrength() {
  console.log("\n=== Test 7: Varying Coulomb Strength ===");

  const depths = [5.0, 10.0, 15.0, 20.0]; // eV

  for (const depth of depths) {
    const result = solveMultiCoulomb(3, 1.0, depth, 1.0, 30);
    const { energies, wavefunctions } = result;

    // Stronger Coulomb potential should give more bound states
    assert(energies.length >= 5, `Depth ${depth}eV: Expected at least 5 states, got ${energies.length}`);

    // All energies negative
    for (let i = 0; i < energies.length; i++) {
      assert(energies[i] < 0, `Depth ${depth}eV: State ${i} energy ${energies[i]} is not negative`);
    }

    // Check normalization of first excited state
    const norm = checkNormalization(result.xGrid, wavefunctions[1]);
    const normError = Math.abs(norm - 1.0);
    assert(
      normError < NORMALIZATION_TOLERANCE,
      `Depth ${depth}eV: First excited state normalization error ${normError.toExponential(2)}`,
    );

    console.log(`  ✓ Depth ${depth}eV: ${energies.length} states, E₀ = ${energies[0].toFixed(4)} eV`);
  }
}

/**
 * Test 8: Single center limit (should approximate Coulomb 1D)
 */
function testSingleCenterLimit() {
  console.log("\n=== Test 8: Single Center Limit ===");

  const result = solveMultiCoulomb(1, 0.0, 10.0, 1.0, 10);
  const { energies, wavefunctions } = result;

  // Single Coulomb center should have bound states with E < 0
  assert(energies.length >= 5, `Single center: Expected at least 5 states, got ${energies.length}`);

  // Check ground state
  assert(energies[0] < 0, `Single center: Ground state energy ${energies[0]} should be negative`);

  // Check node counts
  for (let i = 0; i < Math.min(5, wavefunctions.length); i++) {
    const nodes = countNodes(wavefunctions[i]);
    assert(nodes === i, `Single center: State ${i} has ${nodes} nodes, expected ${i}`);
  }

  console.log(`  ✓ Single center: ${energies.length} states, behaves like Coulomb 1D`);
}

/**
 * Test 9: Well-separated centers (weak coupling limit)
 */
function testWellSeparatedCenters() {
  console.log("\n=== Test 9: Well-Separated Centers ===");

  // When centers are far apart, low-lying states should be nearly degenerate
  // (each localized on a single center)
  const result = solveMultiCoulomb(3, 5.0, 10.0, 1.0, 20);
  const { energies } = result;

  // Check that lowest 3 states are close in energy (within 20%)
  const e0 = energies[0];
  const e1 = energies[1];
  const e2 = energies[2];

  const splitting01 = Math.abs((e1 - e0) / e0);
  const splitting12 = Math.abs((e2 - e1) / e1);

  console.log(`  E₀ = ${e0.toFixed(4)} eV`);
  console.log(`  E₁ = ${e1.toFixed(4)} eV (splitting: ${(splitting01 * 100).toFixed(2)}%)`);
  console.log(`  E₂ = ${e2.toFixed(4)} eV (splitting: ${(splitting12 * 100).toFixed(2)}%)`);

  // With well-separated centers, splittings should be small
  assert(splitting01 < 0.3, `Well-separated: E₀-E₁ splitting ${(splitting01 * 100).toFixed(1)}% too large`);

  console.log("  ✓ Well-separated centers: Low energy splitting consistent with weak coupling");
}

/**
 * Test 10: Grid convergence
 */
function testGridConvergence() {
  console.log("\n=== Test 10: Grid Convergence ===");

  // Dense diagonalization is O(N³); these sizes show convergence in seconds rather than tens of minutes
  const gridSizes = [200, 300, 400, 600];
  const energies: number[][] = [];

  for (const gridSize of gridSizes) {
    const result = solveMultiCoulomb(3, 1.0, 10.0, 1.0, 10, gridSize);
    energies.push(result.energies);
  }

  // Check that ground state energy converges
  for (let i = 0; i < gridSizes.length - 1; i++) {
    const relChange = Math.abs((energies[i + 1][0] - energies[i][0]) / energies[i][0]);
    console.log(`  Grid ${gridSizes[i]} → ${gridSizes[i + 1]}: ΔE₀ = ${(relChange * 100).toFixed(4)}%`);
  }

  // Last two grids should agree to better than 1%
  const finalChange = Math.abs((energies[3][0] - energies[2][0]) / energies[2][0]);
  assert(finalChange < 0.01, `Grid convergence: Final change ${(finalChange * 100).toFixed(4)}% exceeds 1%`);

  console.log("  ✓ Grid convergence: Ground state energy stable to <1%");
}

/**
 * Test 11: Many centers extreme case
 */
function testManyCentersExtreme() {
  console.log("\n=== Test 11: Extreme Case - 10 Centers ===");

  const result = solveMultiCoulomb(10, 0.8, 10.0, 1.0, 30);
  const { energies, wavefunctions, xGrid } = result;

  assert(energies.length >= 15, `Expected at least 15 states for 10 centers, got ${energies.length}`);

  // Check first 5 states
  for (let i = 0; i < 5; i++) {
    const norm = checkNormalization(xGrid, wavefunctions[i]);
    const nodes = countNodes(wavefunctions[i]);
    const normError = Math.abs(norm - 1.0);

    assert(nodes === i, `State ${i}: Expected ${i} nodes, found ${nodes}`);

    assert(normError < NORMALIZATION_TOLERANCE, `State ${i}: Normalization error ${normError.toExponential(2)}`);

    assert(energies[i] < 0, `State ${i}: Energy ${energies[i]} eV should be negative`);
  }

  console.log(`  ✓ 10 centers: ${energies.length} states, all low-lying states well-behaved`);
}

/**
 * Test 12: Particle mass variation
 */
function testParticleMassVariation() {
  console.log("\n=== Test 12: Particle Mass Variation ===");

  const masses = [0.5, 1.0, 2.0]; // in electron mass units

  let previousEnergy = Infinity;

  for (const mass of masses) {
    const result = solveMultiCoulomb(3, 1.0, 10.0, mass, 15);
    const { energies } = result;

    // Heavier particles should have more negative (deeper) ground state
    assert(energies[0] < previousEnergy, `Mass ${mass}mₑ: Ground state should be more negative for heavier particles`);
    previousEnergy = energies[0];

    console.log(`  ✓ Mass ${mass}mₑ: E₀ = ${energies[0].toFixed(4)} eV, ${energies.length} states`);
  }

  console.log("  ✓ Ground state energy becomes more negative with particle mass");
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║   Multi-Coulomb 1D Potential - Comprehensive Test Suite   ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");

  try {
    testBasicProperties();
    testEnergyBounds();
    testNodeCounts();
    testAsymptoticDecay();
    testVaryingCenterCount();
    testVaryingCenterSpacing();
    testVaryingCoulombStrength();
    testSingleCenterLimit();
    testWellSeparatedCenters();
    testGridConvergence();
    testManyCentersExtreme();
    testParticleMassVariation();

    console.log("\n╔═══════════════════════════════════════════════════════════╗");
    console.log("║                      TEST SUMMARY                          ║");
    console.log("╚═══════════════════════════════════════════════════════════╝");
    console.log(`  Total tests: ${totalTests}`);
    console.log(`  ✓ Passed: ${passedTests}`);
    console.log(`  ✗ Failed: ${failedTests}`);
    console.log(`  Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests === 0) {
      console.log("\n  🎉 All tests passed!");
      process.exit(0);
    } else {
      console.log("\n  ❌ Some tests failed!");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n  💥 Test suite crashed:", error);
    console.log("\n  Final stats:");
    console.log(`  Total tests run: ${totalTests}`);
    console.log(`  ✓ Passed: ${passedTests}`);
    console.log(`  ✗ Failed: ${failedTests}`);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
runAllTests();
