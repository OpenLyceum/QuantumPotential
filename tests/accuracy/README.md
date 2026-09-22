# Tests Directory

This directory contains comprehensive test suites for the QPPW quantum physics simulation.

## Structure

The test directory contains only essential files:

- **AccuracyTests.ts** - Comprehensive accuracy test suite in `src/common/model/`
- **test-double-well.ts** - Comprehensive double well test suite with stringent validation
- **accuracy-tests.html** - Browser-based test runner with visual interface
- **run-terminal-tests.js** - Terminal-based test runner (used by `npm run test:accuracy`)
- **verify-coulomb.ts** - Coulomb potential verification tests
- **browser-globals.js** - Browser environment setup for testing
- **doc/** - Test documentation

## Test Coverage

The comprehensive test suite (`AccuracyTests.ts`) validates all numerical methods (DVR, Spectral, Matrix Numerov, FGH, Shooting Numerov, and QuantumBound) against analytical solutions across multiple potential types and grid sizes:

### 1. Harmonic Oscillator

- Tests across grid sizes: 32, 64, 128 points
- All 6 methods tested (DVR, Spectral, Matrix Numerov, FGH, Shooting Numerov, QuantumBound)
- Tests first 10 energy levels
- **0.1% error tolerance**

### 2. Finite Square Wells

- **4 configurations tested:**
  - Shallow well: 1nm width, 10eV depth
  - Deep well: 1nm width, 50eV depth
  - Wide shallow well: 2nm width, 10eV depth
  - Narrow medium well: 0.5nm width, 30eV depth
- Grid sizes: 32, 64, 128 points (powers of 2)
- All 6 methods tested (DVR, Spectral, Matrix Numerov, FGH, Shooting Numerov, QuantumBound)
- **0.5% error tolerance**

### 3. 3D Coulomb Potential (Hydrogen Atom)

- Tests the radial Schrödinger equation for s-waves (L=0)
- Grid sizes: 32, 64, 128 points (powers of 2)
- All 6 methods tested (DVR, Spectral, Matrix Numerov, FGH, Shooting Numerov, QuantumBound)
- **1.0% error tolerance**

### 4. Morse Potential

- Tests vibrational energy levels for realistic molecular parameters
- Grid sizes: 32, 64, 128 points (powers of 2)
- All 6 methods tested (DVR, Spectral, Matrix Numerov, FGH, Shooting Numerov, QuantumBound)
- **1.0% error tolerance**

### 5. Pöschl-Teller Potential

- Tests bound states in hyperbolic wells
- Grid sizes: 32, 64, 128 points (powers of 2)
- All 6 methods tested (DVR, Spectral, Matrix Numerov, FGH, Shooting Numerov, QuantumBound)
- **1.0% error tolerance**

### 6. Double Square Wells (Accuracy Tests)

- **3 configurations tested:**
  - Symmetric, low barrier: 0.5nm wells, 0.3nm barrier, 30eV depth, 10eV barrier
  - Symmetric, medium barrier: 0.5nm wells, 0.5nm barrier, 40eV depth, 20eV barrier
  - Wide wells, low barrier: 0.6nm wells, 0.4nm barrier, 35eV depth, 5eV barrier
- Grid sizes: 32, 64, 128 points (powers of 2)
- Methods compared against DVR as reference
- **1.0% error tolerance**

### 7. Comprehensive Double Well Test Suite (`test-double-well.ts`)

A dedicated test suite specifically for double quantum well potentials with **stringent validation** requirements:

**23 comprehensive tests covering:**

1. Parity alternation for ALL states (even, odd, even, odd...)
2. Node count validation (state n has n nodes)
3. Edge behavior (decay, continuity, no spurious nodes)
4. Normalization (0.2% tolerance - very strict)
5. Monotonically increasing energies
6. Derivative continuity at outer edges (1.5% tolerance)
7. Well width parameter variations
8. Well depth parameter variations
9. Barrier width parameter variations
10. Small well width sensitivity
11. Small well depth sensitivity
12. Small barrier width sensitivity
13. Systematic parameter sweeps
14. Grid convergence (1500 grid points)
15. Shallow well extreme parameters
16. Deep well extreme parameters (many states)
17. Very wide barrier (weak coupling)
18. Very narrow barrier (strong coupling)
19. **Orthogonality of eigenstates (1% tolerance)**
20. **Wavefunction continuity at well boundaries**
21. **Probability localization in wells (>70% required)**
22. **Energy bounds validation (0 < E < V₀)**
23. **Energy splitting consistency/tunneling effect**

**Stringent Requirements:**

- Edge decay tolerance: 0.5% (was 1%)
- Normalization tolerance: 0.2% (was 0.5%)
- Parity detection tolerance: 2% (was 5%)
- Derivative continuity tolerance: 1.5% (was 3%)
- Orthogonality tolerance: 1% (new)
- Grid points: 1500 (was 1000)

**Run the double well test suite:**

```bash
npm run test:double-well
```

## Running Tests

### Method 1: Browser-Based Tests

This provides a visual interface for running tests.

1. **Start the development server** from the root directory:

   ```bash
   npm start
   ```

2. **Open the test runner** in a web browser:

   ```bash
   # The dev server typically runs on http://localhost:5173
   # Navigate to: http://localhost:5173/tests/accuracy/accuracy-tests.html
   # Or open tests/accuracy/accuracy-tests.html directly in your browser
   # On macOS:
   open tests/accuracy/accuracy-tests.html
   # On Linux:
   xdg-open tests/accuracy/accuracy-tests.html
   # On Windows:
   start tests/accuracy/accuracy-tests.html
   ```

3. **Run tests** by clicking one of the buttons:
   - **"Run Full Tests"** - Runs comprehensive test suite (tests all methods across all potentials and grid sizes)
   - **"Run Quick Check"** - Runs a subset for rapid validation

### Method 2: Command-Line Tests (Recommended)

Run tests directly from the command line using npm run test:accuracy.

```bash
# From the root directory
npm run test:accuracy
```

This will execute the comprehensive test suite and display results in the terminal, including:

- Pass/fail status for each test
- Numerical vs analytical energy comparisons
- Error percentages
- **Execution times for each method**
- **Performance summary with timing statistics**

### Method 3: Development Server + Browser Console

Useful during active development.

1. **Start the development server** from the root directory:

   ```bash
   npm start
   ```

2. **Open your browser** and navigate to the local server URL (usually `http://localhost:5173`)

3. **Open browser console** (F12 or Cmd+Option+I) and run:

   ```javascript
   // Run full comprehensive test suite
   import("./common/model/AccuracyTests.js").then((m) => m.runAccuracyTests());

   // Or run quick check only
   import("./common/model/AccuracyTests.js").then((m) =>
     m.runQuickAccuracyCheck(),
   );
   ```

### Method 4: Direct TypeScript Execution (Advanced)

You can also run the terminal test runner directly using tsx:

```bash
# Run with tsx (this is what npm run test:accuracy does)
npx tsx --tsconfig tsconfig.accuracy.json tests/accuracy/run-terminal-tests.js

# Or run the TypeScript source directly (requires mock setup)
npx tsx --tsconfig tsconfig.accuracy.json src/common/model/AccuracyTests.ts
```

**Note**: The project uses tsx (TypeScript executor) rather than building to JavaScript files.

## Test Functions

The AccuracyTests module exports two main functions:

- **`runAccuracyTests()`** - Runs the full comprehensive test suite
- **`runQuickAccuracyCheck()`** - Runs a quick subset of tests for rapid validation

## Understanding Test Results

### Individual Test Output

Each test reports:

- **Status**: ✓ PASSED or ✗ FAILED
- **Maximum error**: The largest percentage error found across all energy levels
- **Execution time**: Time taken to solve in milliseconds
- **Individual energy levels**: Detailed comparison showing:
  - Numerical result (in eV)
  - Analytical/reference result (in eV)
  - Percentage error

Example output:

```
=== DVR - Harmonic Oscillator (N=150) ===
Status: ✓ PASSED
Maximum error: 0.0234%

Testing 5 energy levels with 150 grid points:
Execution time: 12.45 ms
  E_0: ✓ Num: 0.413567 eV, Ana: 0.413470 eV, Err: 0.0234%
  E_1: ✓ Num: 1.240567 eV, Ana: 1.240410 eV, Err: 0.0127%
  ...
```

### Performance Summary

At the end of the test run, a performance summary shows timing statistics for each method:

```
--- Performance Summary ---
DVR:
  Average: 15.34 ms | Min: 8.21 ms | Max: 45.67 ms | Total: 245.44 ms
MatrixNumerov:
  Average: 12.89 ms | Min: 7.45 ms | Max: 38.23 ms | Total: 206.24 ms
Spectral:
  Average: 18.76 ms | Min: 10.34 ms | Max: 52.11 ms | Total: 300.16 ms
FGH:
  Average: 22.14 ms | Min: 11.56 ms | Max: 68.92 ms | Total: 354.24 ms
```

This allows you to:

- Compare performance across different methods
- Identify which method is fastest for your use case
- Track performance regressions over time

### Error Tolerances

All tests now use stringent tolerances with maximum 1% error:

- **Harmonic Oscillator**: **0.1%** - Very well-behaved smooth potential, extremely high accuracy expected
- **Finite Square Wells**: **0.5%** - Despite discontinuous potential, accurate methods achieve sub-1% error
- **3D Coulomb**: **1.0%** - Singular potential at r=0, still achieves 1% accuracy with proper grid
- **Morse Potential**: **1.0%** - Anharmonic potential with exact analytical solutions
- **Pöschl-Teller**: **1.0%** - Hyperbolic potential with exact analytical solutions
- **Double Square Wells**: **1.0%** - Inter-method comparison (vs DVR reference, no analytical solution)

## Adding New Tests

To add new test cases:

1. Open `src/common/model/AccuracyTests.ts`
2. Create a new test function following the pattern of existing tests
3. Add your test to the `runAccuracyTests()` function
4. Rebuild the project: `npm run build`

See `doc/ACCURACY_TESTS.md` for more details on test design.

## Troubleshooting

### Error: Cannot find module 'AccuracyTests.js'

If you see an error like:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/home/.../src/common/model/AccuracyTests.js'
```

This occurs when trying to run `node tests/accuracy/run-terminal-tests.js` directly. The project uses **TypeScript with tsx**, not compiled JavaScript files.

**Solution**: Use `npm run test:accuracy` instead, which correctly runs the TypeScript files with tsx.

### Specialized Tests

In addition to the main test suite (`npm run test:accuracy`), you can run specialized tests:

```bash
# Run comprehensive double well test suite (23 stringent tests)
npm run test:double-well

# Run Coulomb potential verification tests
npm run test:coulomb

# Run multi-square well tests (NEW)
npm run test:multi-square-well

# Run multi-Coulomb 1D tests (NEW)
npm run test:multi-coulomb-1d
```

**New Test Suites:**

- **Multi-Square Well Tests**: Validates the multi-well potential solver for 1-10 wells
  - Tests energy band formation
  - Verifies quantum tunneling between wells
  - Checks wavefunction localization
  - Validates against analytical solutions

- **Multi-Coulomb 1D Tests**: Validates the multi-Coulomb center solver for 1-10 centers
  - Tests molecular orbital formation
  - Verifies energy level ordering
  - Checks odd-parity enforcement for each center
  - Validates interference patterns

## Notes

- These tests ensure that numerical methods produce accurate results within acceptable error tolerances
- Tests validate correctness across different grid sizes to ensure robustness
- The comprehensive test suite now covers all major quantum potential types
- The project uses **tsx** to run TypeScript directly without a separate build step for tests
- All debug and redundant test files have been removed to simplify maintenance
