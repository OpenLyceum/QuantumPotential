# Analytical Solutions for Quantum Potentials

This directory contains analytical solutions for various quantum mechanical potentials. Each potential has its own dedicated TypeScript file with exact solutions to the Schrödinger equation.

## Overview

Analytical solutions provide exact mathematical expressions for energy eigenvalues and wavefunctions without requiring numerical approximation. These solutions are valuable for:

- Verifying numerical solvers
- Understanding fundamental quantum mechanics
- Providing benchmarks for computational methods
- Educational purposes

### Available Potentials

This module provides **11 analytical solutions** plus 2 numerical multi-well potentials:

**Analytical Solutions:**

1. Infinite Square Well
2. Finite Square Well
3. Harmonic Oscillator
4. Morse Potential
5. Pöschl-Teller Potential
6. Rosen-Morse Potential
7. Eckart Potential
8. Asymmetric Triangle Potential
9. Triangular Potential (Finite)
10. Coulomb 1D Potential
11. Double Square Well

**Multi-Well Potentials (Numerical):**

13. Multi-Square Well - solved numerically using DVR/FGH/Matrix Numerov
14. Multi-Coulomb 1D - solved numerically (no analytical solution exists)

### Implementation Details

All analytical solutions are evaluated at **1000 grid points** for high-resolution visualization, independent of the user's grid preference setting. This ensures smooth, accurate wavefunction displays while numerical methods can use user-configurable grid sizes.

**Note on Multi-Well Potentials**: While `multi-square-well.ts` and `multi-coulomb-1d.ts` are located in this directory for organizational convenience, they create potential functions that are **solved using numerical methods** (DVR, FGH, or Matrix Numerov), not analytical formulas. They are included here because they provide convenient interfaces for creating multi-well potentials, but the actual bound state solutions require numerical eigensolvers.

**Note**: Rosen-Morse and Eckart potentials have been temporarily removed from the UI but remain available in the codebase for future use.

---

## 1. Infinite Square Well

**File**: `infinite-square-well.ts`

### Description

The infinite square well (particle in a box) is the simplest quantum mechanical system. A particle is confined to a region with impenetrable walls, representing a potential that is zero inside the box and infinite outside.

### Potential

```
V(x) = 0     for 0 < x < L
V(x) = ∞     otherwise
```

### Parameters

- `wellWidth` (L): Width of the well in meters
- `mass` (m): Particle mass in kg
- `numStates`: Number of energy levels to calculate
- `gridConfig`: Grid configuration for wavefunction evaluation

### Energy Eigenvalues

The energy levels are given by:

```
E_n = (n² π² ℏ²) / (2mL²)    for n = 1, 2, 3, ...
```

### Wavefunctions

The normalized wavefunctions are:

```
ψ_n(x) = √(2/L) sin(nπx/L)
```

### Physical Significance

This is the fundamental model for quantum confinement and demonstrates:

- Quantization of energy
- Zero-point energy (E_1 > 0)
- Wave-particle duality
- Applications in quantum dots and nanowires

---

## 2. Finite Square Well

**File**: `finite-square-well.ts`

### Description

The finite square well extends the infinite well by allowing the potential to be finite outside the well. Particles can penetrate into the classically forbidden regions, demonstrating quantum tunneling.

### Potential

```
V(x) = -V₀   for |x| < L/2
V(x) = 0     for |x| > L/2
```

### Parameters

- `wellWidth` (L): Width of the well in meters
- `wellDepth` (V₀): Depth of the well in Joules (positive value)
- `mass` (m): Particle mass in kg
- `numStates`: Number of energy levels to calculate
- `gridConfig`: Grid configuration for wavefunction evaluation

### Energy Eigenvalues

Energy eigenvalues are found by solving transcendental equations:

**Even parity states**:

```
tan(ξ) = η/ξ
```

**Odd parity states**:

```
-cot(ξ) = η/ξ
```

where:

- `ξ = (L/2)√(2m(E+V₀)/ℏ²)`
- `η = (L/2)√(2m(V₀-E-V₀)/ℏ²) = (L/2)√(-2mE/ℏ²)`

### Numerical Methods

The transcendental equations are solved using the **bisection method**:

1. Search for solutions in intervals [nπ/2, (n+1)π/2]
2. Alternate between even and odd parity states
3. Iterate until convergence (tolerance: 10⁻¹⁰)

### Wavefunctions

**Inside the well** (|x| < L/2):

- Even: `ψ(x) = A cos(kx)`
- Odd: `ψ(x) = A sin(kx)`

**Outside the well** (|x| > L/2):

- Even: `ψ(x) = B exp(-κ|x|)`
- Odd: `ψ(x) = B sign(x) exp(-κ|x|)`

where `k = √(2m(E+V₀)/ℏ²)` and `κ = √(-2mE/ℏ²)`

### Physical Significance

Models:

- Quantum wells in semiconductors
- Nuclear potentials
- Demonstrates quantum tunneling and evanescent waves

---

## 3. Harmonic Oscillator

**File**: `harmonic-oscillator.ts`

### Description

The quantum harmonic oscillator describes a particle in a parabolic potential, modeling vibrations in molecules and lattices.

### Potential

```
V(x) = (1/2)kx² = (1/2)mω²x²
```

### Parameters

- `springConstant` (k): Spring constant in N/m
- `mass` (m): Particle mass in kg
- `numStates`: Number of energy levels to calculate
- `gridConfig`: Grid configuration for wavefunction evaluation

### Energy Eigenvalues

```
E_n = ℏω(n + 1/2)    for n = 0, 1, 2, ...
```

where `ω = √(k/m)` is the classical angular frequency.

### Wavefunctions

```
ψ_n(x) = (1/√(2ⁿn!)) (mω/πℏ)^(1/4) exp(-mωx²/(2ℏ)) H_n(√(mω/ℏ)x)
```

where `H_n(x)` are Hermite polynomials calculated using the recurrence relation:

- `H_0(x) = 1`
- `H_1(x) = 2x`
- `H_(n+1)(x) = 2xH_n(x) - 2nH_(n-1)(x)`

### Physical Significance

Describes:

- Molecular vibrations
- Phonons in solids
- Quantum field theory ground state
- Coherent states in quantum optics

---

## 4. Morse Potential

**File**: `morse-potential.ts`

### Description

The Morse potential provides a realistic model for molecular vibrations, including anharmonicity and bond dissociation effects that the harmonic oscillator cannot capture.

### Potential (Width-Parameterized)

```
V(x) = D_e[1 - exp(-(x - x_e)/a)]² - D_e
```

**Note**: The potential has been reformulated to use width parameter `a` in meters instead of inverse meters, making it more intuitive. The energy is measured relative to dissociation (V → 0 as x → ±∞).

### Parameters

- `dissociationEnergy` (D_e): Dissociation energy in Joules
- `wellWidth` (a): Width parameter in meters (typical values ~10⁻¹⁰ m)
- `equilibriumPosition` (x_e): Equilibrium bond length in meters
- `mass` (m): Reduced mass in kg
- `numStates`: Number of energy levels to calculate
- `gridConfig`: Grid configuration for wavefunction evaluation

### Energy Eigenvalues

```
E_n = ℏω(n + 1/2) - (ℏω)²(n + 1/2)² / (4D_e) - D_e
```

where:

- `ω = √(2D_e/m) / a` is the characteristic frequency (note: a in denominator for width parameterization)
- `λ = (a√(2mD_e)) / ℏ` is the dimensionless parameter
- Maximum quantum number: `n_max = ⌊λ - 1/2⌋`
- Energy is measured from the dissociation limit (V = 0)

### Wavefunctions

```
ψ_n(z) = N_n z^(λ-n-1/2) exp(-z/2) L_n^(2λ-2n-1)(z)
```

where:

- `z = 2λ exp(-(x-x_e)/a)` (note: division by a for width parameterization)
- `λ = (a√(2mD_e)) / ℏ`
- `N_n = √[(n! / a) / Γ(2λ - n)]` is the normalization (includes 1/a factor)
- `L_n^α(z)` are associated Laguerre polynomials

### Physical Significance

- More accurate than harmonic oscillator for molecular spectroscopy
- Models bond breaking and dissociation
- Used in diatomic molecule studies (H₂, O₂, etc.)
- Shows anharmonicity in vibrational spectra

---

## 5. Pöschl-Teller Potential

**File**: `poschl-teller-potential.ts`

### Description

The Pöschl-Teller potential is a hyperbolic well with exact solutions, useful for modeling quantum wells and barriers in various physical systems.

### Potential (Width-Parameterized)

```
V(x) = -V_0 / cosh²(x/a) = -V_0 sech²(x/a)
```

**Note**: The potential has been reformulated to use width parameter `a` in meters instead of inverse meters.

### Parameters

- `potentialDepth` (V_0): Potential depth in Joules (positive value)
- `wellWidth` (a): Width parameter in meters (typical values ~10⁻¹⁰ m)
- `mass` (m): Particle mass in kg
- `numStates`: Number of energy levels to calculate
- `gridConfig`: Grid configuration for wavefunction evaluation

### Energy Eigenvalues

```
E_n = -V_0 + (ℏ²/(2ma²))(λ - n - 1/2)²
```

where:

- `λ = (a√(2mV_0)) / ℏ` is the dimensionless parameter
- Maximum quantum number: `n_max = ⌊λ - 1/2⌋`

### Wavefunctions

```
ψ_n(x) = N_n sech^α(x/a) P_n^(α,α)(tanh(x/a))
```

where:

- `α = λ - n - 1/2`
- `N_n = √[(2α / a) n! / n!]` (includes 1/a normalization factor)
- `P_n^(α,β)(x)` are Jacobi polynomials

### Numerical Methods

Jacobi polynomials are calculated using the recurrence relation:

- `P_0^(α,β)(x) = 1`
- `P_1^(α,β)(x) = (α - β + (α + β + 2)x) / 2`
- Recurrence formula for higher orders

### Physical Significance

- Models quantum wells in semiconductor heterostructures
- Related to soliton solutions in nonlinear physics
- Exactly solvable model for teaching quantum mechanics

---

## 6. Rosen-Morse Potential

**File**: `rosen-morse-potential.ts`

**Status**: Currently hidden from UI but fully implemented and available in codebase.

### Description

The Rosen-Morse potential is a generalization of the Pöschl-Teller potential with an additional tanh term, providing more flexibility in modeling molecular interactions.

### Potential (Width-Parameterized)

```
V(x) = -V_0/cosh²(x/a) + V_1 tanh(x/a)
```

### Parameters

- `potentialDepth` (V_0): Potential depth in Joules (positive value)
- `barrierHeight` (V_1): Barrier height in Joules (can be positive or negative)
- `wellWidth` (a): Width parameter in meters (typical values ~10⁻¹⁰ m)
- `mass` (m): Particle mass in kg
- `numStates`: Number of energy levels to calculate
- `gridConfig`: Grid configuration for wavefunction evaluation

### Energy Eigenvalues

```
E_n = -V_0 + (ℏ²/(2ma²))[(λ_eff - n - 1/2)² + μ²]
```

where:

- `λ = (a√(2mV_0)) / ℏ` is the dimensionless depth parameter
- `μ = (V_1 · a) / (2ℏ√(2mV_0))` is the dimensionless asymmetry parameter
- `λ_eff = √(λ² - μ²)` is the effective parameter
- Requires `λ > |μ|` for bound states

### Wavefunctions

```
ψ_n(x) = N_n sech^s(x/a) exp(μ tanh(x/a)) P_n^(α,β)(tanh(x/a))
```

where:

- `s = λ_eff - n - 1/2`
- `α = s - μ`, `β = s + μ`
- Normalization includes 1/a factor

### Physical Significance

- Models molecular potentials with asymmetry
- Useful in molecular spectroscopy
- Demonstrates interplay between attractive and repulsive forces

---

## 7. Eckart Potential

**File**: `eckart-potential.ts`

**Status**: Currently hidden from UI but fully implemented and available in codebase.

### Description

The Eckart potential models molecular barriers and chemical reaction pathways, particularly relevant for activation barriers in chemical reactions.

### Potential (Width-Parameterized)

```
V(x) = V_0/(1 + exp(x/a))² - V_1/(1 + exp(x/a))
```

### Parameters

- `potentialDepth` (V_0): Potential depth in Joules
- `barrierHeight` (V_1): Barrier height in Joules
- `wellWidth` (a): Width parameter in meters (typical values ~10⁻¹⁰ m)
- `mass` (m): Particle mass in kg
- `numStates`: Number of energy levels to calculate
- `gridConfig`: Grid configuration for wavefunction evaluation

### Energy Eigenvalues

```
E_n = -(ℏ²/(2ma²))(s_2 - n)²
```

where:

- `α_param = (a√(2mV_0)) / ℏ` is the dimensionless depth parameter
- `β_param = (V_1·a√(2m)) / (2ℏ√(V_0))` is the dimensionless barrier parameter
- `s_1 = -1/2 + √(1/4 + α_param)`
- `s_2 = -1/2 + √(1/4 + α_param - β_param)`

### Wavefunctions

```
ψ_n(ξ) = N_n ξ^(s_2-n) (1+ξ)^(-s_1-s_2+n) P_n^(α,β)(1-2ξ/(1+ξ))
```

where:

- `ξ = exp(x/a)` (note: division by a for width parameterization)
- Normalization includes 1/a factor

### Physical Significance

- Models activation barriers in chemical reactions
- Used in transition state theory
- Describes tunneling through molecular barriers
- Important in enzyme catalysis studies

---

## 8. Asymmetric Triangle Potential

**File**: `asymmetric-triangle-potential.ts`

### Description

The asymmetric triangle potential creates a triangular well with solutions involving Airy functions. This models electric field effects in quantum systems.

### Potential

```
V(x) = 0           for x < 0
V(x) = -b(a-x)     for 0 < x < a
V(x) = 0           for x > a
```

### Parameters

- `slope` (b): Slope parameter in Joules/meter (positive value)
- `wellWidth` (a): Width parameter in meters
- `mass` (m): Particle mass in kg
- `numStates`: Number of energy levels to calculate
- `gridConfig`: Grid configuration for wavefunction evaluation

### Energy Eigenvalues

Energy eigenvalues are approximated using the zeros of the Airy function Ai(z):

```
E_n ≈ -ba + (ℏ²/2m)^(1/3) (2b)^(2/3) |z_n|
```

where `z_n` are the negative zeros of Ai(z):

- z_0 ≈ -2.338
- z_1 ≈ -4.088
- z_2 ≈ -5.521
- (and so on...)

### Wavefunctions

In the well region (0 < x < a):

```
ψ(x) = N Ai(α(x - x_0))
```

where:

- `α = (2mb/ℏ²)^(1/3)` is the scaling parameter
- `x_0 = (E + ba)/b` is the classical turning point
- Ai(x) is the Airy function

Outside the well, the wavefunction decays exponentially.

### Numerical Methods

**Airy Function Calculation**:

- For small |x| (|x| < 3): Series expansion
- For large positive x: Asymptotic expansion with exponential decay
- For large negative x: Asymptotic expansion with oscillatory behavior

### Physical Significance

- Models quantum systems in electric fields (Stark effect)
- Describes field emission from surfaces
- Important in quantum cascade lasers
- Demonstrates tunneling in asymmetric potentials

---

## 9. Triangular Potential (Finite)

**File**: `triangular-potential.ts`

### Description

The finite triangular potential creates a triangular well with a minimum at x = 0 and linear slopes rising to finite barriers on both sides. This potential models quantum systems in constant electric fields with finite confinement.

### Potential

```
V(x) = height + offset    for x < 0
V(x) = offset             at x = 0
V(x) = offset + (height/width) * x    for 0 < x < width
V(x) = height + offset    for x > width
```

### Parameters

- `height`: Height of the potential barrier in Joules
- `width`: Width of the triangular region in meters
- `offset`: Energy offset/minimum of the well in Joules
- `mass` (m): Particle mass in kg
- `numStates`: Number of energy levels to calculate
- `gridConfig`: Grid configuration for wavefunction evaluation

### Energy Eigenvalues

Bound states exist when: `offset < E < height + offset`

Energy eigenvalues are found by solving boundary matching conditions using Airy functions with the bisection method:

```
E_n found via matching Ai(z) and Bi(z) at boundaries
```

where the slope parameter is `F = height/width`.

### Wavefunctions

In the triangular region (0 < x < width):

```
ψ(x) = A·Ai(α(x - x₀)) + B·Bi(α(x - x₀))
```

where:

- `α = (2mF/ℏ²)^(1/3)` is the scaling parameter
- `x₀ = (E - offset)/F` is the classical turning point
- Ai(x) and Bi(x) are Airy functions

In the barrier regions (x < 0 or x > width), the wavefunction decays exponentially.

### Numerical Methods

**Airy Function Calculation**:

- Uses the same Airy function implementations as asymmetric triangle potential
- Boundary matching via bisection method for eigenvalue search
- Wavefunction normalization across all regions

### Physical Significance

- Models quantum systems in uniform electric fields with finite barriers
- Describes field emission with confinement
- Important in quantum wells with applied bias
- Demonstrates quantum tunneling in linear potentials

---

## 11. Coulomb 1D Potential

**File**: `coulomb-1d-potential.ts`

The regular Dirichlet solution of `V(x) = -α/|x|` has `ψ(0) = 0` and is extended with odd parity on the full line. Let `a₀ = ℏ²/(mα)` and `N = 1, 2, ...`. Its exact energies and wavefunctions are:

```
E_N = -mα²/(2ℏ²N²)
ρ = 2|x|/(N a₀)
ψ_N(x) = sign(x) ρ e^(-ρ/2) L_(N-1)^1(ρ) / √(2N³a₀)
```

`L_(N-1)^1` is an associated Laguerre polynomial. The half-integer spectrum corresponds to a different singular boundary condition and is not used by this simulation. See Abramovici and Avishai, [The one-dimensional Coulomb Problem](https://arxiv.org/abs/0905.3978), section 4, and Totality's `CoulombSolution.ts`.

---

## 12. Double Square Well

**File**: `double-square-well.ts`

### Description

The double square well consists of two finite square wells separated by a barrier. This system is fundamental for understanding quantum tunneling, molecular bonding, and energy level splitting in symmetric systems.

### Potential

```
V(x) = 0     for x ∈ [-L_outer, -L_inner] ∪ [L_inner, L_outer]  (wells)
V(x) = V₀    for x ∈ [-L_inner, L_inner]                         (barrier)
V(x) = V₀    for |x| > L_outer                                    (outside)
```

where:

- `L_inner = wellSeparation / 2`
- `L_outer = L_inner + wellWidth`

### Parameters

- `wellWidth`: Width of each individual well in meters
- `wellDepth` (V₀): Height of barrier relative to wells in Joules (positive value)
- `wellSeparation`: Barrier width (edge-to-edge separation between wells) in meters
- `mass` (m): Particle mass in kg
- `numStates`: Number of energy levels to calculate
- `gridConfig`: Grid configuration for wavefunction evaluation

### Energy Eigenvalues

Bound state energies (0 < E < V₀) are found by solving transcendental equations from boundary matching.

Due to symmetry, wavefunctions have definite parity:

**Even parity states**: ψ(-x) = ψ(x)
**Odd parity states**: ψ(-x) = -ψ(x)

Energy levels alternate in parity: even, odd, even, odd, ...

### Wavefunctions

**Even parity** (ψ'(0) = 0):

- Barrier region: `ψ = A cosh(κx)`
- Well region: `ψ = B cos(k(x - L_inner)) + C sin(k(x - L_inner))`
- Outside: `ψ = D exp(-α|x - L_outer|)`

**Odd parity** (ψ(0) = 0):

- Barrier region: `ψ = A sinh(κx)`
- Well region: `ψ = B cos(k(x - L_inner)) + C sin(k(x - L_inner))`
- Outside: `ψ = D exp(-α|x - L_outer|)`

where:

- `k² = 2mE/ℏ²` (oscillatory in wells)
- `κ² = 2m(V₀ - E)/ℏ²` (exponential in barrier)
- `α² = 2m(V₀ - E)/ℏ²` (exponential outside)

### Numerical Methods

Eigenvalues are found using the **bisection method** applied to the transcendental equations from boundary condition matching:

1. Search for even and odd parity solutions separately
2. Iterate until convergence (tolerance: 10⁻¹⁰)
3. Sort and interleave solutions by parity to ensure correct ordering
4. Construct normalized wavefunctions with proper boundary matching

### Physical Significance

- Models molecular bonding in diatomic molecules (bonding and antibonding states)
- Demonstrates energy level splitting due to quantum tunneling
- Explains symmetric and antisymmetric wavefunctions in coupled quantum wells
- Important for:
  - Ammonia maser (NH₃ inversion)
  - Quantum dots and coupled quantum wells
  - Superlattices in semiconductors
  - Understanding exchange splitting

---

## 13. Multi-Square Well (Numerical)

**File**: `multi-square-well.ts`

**⚠️ NUMERICAL SOLUTION**: This potential is solved using numerical methods (DVR, FGH, or Matrix Numerov), not analytical formulas. The transcendental equations for N > 2 wells become intractable.

### Description

The multi-square well consists of 1-10 finite square wells arranged periodically along the x-axis. This system demonstrates band structure formation, quantum tunneling between multiple wells, and the emergence of energy bands as the number of wells increases.

### Potential

For N wells with width w, depth V₀, and separation d:

```
V(x) = -V₀   for x in any well region
V(x) = 0     for x in barrier regions or outside
```

The wells are arranged symmetrically about x = 0.

### Parameters

- `numberOfWells` (N): Number of wells (1-10)
- `wellWidth` (w): Width of each individual well in meters
- `wellDepth` (V₀): Depth of each well in Joules (positive value)
- `wellSeparation` (d): Edge-to-edge separation between adjacent wells in meters
- `mass` (m): Particle mass in kg
- `numStates`: Number of energy levels to calculate
- `gridConfig`: Grid configuration for wavefunction evaluation

### Energy Eigenvalues

Energy eigenvalues are found using **numerical methods** (DVR, FGH, or Matrix Numerov). The transcendental equations that arise from matching boundary conditions become extremely complex for N > 2 wells and have no practical closed-form solution.

As N increases:

- Energy levels split into bands
- Bandwidth increases with increasing well count
- Band gaps form between allowed energy bands
- Demonstrates the formation of energy bands in periodic potentials

### Wavefunctions

Wavefunctions are constructed by matching:

- Oscillatory solutions in wells: `ψ ∝ sin(kx)` or `cos(kx)`
- Exponential solutions in barriers: `ψ ∝ exp(κx)` or `exp(-κx)`
- Boundary conditions at each well-barrier interface

For symmetric arrangements, wavefunctions have definite parity.

### Numerical Methods

This potential requires full numerical eigensolvers:

- **DVR (Discrete Variable Representation)**: Recommended for general use
- **FGH (Fourier Grid Hamiltonian)**: Efficient for smooth potentials
- **Matrix Numerov**: Alternative finite-difference approach

The solver constructs the full Hamiltonian matrix and diagonalizes it to find eigenvalues and eigenvectors.

### Physical Significance

- Models quantum dot arrays and superlattices
- Demonstrates band structure formation in solids
- Shows quantum tunneling in periodic potentials
- Important for:
  - Semiconductor superlattices
  - Quantum cascade lasers
  - Photonic crystals (optical analogue)
  - Tight-binding models in solid state physics

---

## 14. Multi-Coulomb 1D (Numerical)

**File**: `multi-coulomb-1d.ts`

**⚠️ NUMERICAL SOLUTION**: This potential is solved using numerical methods (DVR, FGH, or Matrix Numerov). No closed-form analytical solution exists for N > 1 Coulomb centers in 1D.

### Description

The multi-Coulomb 1D potential consists of 1-10 Coulomb centers (1/|x-x_i| singularities) arranged periodically along the x-axis. This system models multi-atom quantum systems in one dimension, demonstrating molecular orbital formation and complex interference patterns.

### Potential

For N Coulomb centers at positions x_i with strength α:

```
V(x) = -α Σ(1/|x - x_i|)
```

The centers are arranged symmetrically about x = 0.

### Parameters

- `numberOfCenters` (N): Number of Coulomb centers (1-10)
- `centerSeparation` (d): Separation between adjacent centers in meters
- `coulombStrength` (α): Coulomb strength parameter in J·m
- `mass` (m): Particle mass in kg
- `numStates`: Number of energy levels to calculate
- `gridConfig`: Grid configuration for wavefunction evaluation

### Energy Eigenvalues

Energy eigenvalues are found using **numerical methods only** (DVR, FGH, or Matrix Numerov). The multi-center Coulomb problem has **no general closed-form analytical solution** for N > 1 centers, but exhibits:

- Energy level splitting proportional to coupling strength
- Formation of molecular-like bonding and antibonding states
- Complex energy level patterns for N > 2
- For N = 1, reduces to the single 1D Coulomb potential (analytical)

### Wavefunctions

Wavefunctions exhibit:

- **Odd parity at each Coulomb center**: ψ(x) must behave linearly near each singularity
- Complex interference patterns between centers
- Localization or delocalization depending on center separation
- For wide separation: approximate single-center behavior
- For close separation: strong hybridization and molecular orbital character

### Important Notes

Each Coulomb center imposes an **odd-parity constraint** similar to the single 1D Coulomb potential:

- Wavefunctions must vanish at each center: ψ(x_i) = 0
- Linear behavior near each center: ψ(x) ∝ (x - x_i) as x → x_i
- Overall parity depends on arrangement symmetry

### Numerical Methods

This potential requires full numerical eigensolvers:

- **DVR (Discrete Variable Representation)**: Recommended, handles singularities well
- **FGH (Fourier Grid Hamiltonian)**: May have issues near singularities
- **Matrix Numerov**: Alternative approach

Special considerations:

- Fine grid required near each singularity to resolve linear behavior
- Careful handling of 1/|x-x_i| singularities with small cutoff
- Validation against single-center analytical solution when N=1
- Grid spacing must be small enough to capture wavefunction zeros at each center

### Physical Significance

- Models 1D molecular systems with multiple atoms
- Demonstrates:
  - Molecular orbital formation
  - Bonding and antibonding states
  - LCAO (Linear Combination of Atomic Orbitals) approximation
  - Quantum interference in multi-center systems
- Related to:
  - Quantum wires with multiple impurities
  - 1D molecular chains
  - Theoretical studies of dimensional effects in chemistry

---

## Mathematical Utilities

**File**: `math-utilities.ts`

This file contains special functions and polynomials used by the analytical solutions:

### Special Functions

1. **Factorial**: `n!`
2. **Gamma Function**: `Γ(x)` - generalization of factorial
3. **Log-Gamma Function**: `log Γ(x)` - for numerical stability

### Orthogonal Polynomials

1. **Hermite Polynomials** `H_n(x)`: Used in harmonic oscillator
2. **Associated Laguerre Polynomials** `L_n^α(x)`: Used in Morse, Coulomb potentials
3. **Jacobi Polynomials** `P_n^(α,β)(x)`: Used in Pöschl-Teller, Rosen-Morse, Eckart potentials

### Airy Functions

1. **Ai(x)**: Decaying Airy function - used in asymmetric triangle potential
2. **Bi(x)**: Growing Airy function - available for general use
3. **Ai'(x)** and **Bi'(x)**: Derivatives for boundary matching

All polynomials are computed using stable recurrence relations to avoid numerical overflow.

---

## Usage Example

```typescript
import {
  solveInfiniteWell,
  solveHarmonicOscillator,
  solveCoulomb1DPotential,
  solveMultiSquareWell,
  solveMultiCoulomb1D,
} from "./analytical-solutions";

// Infinite square well
const infiniteWellResult = solveInfiniteWell(
  1e-9, // 1 nm well width
  9.109e-31, // electron mass
  5, // first 5 states
  { xMin: 0, xMax: 1e-9, numPoints: 1000 },
);

// Harmonic oscillator
const harmonicResult = solveHarmonicOscillator(
  100, // spring constant
  1e-27, // particle mass
  10, // first 10 states
  { xMin: -1e-9, xMax: 1e-9, numPoints: 1000 },
);

// Regular 1D Coulomb states
const coulombResult = solveCoulomb1DPotential(
  2.307e-28, // Coulomb strength for hydrogen
  9.109e-31, // electron mass
  3, // principal quantum numbers 1, 2, 3
  { xMin: -8e-9, xMax: 8e-9, numPoints: 1001 },
);

// Multi-square well (NEW)
const multiWellResult = solveMultiSquareWell(
  5, // 5 wells
  0.5e-9, // 0.5 nm well width
  8e-19, // 5 eV well depth (in Joules)
  0.3e-9, // 0.3 nm separation between wells
  9.109e-31, // electron mass
  10, // first 10 states
  { xMin: -5e-9, xMax: 5e-9, numPoints: 1000 },
);

// Multi-Coulomb 1D (NEW)
const multiCoulombResult = solveMultiCoulomb1D(
  3, // 3 Coulomb centers
  1e-9, // 1 nm separation between centers
  2.307e-28, // Coulomb strength
  9.109e-31, // electron mass
  5, // first 5 states
  { xMin: -5e-9, xMax: 5e-9, numPoints: 1000 },
);
```

---

## References

### Textbooks

1. Griffiths, D. J. (2018). _Introduction to Quantum Mechanics_ (3rd ed.)
2. Sakurai, J. J., & Napolitano, J. (2020). _Modern Quantum Mechanics_ (3rd ed.)
3. Landau, L. D., & Lifshitz, E. M. (1977). _Quantum Mechanics: Non-Relativistic Theory_
4. Cohen-Tannoudji, C., Diu, B., & Laloë, F. (1977). _Quantum Mechanics_

### Research Papers

1. Pöschl, G., & Teller, E. (1933). "Bemerkungen zur Quantenmechanik des anharmonischen Oszillators"
2. Morse, P. M. (1929). "Diatomic Molecules According to the Wave Mechanics"
3. Rosen, N., & Morse, P. M. (1932). "On the Vibrations of Polyatomic Molecules"
4. Eckart, C. (1930). "The Penetration of a Potential Barrier by Electrons"

### Online Resources

- NIST Digital Library of Mathematical Functions: https://dlmf.nist.gov/
- Wolfram MathWorld: https://mathworld.wolfram.com/
- Quantum Mechanics Course Notes: Various university resources

---

## License

This code is part of the QPPW (Quantum Potential Probability Wavefunction) project.
