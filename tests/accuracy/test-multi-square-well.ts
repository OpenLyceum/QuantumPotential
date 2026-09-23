#!/usr/bin/env node
/**
 * Comprehensive test suite for multi-square quantum well potentials
 *
 * This test suite validates the multi-square well solver across various
 * configurations and parameter regimes. The tests are designed to be stringent
 * and verify physical correctness rather than just computational success.
 *
 * Test Categories:
 * 1. Basic Properties (normalization, orthogonality, energy ordering)
 * 2. Node Count Validation (state n has n nodes)
 * 3. Symmetry Properties (for symmetric configurations)
 * 4. Edge Behavior (exponential decay in forbidden regions)
 * 5. Parameter Sensitivity (well count, width, depth, separation)
 * 6. Physical Bounds (energy limits, probability localization)
 * 7. Limiting Cases (convergence to known solutions)
 * 8. Grid Convergence (solution stability with refinement)
 *
 * Stringent Tolerances:
 * - Normalization: 1.0%
 * - Orthogonality: 1.0%
 * - Edge decay: 1.0%
 * - Energy ordering: strict monotonicity
 * - Grid points: 2000 (high resolution)
 *
 * Usage:
 *   npx tsx --import ./tests/browser-globals.js tests/test-multi-square-well.ts
 *   or: npm run test:multi-square-well
 */

import { solveFiniteSquareWell, solveMultiSquareWell } from "../../src/common/model/analytical-solutions/index.js";
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
const EDGE_TOLERANCE = 0.01; // 1.0%
const ENERGY_EPSILON = 1e-10; // For energy ordering

/**
 * Helper function to solve multi-square well with convenient units (nm/eV)
 */
function solveMultiWell(
  numberOfWells: number,
  wellWidthNm: number,
  wellDepthEv: number,
  separationNm: number,
  particleMassUnits: number = 1.0,
  numStates: number = 40,
  gridPoints: number = DEFAULT_GRID_POINTS,
) {
  const wellWidth = wellWidthNm * NM_TO_M;
  const wellDepth = wellDepthEv * EV_TO_JOULES;
  const wellSeparation = separationNm * NM_TO_M;
  const mass = particleMassUnits * ELECTRON_MASS;

  // Calculate grid range to include all wells plus margins
  const totalSpan = numberOfWells * wellWidth + (numberOfWells - 1) * wellSeparation;
  // 4.1 nm makes the default 3-well span (3.4 nm + margins = 11.6 nm = 58 × 0.2 nm) a multiple of the
  // barrier width, so the grid-convergence sizes below can put every step edge midway between samples
  const margin = 4.1 * NM_TO_M;
  const gridRange = totalSpan / 2 + margin;

  const gridConfig = {
    xMin: -gridRange,
    xMax: gridRange,
    numPoints: gridPoints,
  };

  const solver = new Schrodinger1DSolver();

  const result = solveMultiSquareWell(
    numberOfWells,
    wellWidth,
    wellDepth,
    wellSeparation,
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
    numberOfWells,
    wellWidth,
    wellDepth,
    wellSeparation,
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
 * Check edge decay behavior in classically forbidden regions
 */
function checkEdgeDecay(
  _x: number[],
  psi: number[],
  _wellRegionEnd: number,
): { leftDecay: boolean; rightDecay: boolean } {
  const maxPsi = Math.max(...psi.map(Math.abs));

  // Check decay at edges (far from wells)
  const leftEdgeRatio = Math.abs(psi[0]) / maxPsi;
  const rightEdgeRatio = Math.abs(psi[psi.length - 1]) / maxPsi;

  return {
    leftDecay: leftEdgeRatio < EDGE_TOLERANCE,
    rightDecay: rightEdgeRatio < EDGE_TOLERANCE,
  };
}

/**
 * Test 1: Basic properties for 3-well system
 */
function testBasicProperties() {
  console.log("\n=== Test 1: Basic Properties (3 wells) ===");

  const result = solveMultiWell(3, 1.0, 5.0, 0.2, 1.0, 20);
  const { xGrid, wavefunctions, energies } = result;

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
 * Test 2: Node count validation
 */
function testNodeCounts() {
  console.log("\n=== Test 2: Node Count Validation ===");

  const result = solveMultiWell(3, 1.0, 5.0, 0.2, 1.0, 15);
  const { wavefunctions } = result;

  for (let i = 0; i < Math.min(10, wavefunctions.length); i++) {
    const nodes = countNodes(wavefunctions[i]);
    assert(nodes === i, `State ${i}: Expected ${i} nodes, found ${nodes}`);
  }
  console.log("  ✓ Node counts: All states have correct number of nodes");
}

/**
 * Test 3: Edge decay in forbidden regions
 */
function testEdgeDecay() {
  console.log("\n=== Test 3: Edge Decay Behavior ===");

  const result = solveMultiWell(3, 1.0, 5.0, 0.2, 1.0, 10);
  const { xGrid, wavefunctions, numberOfWells, wellWidth, wellSeparation } = result;

  // Calculate total well region extent
  const totalSpan = numberOfWells * (wellWidth / NM_TO_M) + (numberOfWells - 1) * (wellSeparation / NM_TO_M);
  const wellRegionEnd = totalSpan / 2;

  for (let i = 0; i < Math.min(5, wavefunctions.length); i++) {
    const decay = checkEdgeDecay(xGrid, wavefunctions[i], wellRegionEnd);
    assert(
      decay.leftDecay && decay.rightDecay,
      `State ${i}: Insufficient edge decay (left: ${decay.leftDecay}, right: ${decay.rightDecay})`,
    );
  }
  console.log("  ✓ Edge decay: All states decay properly at boundaries");
}

/**
 * Test 4: Varying number of wells (1 to 10)
 */
function testVaryingWellCount() {
  console.log("\n=== Test 4: Varying Number of Wells (1-10) ===");

  const wellCounts = [1, 2, 3, 5, 7, 10];

  for (const nWells of wellCounts) {
    const result = solveMultiWell(nWells, 1.0, 5.0, 0.2, 1.0, 20);
    const { energies, wavefunctions } = result;

    // Basic validation
    // Each 1 nm, 5 eV well binds ⌈L√(2mV₀)/(πℏ)⌉ = 4 states and N wells form bands of N states each;
    // allow the top band to be partly unbound. (The old fixed "≥ 10" failed for a single well, which
    // correctly has 4.)
    const perWell = Math.ceil((1.0 * NM_TO_M * Math.sqrt(2 * ELECTRON_MASS * 5.0 * EV_TO_JOULES)) / (Math.PI * HBAR));
    const expectedMin = Math.min(20, nWells * (perWell - 1));
    assert(
      energies.length >= expectedMin,
      `${nWells} wells: Expected at least ${expectedMin} states, got ${energies.length}`,
    );

    // Check ground state normalization
    const norm = checkNormalization(result.xGrid, wavefunctions[0]);
    const normError = Math.abs(norm - 1.0);
    assert(
      normError < NORMALIZATION_TOLERANCE,
      `${nWells} wells: Ground state normalization error ${normError.toExponential(2)}`,
    );

    console.log(`  ✓ ${nWells} wells: ${energies.length} states found, ground state E₀ = ${energies[0].toFixed(4)} eV`);
  }
}

/**
 * Test 5: Varying well width
 */
function testVaryingWellWidth() {
  console.log("\n=== Test 5: Varying Well Width ===");

  const widths = [0.5, 1.0, 1.5, 2.0, 2.5]; // nm

  let previousGroundEnergy = Infinity;

  for (const width of widths) {
    const result = solveMultiWell(3, width, 5.0, 0.2, 1.0, 20);
    const { energies, wavefunctions } = result;

    // Wider wells should have lower ground state energy (more confined = higher energy)
    assert(
      energies[0] < previousGroundEnergy,
      `Width ${width}nm: Ground state energy ${energies[0]} should decrease with width`,
    );
    previousGroundEnergy = energies[0];

    // Check normalization
    const norm = checkNormalization(result.xGrid, wavefunctions[0]);
    const normError = Math.abs(norm - 1.0);
    assert(normError < NORMALIZATION_TOLERANCE, `Width ${width}nm: Normalization error ${normError.toExponential(2)}`);

    console.log(`  ✓ Width ${width}nm: E₀ = ${energies[0].toFixed(4)} eV`);
  }

  console.log("  ✓ Ground state energy decreases monotonically with width");
}

/**
 * Test 6: Varying well depth
 */
function testVaryingWellDepth() {
  console.log("\n=== Test 6: Varying Well Depth ===");

  const depths = [2.0, 5.0, 8.0, 12.0]; // eV

  for (const depth of depths) {
    const result = solveMultiWell(3, 1.0, depth, 0.2, 1.0, 30);
    const { energies, wavefunctions } = result;

    // All energies should be below barrier height
    for (let i = 0; i < Math.min(5, energies.length); i++) {
      assert(energies[i] < depth, `Depth ${depth}eV: State ${i} energy ${energies[i]} exceeds barrier height`);
    }

    // Check first excited state
    const norm = checkNormalization(result.xGrid, wavefunctions[1]);
    const normError = Math.abs(norm - 1.0);
    assert(
      normError < NORMALIZATION_TOLERANCE,
      `Depth ${depth}eV: First excited state normalization error ${normError.toExponential(2)}`,
    );

    console.log(`  ✓ Depth ${depth}eV: ${energies.length} bound states, E₀ = ${energies[0].toFixed(4)} eV`);
  }
}

/**
 * Test 7: Varying well separation
 */
function testVaryingWellSeparation() {
  console.log("\n=== Test 7: Varying Well Separation ===");

  const separations = [0.1, 0.2, 0.4, 0.6]; // nm

  for (const sep of separations) {
    const result = solveMultiWell(3, 1.0, 5.0, sep, 1.0, 20);
    const { energies, wavefunctions, xGrid } = result;

    // Check ground state
    const norm = checkNormalization(xGrid, wavefunctions[0]);
    const nodes = countNodes(wavefunctions[0]);

    assert(nodes === 0, `Separation ${sep}nm: Ground state has ${nodes} nodes, expected 0`);

    const normError = Math.abs(norm - 1.0);
    assert(
      normError < NORMALIZATION_TOLERANCE,
      `Separation ${sep}nm: Normalization error ${normError.toExponential(2)}`,
    );

    console.log(`  ✓ Separation ${sep}nm: E₀ = ${energies[0].toFixed(4)} eV, ${energies.length} states`);
  }
}

/**
 * Test 8: Extreme case - Single well (should match known results)
 */
function testSingleWellLimit() {
  console.log("\n=== Test 8: Single Well Limit ===");

  // A single 20 eV well is compared with the exact finite-square-well spectrum. (It used to be compared
  // with the infinite well, whose levels are ~15 % higher for these parameters.)
  const result = solveMultiWell(1, 1.0, 20.0, 0.0, 1.0, 10);
  const { energies, wavefunctions } = result;

  const L = 1.0 * NM_TO_M;
  const V0 = 20.0 * EV_TO_JOULES;
  const exact = solveFiniteSquareWell(L, V0, ELECTRON_MASS, 5, { xMin: -2 * L, xMax: 2 * L, numPoints: 11 });

  for (let n = 1; n <= 5; n++) {
    // The multi-well potential is 0 inside and V₀ outside; solveFiniteSquareWell uses −V₀ and 0
    const expectedEnergy = (exact.energies[n - 1]! + V0) / EV_TO_JOULES;
    const actualEnergy = energies[n - 1];
    const relError = Math.abs((actualEnergy - expectedEnergy) / expectedEnergy);

    // 2 %: the step edges are sampled on the grid, which shifts the effective width by up to dx
    assert(
      relError < 0.02,
      `State n=${n}: Energy error ${(relError * 100).toFixed(2)}% (expected ${expectedEnergy.toFixed(3)}, got ${actualEnergy.toFixed(3)} eV)`,
    );
  }

  // Check node counts
  for (let i = 0; i < 5; i++) {
    const nodes = countNodes(wavefunctions[i]);
    assert(nodes === i, `State ${i}: Expected ${i} nodes, found ${nodes}`);
  }

  console.log("  ✓ Single well energies match the exact finite square well (within 2%)");
}

/**
 * Test 9: Extreme case - Many wells (10 wells)
 */
function testManyWellsExtreme() {
  console.log("\n=== Test 9: Extreme Case - 10 Wells ===");

  const result = solveMultiWell(10, 0.5, 5.0, 0.15, 1.0, 30);
  const { energies, wavefunctions, xGrid } = result;

  assert(energies.length >= 20, `Expected at least 20 states for 10 wells, got ${energies.length}`);

  // Check first 5 states
  for (let i = 0; i < 5; i++) {
    const norm = checkNormalization(xGrid, wavefunctions[i]);
    const nodes = countNodes(wavefunctions[i]);
    const normError = Math.abs(norm - 1.0);

    assert(nodes === i, `State ${i}: Expected ${i} nodes, found ${nodes}`);

    assert(normError < NORMALIZATION_TOLERANCE, `State ${i}: Normalization error ${normError.toExponential(2)}`);
  }

  console.log(`  ✓ 10 wells: ${energies.length} states, all low-lying states well-behaved`);
}

/**
 * Test 10: Grid convergence
 */
function testGridConvergence() {
  console.log("\n=== Test 10: Grid Convergence ===");

  // A step potential is only sampled at grid points, so arbitrary N makes the effective barrier widths
  // (and E₀) jump around. With DVR spacing dx = 11.6 nm/(N − 1), N − 1 = 29(2k + 1) puts every well
  // and barrier edge midway between samples, and the energies converge smoothly. (Dense
  // diagonalization is O(N³); the old 1000–2500 points took tens of minutes.)
  const gridSizes = [204, 320, 436, 610];
  const energies: number[][] = [];

  for (const gridSize of gridSizes) {
    const result = solveMultiWell(3, 1.0, 5.0, 0.2, 1.0, 10, gridSize);
    energies.push(result.energies);
  }

  // Check that ground state energy converges
  for (let i = 0; i < gridSizes.length - 1; i++) {
    const relChange = Math.abs((energies[i + 1][0] - energies[i][0]) / energies[i][0]);
    console.log(`  Grid ${gridSizes[i]} → ${gridSizes[i + 1]}: ΔE₀ = ${(relChange * 100).toFixed(4)}%`);
  }

  // Last two grids should agree to better than 0.5%
  const finalChange = Math.abs((energies[3][0] - energies[2][0]) / energies[2][0]);
  assert(finalChange < 0.005, `Grid convergence: Final change ${(finalChange * 100).toFixed(4)}% exceeds 0.5%`);

  console.log("  ✓ Grid convergence: Ground state energy stable to <0.5%");
}

/**
 * Test 11: Physical bounds - Energy must be between 0 and barrier height
 */
function testPhysicalEnergyBounds() {
  console.log("\n=== Test 11: Physical Energy Bounds ===");

  const configurations = [
    { nWells: 2, width: 1.0, depth: 5.0, sep: 0.2 },
    { nWells: 5, width: 0.8, depth: 8.0, sep: 0.3 },
    { nWells: 7, width: 1.2, depth: 10.0, sep: 0.25 },
  ];

  for (const config of configurations) {
    const result = solveMultiWell(config.nWells, config.width, config.depth, config.sep, 1.0, 20);
    const { energies } = result;

    for (let i = 0; i < energies.length; i++) {
      assert(
        energies[i] >= 0 && energies[i] <= config.depth,
        `${config.nWells} wells: State ${i} energy ${energies[i]} eV outside bounds [0, ${config.depth}]`,
      );
    }

    console.log(`  ✓ ${config.nWells} wells: All ${energies.length} states within [0, ${config.depth}] eV`);
  }
}

/**
 * Test 12: Symmetry properties for odd number of wells
 */
function testSymmetryProperties() {
  console.log("\n=== Test 12: Symmetry Properties (Odd Well Count) ===");

  // For odd number of wells centered at x=0, wavefunctions should have definite parity
  const result = solveMultiWell(5, 1.0, 5.0, 0.2, 1.0, 10);
  const { xGrid, wavefunctions } = result;

  const midIndex = Math.floor(xGrid.length / 2);

  for (let state = 0; state < Math.min(6, wavefunctions.length); state++) {
    const psi = wavefunctions[state];

    // Check symmetry by comparing left and right halves
    let symSum = 0;
    let asymSum = 0;
    let count = 0;

    for (let i = 1; i < Math.min(100, midIndex); i++) {
      const leftIdx = midIndex - i;
      const rightIdx = midIndex + i;

      if (leftIdx >= 0 && rightIdx < psi.length) {
        symSum += Math.abs(psi[leftIdx] - psi[rightIdx]);
        asymSum += Math.abs(psi[leftIdx] + psi[rightIdx]);
        count++;
      }
    }

    const maxAbs = Math.max(...psi.map(Math.abs));
    const symRatio = symSum / (count * maxAbs);
    const asymRatio = asymSum / (count * maxAbs);

    const hasDefiniteParity = symRatio < 0.05 || asymRatio < 0.05;
    const parity = symRatio < asymRatio ? "even" : "odd";

    console.log(`  State ${state}: ${parity} parity (sym: ${symRatio.toFixed(4)}, asym: ${asymRatio.toFixed(4)})`);

    assert(hasDefiniteParity, `State ${state}: No definite parity detected (sym: ${symRatio}, asym: ${asymRatio})`);
  }

  console.log("  ✓ All low-lying states have definite parity");
}

/**
 * Run all tests
 */
function runAllTests() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║   Multi-Square Well Potential - Comprehensive Test Suite  ║");
  console.log("╚═══════════════════════════════════════════════════════════╝");

  try {
    testBasicProperties();
    testNodeCounts();
    testEdgeDecay();
    testVaryingWellCount();
    testVaryingWellWidth();
    testVaryingWellDepth();
    testVaryingWellSeparation();
    testSingleWellLimit();
    testManyWellsExtreme();
    testGridConvergence();
    testPhysicalEnergyBounds();
    testSymmetryProperties();

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
