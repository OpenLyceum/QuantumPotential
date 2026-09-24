# 1D Bound State Solver Documentation

## Overview

This document describes the implementation of the 1D time-independent Schrödinger equation (TISE) solver for the QPPW quantum physics simulation.

## Features

### Analytical Solutions

For well-known potentials, the solver provides exact analytical solutions for **11 potentials**:

- **Infinite Square Well**: $E_n = \frac{n^2 \pi^2 \hbar^2}{2mL^2}$
- **Finite Square Well**: Transcendental equation solutions
- **Harmonic Oscillator**: $E_n = \hbar\omega(n + \frac{1}{2})$
- **Morse Potential**: $E_n = \hbar\omega_e(n + \frac{1}{2}) - \frac{[\hbar\omega_e(n + \frac{1}{2})]^2}{4D_e}$
- **Pöschl-Teller Potential**: $E_n = -V_0[\sqrt{1 + \frac{2m a^2 V_0}{\hbar^2}} - (n + \frac{1}{2})]^2 \frac{\hbar^2}{2ma^2}$
- **Rosen-Morse Potential**: Analytical solutions with asymmetry
- **Eckart Potential**: Analytical solutions for barrier potentials
- **Asymmetric Triangle**: Airy function solutions
- **Triangular Potential**: Finite triangular well with Airy functions
- **1D Coulomb**: $E_N = -\frac{m\alpha^2}{2\hbar^2 N^2}$, $N=1,2,\ldots$ (regular odd-parity states)
- **Double Square Well**: Symmetric double well with parity-separated states

### Smooth and Multi-Well Potentials (Numerical Solutions)

These potentials have no convenient closed form and are solved numerically:

- **Double Pöschl–Teller** (Two Wells): two sech² wells
- **Multi-Square Well** (Many Wells): 1–10 finite square wells (band formation, tunnelling between wells)
- **Multi-Pöschl–Teller** (Many Wells): a row of 1–10 sech² wells (`multiPoschlTellerPotential.ts`)
- **Multi-Coulomb 1D**: 1–10 Coulomb centres. The solver still supports it, but no screen offers it
  any more; only `npm run test:multi-coulomb-1d` exercises it.

The Many Wells potentials can be tilted by a uniform electric field ℰ, which adds V = eℰx.

## Numerical solver

`Schrodinger1DSolver.solveNumerical` uses **Numerov shooting**, ported from PhET's *Quantum Bound States*
(`src/common/model/numerov/`). Only the double Pöschl–Teller (Two Wells) and the Many Wells potentials reach
it; every other potential is analytical.

- **Units.** The solver works internally in nm, eV and electron masses, which are the units its tolerances
  were tuned for. The facade converts at its boundary: SI in, SI out. Wave functions are converted by
  multiplying by √(10⁹), so ∫|ψ|² dx = 1 is preserved.
- **Grid.** The grid is odd, so x = 0 is a grid point. Its size comes from `?numberOfPoints` (default 1001).
  It is refined whenever the spacing would exceed 8 pm. The potential is cell-averaged, so a square
  well's effective width does not depend on where its edges fall between samples.
- **Energy window.** The window runs from min V to the lower of the two boundary values of V, so the
  solver returns every state bound on both sides, up to `numStates`.
- **Bracketing by node count.** By Sturm–Liouville, the number of interior nodes of the forward
  solution at energy E equals the number of eigenvalues below E. Bisecting on that integer isolates each
  state by its index, even inside dense multi-well minibands.
- **Refinement.** Illinois false position (`EnergyRefiner`) solves the matching condition.
  - *Symmetric V:* the solver detects symmetry by comparing V(x) with V(−x). It imposes ψ′(0) = 0 for
    even states and ψ(0) = 0 for odd states, then mirrors the half solution.
  - *Otherwise:* it matches log-derivatives at each state's main lobe. This is needed for the tilted
    (ℰ ≠ 0) wells.
- **Clean-up.** Two steps of inverse iteration on the tridiagonal Numerov problem Hψ = EBψ separate
  near-degenerate states and remove the kink at the stitching point. The states are then normalized
  by the trapezoidal rule.
- **Unnormalizable states are dropped.** This happens only for the grid-limited states that collapse
  onto a bare 1D Coulomb centre (see `tests/accuracy/README.md`).

**FGH (Fourier Grid Hamiltonian)** is kept as a developer cross-check: `?numericalMethod=fgh`. It builds
the Hamiltonian on a 256-point periodic grid, with the kinetic energy diagonal in k-space, and
diagonalizes it densely.

The earlier DVR, spectral, matrix-Numerov, shooting and "QuantumBound" solvers, and the Preferences
controls that chose between them, have been removed.

## File Structure

```
src/common/model/
├── Schrodinger1DSolver.ts          # Facade: analytical if possible, else Numerov (or FGH)
├── NumericalMethod.ts              # NUMEROV | FGH
├── numerov/                        # Ported from Quantum Bound States
│   ├── NumerovSolver.ts            # Node-count bracketing, matching, inverse iteration
│   ├── NumerovIntegrator.ts        # Forward/backward Numerov recurrence with overflow rescaling
│   ├── EnergyRefiner.ts            # Illinois false position
│   ├── WaveFunctionNormalizer.ts   # Trapezoidal normalization
│   ├── XGrid.ts                    # Uniform odd grid (nm)
│   └── NumerovConstants.ts         # ħ in √(eV·mₑ)·nm
├── FGHSolver.ts                    # Cross-check
├── LinearAlgebraUtils.ts           # Matrix diagonalization + FFT (FGH, momentum space)
├── PotentialFactory.ts             # Builds analytical solutions
├── multiPoschlTellerPotential.ts   # V(x) for the double and multi Pöschl–Teller wells
└── analytical-solutions/           # One file per closed-form potential, plus the multi-well wrappers
```

## Usage

```typescript
const solver = new Schrodinger1DSolver(); // Numerov
const result = solver.solveNumerical(
  (x) => (Math.abs(x) < 0.5e-9 ? 0 : 5 * QuantumConstants.EV_TO_JOULES), // V(x) in J, x in m
  QuantumConstants.ELECTRON_MASS,
  10, // at most 10 states
  { xMin: -4e-9, xMax: 4e-9, numPoints: 1001 },
);
// result.energies (J), result.wavefunctions (m^-1/2), result.xGrid (m), result.method === "numerov"
```

Screen models call `solveAnalyticalIfPossible(wellParams, mass, numStates, gridConfig)`, which uses the
closed-form solution for the potential type, or the numerical path for `DOUBLE_POSCHL_TELLER`,
`MULTI_SQUARE_WELL`, `MULTI_POSCHL_TELLER` and `MULTI_COULOMB_1D` (with `wellParams.electricField` in V/m).

## Query parameters

| Parameter | Default | Meaning |
|---|---|---|
| `?numericalMethod` | `numerov` | `numerov` or `fgh` (cross-check) |
| `?numberOfPoints` | `1001` | Odd grid size for the numerical solver (501–10001) |

## Mathematical Background

The time-independent Schrödinger equation is −ħ²/(2m) ψ″ + V(x)ψ = Eψ. In the Numerov scheme
ψ_(j+1) = [(2 − 10f_j)ψ_j − (1 + f_(j−1))ψ_(j−1)] / (1 + f_(j+1)), with f_j = (h²/12)·2m(E − V_j)/ħ².
Its local error is O(h⁶), which makes it O(h⁴) globally.

## Testing

- `tests/common/model/numerov-solver.test.ts`: checks the invariants (finite values, ordering,
  normalization, orthogonality, node count). It also checks the harmonic-oscillator and Pöschl–Teller
  spectra, tilted multi-wells, agreement with FGH, and speed on the densest band.
- `tests/common/model/analytical-vs-numerical.test.ts`: compares the closed-form spectra with a
  fine-grid Numerov solution.
- `tests/accuracy/`: hand-run, exhaustive comparisons (see its README).
