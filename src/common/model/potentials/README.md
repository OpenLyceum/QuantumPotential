# Potential Class Hierarchy

This directory contains the class-based implementation of quantum mechanical potentials, separating analytical potentials (with exact solutions) from numerical potentials (requiring numerical methods).

## Architecture

### Base Classes

1. **BasePotential** - Abstract base class for all potentials
   - Provides common interface for all potential types
   - Defines whether a potential has an analytical solution
   - Stores particle mass

2. **AnalyticalPotential** - For potentials with closed-form analytical solutions
   - Wraps `AnalyticalSolution` instances
   - Provides exact energy eigenvalues and wavefunctions
   - Includes methods for classical probability, turning points, wavefunction zeros, etc.
   - Always returns `hasAnalyticalSolution() = true`

3. **NumericalPotential** - For arbitrary potentials requiring numerical methods
   - Wraps a `PotentialFunction`
   - Solved using numerical methods (Numerov, DVR, FGH, Spectral, etc.)
   - Always returns `hasAnalyticalSolution() = false`

## Analytical Potential Classes

The following potentials have exact analytical solutions:

1. **InfiniteSquareWellPotential** - Particle in a box
2. **FiniteSquareWellPotential** - Finite square well
3. **HarmonicOscillatorPotential** - Quantum harmonic oscillator
4. **MorsePotential** - Molecular vibrations
5. **PoschlTellerPotential** - Sech² potential
6. **RosenMorsePotential** - Asymmetric well with barrier
7. **EckartPotential** - Barrier potential
8. **AsymmetricTrianglePotential** - Linear wall and barrier
9. **Coulomb1DPotential** - 1D Coulomb potential
11. **TriangularPotential** - Triangular well

## Usage

### Using the Solver with Potential Classes

```typescript
import { Schrodinger1DSolver, WellParameters } from "../Schrodinger1DSolver.js";
import { PotentialType } from "../PotentialFunction.js";
import { NumericalPotential } from "./index.js";

const solver = new Schrodinger1DSolver();
const mass = 9.10938e-31; // electron mass

// Example 1: Create and solve an analytical potential
const wellParams: WellParameters = {
  type: PotentialType.HARMONIC_OSCILLATOR,
  springConstant: 1.0,
};

const potential = solver.createPotential(wellParams, mass);
const result = solver.solvePotential(potential, 5, gridConfig);
// result.method will be "analytical"

// Example 2: Create and solve a custom numerical potential
const customPotential = (x: number) => 0.5 * x * x; // parabolic
const numericalPot = new NumericalPotential(customPotential, mass);
const result2 = solver.solvePotential(numericalPot, 5, gridConfig);
// result2.method will be "dvr", "numerov", etc. depending on solver settings

// Example 3: Check if potential has analytical solution
if (potential.hasAnalyticalSolution()) {
  const analyticalPot = potential as AnalyticalPotential;
  const turningPoints = analyticalPot.calculateTurningPoints(energy);
  const classicalProb = analyticalPot.calculateClassicalProbability(
    energy,
    xGrid,
  );
}
```

### Direct Creation of Potential Classes

```typescript
import {
  InfiniteSquareWellPotential,
  HarmonicOscillatorPotential,
  NumericalPotential,
} from "./index.js";

// Create potentials directly
const infiniteWell = new InfiniteSquareWellPotential(1e-9, mass);
const harmonicOsc = new HarmonicOscillatorPotential(1.0, mass);
const custom = new NumericalPotential((x) => Math.abs(x), mass);

// Solve them
const result1 = solver.solvePotential(infiniteWell, 5, gridConfig);
const result2 = solver.solvePotential(harmonicOsc, 5, gridConfig);
const result3 = solver.solvePotential(custom, 5, gridConfig);
```

## Key Benefits

1. **Clear Separation**: Analytical and numerical potentials are distinct types
2. **Type Safety**: TypeScript can check that analytical-specific methods are only called on analytical potentials
3. **Polymorphism**: All potentials share a common interface through `BasePotential`
4. **Automatic Method Selection**: The solver automatically chooses the appropriate solution method
5. **Extensibility**: Easy to add new potential types by extending `AnalyticalPotential` or using `NumericalPotential`

## Implementation Details

- Each `AnalyticalPotential` wraps an `AnalyticalSolution` instance from `../analytical-solutions/`
- The wrapper delegates method calls to the underlying solution
- `NumericalPotential` is a lightweight wrapper around a `PotentialFunction`
- The solver's `solvePotential()` method checks `hasAnalyticalSolution()` to determine which solving approach to use

## Backward Compatibility

The original `solveAnalyticalIfPossible()` and `solveNumerical()` methods are still available and work as before. The new class-based API provides an alternative, more object-oriented approach.
