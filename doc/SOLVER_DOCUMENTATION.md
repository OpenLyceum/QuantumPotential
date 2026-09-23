# 1D Bound State Solver Documentation

## Overview

This document describes the implementation of the 1D time-independent Schrödinger equation (TISE) solver for the QPPW quantum physics simulation.

## Features

### Analytical Solutions

For well-known potentials, the solver provides exact analytical solutions for **12 potentials**:

- **Infinite Square Well**: $E_n = \frac{n^2 \pi^2 \hbar^2}{2mL^2}$
- **Finite Square Well**: Transcendental equation solutions
- **Harmonic Oscillator**: $E_n = \hbar\omega(n + \frac{1}{2})$
- **Morse Potential**: $E_n = \hbar\omega_e(n + \frac{1}{2}) - \frac{[\hbar\omega_e(n + \frac{1}{2})]^2}{4D_e}$
- **Pöschl-Teller Potential**: $E_n = -V_0[\sqrt{1 + \frac{2m a^2 V_0}{\hbar^2}} - (n + \frac{1}{2})]^2 \frac{\hbar^2}{2ma^2}$
- **Rosen-Morse Potential**: Analytical solutions with asymmetry
- **Eckart Potential**: Analytical solutions for barrier potentials
- **Asymmetric Triangle**: Airy function solutions
- **Triangular Potential**: Finite triangular well with Airy functions
- **1D Coulomb**: $E_n = -\frac{m\alpha^2}{2\hbar^2 (n + \frac{1}{2})^2}$ (odd-parity states only)
- **3D Coulomb (Radial)**: Hydrogen-like energy levels
- **Double Square Well**: Symmetric double well with parity-separated states

### Multi-Well Potentials (Numerical Solutions)

For complex multi-well systems, the solver uses numerical methods:

- **Multi-Square Well**: Array of 1-10 finite square wells solved using DVR/FGH/Matrix Numerov
  - Demonstrates band structure formation
  - Shows quantum tunneling between multiple wells
  - Transcendental equations become intractable for N > 2
- **Multi-Coulomb 1D**: Array of 1-10 Coulomb centers solved numerically
  - Models multi-atom quantum systems in 1D
  - No closed-form analytical solution exists for N > 1
  - Complex interference patterns between centers

### Numerical Solutions

For arbitrary potentials, six numerical methods are available:

#### 1. Numerov Method (Shooting)

- Higher-order finite-difference method with $O(h^6)$ error
- Uses shooting method to find bound states
- Iterative formula:
  $$\psi_{j+1} = \frac{(2 - 10f_j)\psi_j - (1+f_{j-1})\psi_{j-1}}{1+f_{j+1}}$$
  where $f_j = \frac{h^2}{12}k^2(x_j)$ and $k^2(x) = \frac{2m(E-V(x))}{\hbar^2}$

#### 2. Matrix Numerov Method

- Matrix formulation of the Numerov algorithm
- Converts the Schrödinger equation into an eigenvalue problem
- Higher accuracy than shooting Numerov for most cases

#### 3. Discrete Variable Representation (DVR) Method

- Matrix diagonalization approach
- Constructs Hamiltonian $H = T + V$
- Potential energy: Diagonal matrix with $V_{ii} = V(x_i)$
- Kinetic energy: Colbert-Miller formula
  $$T_{ij} = \frac{\hbar^2}{2m\Delta x^2} \begin{cases} \frac{\pi^2}{3} & \text{for } i=j \\ \frac{2(-1)^{i-j}}{(i-j)^2} & \text{for } i \neq j \end{cases}$$

#### 4. Fourier Grid Hamiltonian (FGH) Method

- Uses FFT for kinetic energy evaluation
- Efficient for periodic or smooth potentials
- Scales as O(N log N) for kinetic energy

#### 5. Spectral (Chebyshev) Method

- Expands wavefunction in Chebyshev polynomials
- High accuracy for smooth potentials
- Well-suited for non-uniform grid spacing

#### 6. QuantumBound Method (Experimental)

- Alternative bound state solver implementation
- Currently under development and testing
- May provide improved accuracy for specific potential types

## File Structure

```
src/common/model/
├── QuantumConstants.ts          # Physical constants (ℏ, m_e, etc.)
├── PotentialFunction.ts         # Type definitions and interfaces
├── NumerovSolver.ts             # Shooting Numerov method implementation
├── MatrixNumerovSolver.ts       # Matrix Numerov method implementation
├── DVRSolver.ts                 # DVR method implementation
├── FGHSolver.ts                 # Fourier Grid Hamiltonian method
├── SpectralSolver.ts            # Chebyshev spectral method
├── DoubleWellNumerovSolver.ts   # Specialized double well solver
├── Schrodinger1DSolver.ts       # Main solver class
├── BaseModel.ts                 # Base model class
└── SuperpositionType.ts         # Superposition type definitions

src/common/model/analytical-solutions/  # Analytical solvers for specific potentials
  ├── infinite-square-well.ts
  ├── finite-square-well.ts
  ├── harmonic-oscillator.ts
  ├── morse-potential.ts
  ├── poschl-teller-potential.ts
  ├── rosen-morse-potential.ts
  ├── eckart-potential.ts
  ├── asymmetric-triangle-potential.ts
  ├── triangular-potential.ts
  ├── coulomb-1d-potential.ts
  ├── coulomb-1d-numerical-wrapper.ts   # Numerical wrapper with odd-parity filtering
  ├── coulomb-3d-potential.ts
  ├── double-square-well.ts
  ├── multi-square-well.ts              # Multi-well potentials (uses numerical solvers)
  ├── multi-coulomb-1d.ts               # Multi-Coulomb centers (uses numerical solvers)
  ├── airy-utilities.ts                 # Airy functions (Ai, Bi)
  ├── math-utilities.ts                 # Special functions and polynomials
  └── index.ts                          # Exports all solutions
```

**Note**: While `multi-square-well.ts` and `multi-coulomb-1d.ts` are located in the `analytical-solutions` directory for organizational convenience, they create potential functions that are solved using numerical methods (DVR, FGH, Matrix Numerov), not analytical formulas.

## Usage

### Basic Usage

```typescript
import Schrodinger1DSolver, {
  NumericalMethod,
} from "./common/model/Schrodinger1DSolver.js";
import { PotentialType } from "./common/model/PotentialFunction.js";
import QuantumConstants from "./common/model/QuantumConstants.js";

// Create solver instance
const solver = new Schrodinger1DSolver(NumericalMethod.DVR);

// Define grid
const gridConfig = {
  xMin: 0,
  xMax: 1e-9, // 1 nm
  numPoints: 200,
};

// Solve for infinite well (analytical)
const result = solver.solveAnalyticalIfPossible(
  {
    type: PotentialType.INFINITE_WELL,
    wellWidth: 1e-9,
  },
  QuantumConstants.ELECTRON_MASS,
  5, // Number of states
  gridConfig,
);

// Access results
result.energies.forEach((E, n) => {
  const E_eV = Schrodinger1DSolver.joulesToEV(E);
  console.log(`E_${n + 1} = ${E_eV.toFixed(4)} eV`);
});
```

### Custom Potentials

```typescript
// Define custom potential function
const potential = (x: number) => {
  // Finite square well
  if (x >= 0 && x <= 1e-9) {
    return -Schrodinger1DSolver.eVToJoules(5); // -5 eV
  }
  return 0;
};

// Solve numerically
const result = solver.solveNumerical(
  potential,
  QuantumConstants.ELECTRON_MASS,
  5,
  gridConfig,
);
```

### Helper Functions

The `Schrodinger1DSolver` class provides static helper methods:

```typescript
// Create common potential functions
const infiniteWell = Schrodinger1DSolver.createInfiniteWellPotential(1e-9);
const finiteWell = Schrodinger1DSolver.createFiniteWellPotential(1e-9, 5e-19);

// Unit conversions
const energyJoules = Schrodinger1DSolver.eVToJoules(1.0);
const energyEV = Schrodinger1DSolver.joulesToEV(1.602e-19);
```

## User Preferences

Users can select the numerical method through the preferences system:

```typescript
import QPPWPreferences from "./QPPWPreferences.js";
import { NumericalMethod } from "./common/model/Schrodinger1DSolver.js";

// Get current method
const method = QPPWPreferences.numericalMethodProperty.value;

// Set method
QPPWPreferences.numericalMethodProperty.value = NumericalMethod.NUMEROV;
```

## Integration with Models

The solver is integrated into the `OneWellModel` class:

```typescript
// Get energy for quantum number n
const energy = oneWellModel.getEnergyLevel(3); // E_3 in eV

// Get wavefunction
const wavefunction = oneWellModel.getWavefunction(3); // ψ_3(x)

// Get spatial grid
const xGrid = oneWellModel.getXGrid(); // x values in nm

// Get all bound states
const boundStates = oneWellModel.getBoundStates();
```

## Performance Considerations

### Grid Resolution

- More grid points → higher accuracy, slower computation
- Typical range: 100-500 points
- DVR method scales as O(N³) due to matrix diagonalization
- Numerov method scales as O(N) per energy search

### Method Selection

- **DVR**: Better for general potentials, finds all states simultaneously
- **Numerov**: Better for deep wells, requires energy range specification

### Caching

The `OneWellModel` caches results and recalculates only when parameters change.

## Mathematical Background

### Time-Independent Schrödinger Equation

$$-\frac{\hbar^2}{2m}\frac{d^2\psi}{dx^2} + V(x)\psi = E\psi$$

### Bound State Conditions

1. $\psi(x) \to 0$ as $x \to \pm\infty$
2. $\psi$ and $d\psi/dx$ continuous
3. $\int|\psi|^2 dx = 1$ (normalization)

### DVR Basis

The DVR method uses a basis of delta functions on grid points, making the potential matrix diagonal while using the Colbert-Miller formula for exact kinetic energy in the DVR basis.

## References

The solver implementations are based on well-established numerical methods for solving the time-independent Schrödinger equation, including the Numerov method (1924), Discrete Variable Representation (DVR), and various spectral methods.

### Freely Available References

1. **Numerov Method**:
   - Pillai, M., et al. (2014). "Numerov numerical method applied to the Schrödinger equation." arXiv:1403.7092. https://arxiv.org/abs/1403.7092
   - Santoso, A. B., & Zuhdi, M. (2015). "Numerical Solution of the 1D-Schrödinger Equation with Pseudo-Delta Barrier Using Numerov Method." arXiv:1507.03708. https://arxiv.org/abs/1507.03708

2. **DVR Method**:
   - Pliś, S., & Zak, E. (2025). "Quantum Discrete Variable Representations." arXiv:2504.15841. https://arxiv.org/abs/2504.15841
   - Kievsky, A., et al. (2020). "Discrete Variable Representation method in the study of few-body quantum systems with non-zero angular momentum." arXiv:2008.12936. https://arxiv.org/abs/2008.12936

3. **Additional Resources**:
   - Abramowitz, M., & Stegun, I. A. (1964). "Handbook of Mathematical Functions." National Bureau of Standards. Available online at https://personal.math.ubc.ca/~cbm/aands/

## Visualization Features

The solver is integrated with comprehensive visualization tools:

### Energy Chart

- Displays potential energy curves for all potential types
- Shows discrete energy levels as horizontal lines
- Interactive selection of energy levels
- Hover to display energy values
- Color-coded visualization with phase-dependent coloring

### Wavefunction Chart

The simulation provides three visualization modes:

1. **Probability Density** (`|ψ|²`): Shows the probability distribution
2. **Wavefunction Components**: Real part, imaginary part, and magnitude
3. **Phase Color**: Rainbow-colored visualization where hue represents quantum phase

### Chart Specifications

- **Energy Chart**: 600×300 pixels with margins (left: 60, right: 20, top: 40, bottom: 50)
- **Wavefunction Chart**: 600×140 pixels with margins (left: 60, right: 20, top: 10, bottom: 40)
- Both charts share synchronized x-axis (Position in nm: -4 to +4 nm)
- Y-axis ranges automatically adjust based on potential type and selected state

## Recent Enhancements (2024-2025)

The solver has recently been enhanced with several new features:

### Multi-Well Support

- **Multi-Square Well**: Supports 1-10 finite square wells arranged periodically
  - Demonstrates band structure formation
  - Shows quantum tunneling between multiple wells
  - Energy levels form bands as well count increases
  - Available in the "Many Wells" screen

- **Multi-Coulomb 1D**: Supports 1-10 Coulomb centers arranged periodically
  - Models multi-atom quantum systems in 1D
  - Shows complex interference patterns
  - Demonstrates molecular orbital formation
  - Available in the "Many Wells" screen

### Coulomb 1D Improvements

- **Odd-Parity Enforcement**: The 1D Coulomb potential now correctly enforces odd-parity wavefunctions
  - All wavefunctions satisfy ψ(-x) = -ψ(x)
  - Linear behavior at x=0 (ψ(x) ∝ x as x→0)
  - Energy formula corrected: $E_n = -\frac{m\alpha^2}{2\hbar^2(n+1/2)^2}$
  - Numerical wrapper available for validation

### Enhanced Double Well Solver

- **Improved Eigenvalue Detection**: Uses node-counting diagnostics for robust eigenvalue recovery
- **Active Eigenvalue Recovery**: Adaptively searches for missing energy levels
- **23 Comprehensive Tests**: Stringent validation suite ensures physical correctness
  - Orthogonality testing
  - Probability localization
  - Energy splitting consistency
  - Wavefunction continuity at boundaries

### Test Infrastructure

New test suites added:

- `npm run test:multi-square-well` - Multi-well square potential validation
- `npm run test:multi-coulomb-1d` - Multi-Coulomb 1D validation
- `npm run test:double-well` - Comprehensive 23-test suite for double wells
- `npm run test:coulomb` - Coulomb potential verification with near-zero behavior checks

## Future Enhancements

Potential improvements to consider:

- Support for 2D/3D potentials
- Time-dependent Schrödinger equation solver (partial implementation exists for phase evolution)
- More analytical solutions for exotic potentials
- Adaptive grid refinement
- GPU acceleration for large grids
