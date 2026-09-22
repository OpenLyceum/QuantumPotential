# Comprehensive Accuracy Tests for Numerical Quantum Solvers

This document describes the comprehensive accuracy validation tests for all numerical methods used in the QPPW quantum physics simulation: **DVR**, **Spectral**, **Matrix Numerov**, **FGH**, **Shooting Numerov**, and **QuantumBound**.

## Overview

The accuracy tests verify that all numerical methods produce results within acceptable error tolerances when compared to known analytical solutions or reference implementations. Tests also measure and report execution times for performance comparison.

## Test Coverage

The comprehensive test suite validates methods across:

- **Multiple potential types**: Harmonic oscillator, finite square wells, 3D Coulomb, Morse potential, Pöschl-Teller potential, double wells
- **Various grid sizes**: 32, 64, 128 points (all powers of 2)
- **Different parameters**: Well depths, widths, barrier heights
- **Performance metrics**: Execution time, average/min/max timing per method

## Test Cases

### 1. Harmonic Oscillator

The quantum harmonic oscillator has an exact analytical solution:

```
E_n = ℏω(n + 1/2)
```

where:

- `n` = quantum number (0, 1, 2, ...)
- `ℏ` = reduced Planck constant (1.054571817 × 10⁻³⁴ J·s)
- `ω` = angular frequency

**Test Parameters:**

- Mass: Electron mass (9.109 × 10⁻³¹ kg)
- Angular frequency: 10¹⁵ rad/s
- Grid sizes: **32, 64, 128 points** (powers of 2)
- Grid range: -5 nm to +5 nm
- States tested: 10 states (n = 0, 1, 2, ..., 9)
- Methods tested: DVR, Spectral, Matrix Numerov, FGH, Shooting Numerov, QuantumBound
- Error tolerance: **0.1%** (extremely high accuracy for smooth potentials)

### 2. Finite Square Wells

Multiple configurations test various well depths and widths:

**Configurations:**

1. Shallow well: 1 nm width, 10 eV depth
2. Deep well: 1 nm width, 50 eV depth
3. Wide shallow: 2 nm width, 10 eV depth
4. Narrow medium: 0.5 nm width, 30 eV depth

**Test Parameters:**

- Mass: Electron mass
- Grid sizes: **32, 64, 128 points** (powers of 2)
- Grid range: -2L to +2L (where L = well width)
- States tested: Bound states
- Methods tested: DVR, Spectral, Matrix Numerov, FGH, Shooting Numerov, QuantumBound
- Error tolerance: **0.5%** (stringent despite discontinuous potential)

### 3. 3D Coulomb Potential (Hydrogen Atom, L=0)

Tests the radial Schrödinger equation for s-waves:

```
E_n = -mα²/(2ℏ²n²)
```

where α = e²/(4πε₀) is the Coulomb strength.

**Test Parameters:**

- Mass: Electron mass
- Coulomb strength: e²/(4πε₀) = 2.307 × 10⁻²⁸ J·m
- Grid sizes: **32, 64, 128 points** (powers of 2)
- Grid range: 1 pm to 10 nm (r > 0)
- States tested: First few states
- Methods tested: DVR, Spectral, Matrix Numerov, FGH, Shooting Numerov, QuantumBound
- Error tolerance: **1.0%** (stringent even for singular potential)

### 4. Morse Potential

Tests vibrational energy levels in anharmonic molecular potentials:

**Test Parameters:**

- Mass: Electron mass (or reduced mass for realistic molecules)
- Dissociation energy: Realistic molecular values
- Well width: Typical molecular bond length scale (~10⁻¹⁰ m)
- Grid sizes: **32, 64, 128 points** (powers of 2)
- States tested: Vibrational states
- Methods tested: DVR, Spectral, Matrix Numerov, FGH, Shooting Numerov, QuantumBound
- Error tolerance: **1.0%** (anharmonic potential with exact solution)

### 5. Pöschl-Teller Potential

Tests bound states in hyperbolic potential wells:

**Test Parameters:**

- Mass: Electron mass
- Potential depth: Various values
- Well width: ~10⁻¹⁰ m
- Grid sizes: **32, 64, 128 points** (powers of 2)
- States tested: Bound states
- Methods tested: DVR, Spectral, Matrix Numerov, FGH, Shooting Numerov, QuantumBound
- Error tolerance: **1.0%** (hyperbolic potential with exact solution)

### 6. Double Square Wells

Tests symmetric double wells with central barrier (has analytical solution):

**Configurations:**

1. Low barrier: 0.5 nm wells, 0.3 nm barrier, 30 eV depth, 10 eV barrier
2. Medium barrier: 0.5 nm wells, 0.5 nm barrier, 40 eV depth, 20 eV barrier
3. Wide wells: 0.6 nm wells, 0.4 nm barrier, 35 eV depth, 5 eV barrier

**Test Parameters:**

- Mass: Electron mass
- Grid sizes: **32, 64, 128 points** (powers of 2)
- States tested: Energy level pairs (even and odd parity states)
- Methods tested: DVR, Spectral, Matrix Numerov, FGH, Shooting Numerov, QuantumBound (compared to analytical solution or DVR reference)
- Error tolerance: **1.0%** (stringent inter-method agreement required)

## Running the Tests

### Option 1: Browser-based Testing (Recommended)

1. Build the project:

   ```bash
   npm run build
   ```

2. Open `../accuracy-tests.html` in a web browser

3. Click "Run Full Tests" to run all tests or "Run Quick Check" for a fast validation

The results will be displayed in the browser console with color-coded pass/fail indicators.

### Option 2: Command-Line Testing (Recommended)

Run tests directly from the command line using npm:

```bash
npm test
```

This outputs results to the terminal with full details including timing information, performance summary, and pass/fail status for all tests.

### Option 3: Development Server

1. Start the development server:

   ```bash
   npm start
   ```

2. Open the browser console and run:

   ```javascript
   // Full comprehensive test suite
   import("./common/model/AccuracyTests.js").then((m) => m.runAccuracyTests());

   // Quick validation check
   import("./common/model/AccuracyTests.js").then((m) =>
     m.runQuickAccuracyCheck(),
   );
   ```

## Success Criteria

Each test is considered **PASSED** if the numerical result is within the stringent tolerance for that potential type. All tolerances are **≤ 1%**, with most tests requiring much better accuracy:

**Tolerance Levels (Maximum Allowed Error):**

- Harmonic Oscillator: **0.1%** - Extremely high accuracy required for smooth potentials
- Finite Square Wells: **0.5%** - High accuracy despite discontinuities
- 3D Coulomb Potential: **1.0%** - Maximum 1% error even with singularity
- Double Square Wells: **1.0%** - Maximum 1% inter-method agreement required

**Examples:**

For harmonic oscillator (0.1% tolerance) with analytical ground state energy of 0.412967 eV:

- ✓ Numerical result of 0.412900 eV is acceptable (0.016% error < 0.1%)
- ✓ Numerical result of 0.412550 eV is acceptable (0.101% error ≈ 0.1%)
- ✗ Numerical result of 0.412000 eV would fail (0.234% error > 0.1%)

For finite square well (0.5% tolerance) with analytical energy of 10.000 eV:

- ✓ Numerical result of 9.980 eV is acceptable (0.20% error < 0.5%)
- ✓ Numerical result of 9.950 eV is acceptable (0.50% error = 0.5%)
- ✗ Numerical result of 9.900 eV would fail (1.00% error > 0.5%)

## Test Output

The test output includes detailed information for each test and performance metrics:

1. **Individual test results** for each method and potential:
   - Test name (e.g., "DVR - Harmonic Oscillator (N=150)")
   - Pass/fail status
   - Maximum error percentage
   - **Execution time in milliseconds**
   - Detailed energy level comparisons

2. **Performance summary**:
   - Average, min, max, and total execution times per method
   - Allows performance comparison across methods

3. **Overall summary statistics**:
   - Total tests run
   - Number passed
   - Number failed
   - Overall pass/fail status

### Example Output

```
========================================
Comprehensive Numerical Method Tests
========================================
Testing: DVR, Spectral, Matrix Numerov, and FGH
Across multiple potentials and grid sizes

=== DVR - Harmonic Oscillator (N=150) ===
Status: ✓ PASSED
Maximum error: 0.0234%

Testing 5 energy levels with 150 grid points:
Execution time: 12.45 ms
  E_0: ✓ Num: 0.412967 eV, Ana: 0.412967 eV, Err: 0.0001%
  E_1: ✓ Num: 1.238902 eV, Ana: 1.238902 eV, Err: 0.0002%
  E_2: ✓ Num: 2.064836 eV, Ana: 2.064837 eV, Err: 0.0003%
  E_3: ✓ Num: 2.890771 eV, Ana: 2.890771 eV, Err: 0.0004%
  E_4: ✓ Num: 3.716705 eV, Ana: 3.716706 eV, Err: 0.0005%

...

========================================
Test Summary
========================================
Total tests: 62
Passed: 62
Failed: 0

--- Performance Summary ---
DVR:
  Average: 15.34 ms | Min: 8.21 ms | Max: 45.67 ms | Total: 245.44 ms
MatrixNumerov:
  Average: 12.89 ms | Min: 7.45 ms | Max: 38.23 ms | Total: 206.24 ms
Spectral:
  Average: 18.76 ms | Min: 10.34 ms | Max: 52.11 ms | Total: 300.16 ms
FGH:
  Average: 22.14 ms | Min: 11.56 ms | Max: 68.92 ms | Total: 354.24 ms

✓ All tests passed!
All numerical methods produce consistent results across different potentials and grid sizes.
========================================
```

## Implementation Details

### Test File Location

- **Source:** `src/common/model/AccuracyTests.ts`
- **Compiled:** `dist/common/model/AccuracyTests.js`
- **Test Runner:** `../accuracy-tests.html`

### Methods Tested

1. **DVR (Discrete Variable Representation)**
   - File: `src/common/model/DVRSolver.ts`
   - Uses Colbert-Miller formula for kinetic energy
   - Matrix diagonalization approach
   - Generally fast and accurate

2. **Spectral (Chebyshev)**
   - File: `src/common/model/SpectralSolver.ts`
   - Uses Chebyshev polynomial expansion
   - Provides spectral (exponential) convergence
   - Excellent for smooth potentials

3. **Matrix Numerov**
   - File: `src/common/model/MatrixNumerovSolver.ts`
   - Matrix formulation of Numerov method
   - Fourth-order accurate
   - Often fastest for moderate grid sizes

4. **FGH (Fourier Grid Hamiltonian)**
   - File: `src/common/model/FGHSolver.ts`
   - Uses Fast Fourier Transform (FFT)
   - Requires power-of-2 grid points
   - Good for periodic or extended systems

### Analytical Solutions

The analytical solutions are implemented in:

- `src/common/model/analytical-solutions/harmonic-oscillator.ts`
- `src/common/model/analytical-solutions/infinite-square-well.ts`
- `src/common/model/analytical-solutions/finite-square-well.ts`
- `src/common/model/analytical-solutions/coulomb-3d-potential.ts`

## Troubleshooting

### Tests Fail to Run

1. Ensure the project is built: `npm run build`
2. Check that all dependencies are installed: `npm install`
3. Verify TypeScript compilation succeeds: `npm run check`

### Tests Show High Error

If tests show errors exceeding 1%:

1. **Check grid resolution:** Increase `numPoints` in grid configuration
2. **Check grid extent:** Ensure grid covers the region where wavefunction is significant
3. **Check potential definition:** Verify potential function is correctly implemented
4. **Check numerical precision:** Ensure calculations use sufficient precision

### Browser Console Errors

If the browser shows module loading errors:

1. Rebuild the project: `npm run build`
2. Clear browser cache
3. Check browser console for specific error messages

## Adding New Tests

To add new test cases:

1. Add a new test function in `AccuracyTests.ts`:

   ```typescript
   function testDVRNewPotential(): TestResult {
     // Implementation
   }
   ```

2. Call it from `runAccuracyTests()`:

   ```typescript
   results.push(testDVRNewPotential());
   ```

3. Ensure an analytical solution exists in `analytical-solutions/`

4. Rebuild and run tests to verify

## References

- **DVR Method:** Colbert & Miller, J. Chem. Phys. 96, 1982 (1992)
- **Spectral Method:** Boyd, "Chebyshev and Fourier Spectral Methods", 2nd ed. (2001)
- **Quantum Mechanics:** Griffiths, "Introduction to Quantum Mechanics", 3rd ed.

## License

MIT License - Same as the main QPPW project
