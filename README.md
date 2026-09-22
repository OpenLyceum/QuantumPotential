# Quantum Potential Simulation

An interactive quantum mechanics simulation exploring the behavior of quantum particles in potential wells. This educational tool visualizes wave functions, probability densities, and energy levels for bound states in various quantum potentials.

## Overview

This simulation allows users to explore the properties of quantum "particles" bound in potential wells and observe how the wave functions and probability densities that describe them evolve (or don't evolve) over time. Users can interactively manipulate potential wells and see real-time solutions to the 1D Schrödinger equation.

### Key Features

- **Real-time Quantum Simulation**: Solves the 1D Schrödinger equation numerically in real time with the mass set to the electron mass
- **Interactive Potential Wells**: Click and drag directly on the potential energy diagram to modify well parameters
- **Multiple Well Types**: 12 analytically solvable potentials plus multi-well potentials:
  - **Analytical Solutions (12 potentials)**:
    - Infinite and finite square wells
    - Harmonic oscillator
    - Morse potential (with width parameterization)
    - Pöschl-Teller potential (with width parameterization)
    - Rosen-Morse potential (available in codebase)
    - Eckart potential (available in codebase)
    - Asymmetric triangle potential
    - Triangular potential
    - Coulomb 1D and 3D potentials
    - Double square well (for Two Wells screen)
  - **Numerical Multi-Well Potentials** (for Many Wells screen):
    - Multi-square well (1-10 wells, solved numerically)
    - Multi-Coulomb 1D (1-10 Coulomb centers, solved numerically)
- **Comprehensive Visualizations**:
  - Wave functions (real and imaginary parts, magnitude)
  - Probability density with filled area visualization
  - Phase-colored visualization showing quantum phase evolution
  - Wavefunction zeros (node positions) visualization
  - Interactive energy level selection with hover labels
  - High-resolution wavefunction display (1000 points for analytical solutions)
- **Energy Level Display**: Observe discrete energy levels with color-coded selection
- **Time Evolution**: Watch quantum phase evolution in real-time animation with proper eigenstate evolution
- **Superposition States**: Create and visualize quantum superpositions:
  - Single eigenstate (ψₖ)
  - Two-state superposition (ψ₀ + ψ₁)
  - Localized wavepackets (narrow and wide)
  - Coherent states (true coherent states for harmonic oscillator, coherent-like wavepackets for other potentials)
  - Custom superpositions
- **Parameter Controls**: Adjust well width, depth, and offset interactively

### Learning Objectives

This simulation is designed to help students understand:

- **Wave-Particle Duality**: Observe how quantum particles behave as waves
- **Quantum Confinement**: See how boundary conditions lead to discrete energy levels
- **Probability Interpretation**: Understand the relationship between wave function and probability density
- **Energy Splitting**: Use the double well configuration to illustrate symmetric and antisymmetric wave functions
- **Quantum Tunneling**: Visualize tunneling effects in barrier potentials
- **Uncertainty Principle**: Explore the relationship between position and momentum uncertainty
- **Simple Harmonic Oscillator**: Study one of the fundamental quantum systems
- **Coulomb Potential**: Investigate the quantum mechanics of the hydrogen atom

## Topics Covered

- Quantum Mechanics
- Wave Functions
- Energy Levels
- Potential Energy
- Potential Wells
- Probability Density
- Simple Harmonic Oscillator
- Hydrogen Atom
- Superposition
- Uncertainty Principle

## Technical Details

### Requirements

- **Node.js**: Version 18 or higher
- **Package Manager**: npm

### Technology Stack

- **SceneryStack**: Framework for interactive physics simulations
  - Uses Bamboo for chart rendering (ChartTransform, TickMarkSet, TickLabelSet)
  - Scenery for interactive graphics and user input
  - Axon for reactive properties and data binding
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and development server
- **Quantum Solvers**: Multiple numerical methods with analytical solutions
  - **Analytical Solutions**: Exact solutions for 12 potentials evaluated at 1000 grid points
    - Infinite/finite square wells
    - Harmonic oscillator
    - Morse potential (width-parameterized)
    - Pöschl-Teller potential (width-parameterized)
    - Rosen-Morse and Eckart potentials
    - Coulomb 1D and 3D
    - Asymmetric triangle and triangular potentials
    - Double square well
  - **Multi-Well Potentials** (numerical):
    - Multi-square well (1-10 wells)
    - Multi-Coulomb 1D (1-10 centers)
  - **Numerical Methods**: For validation and extension
    - DVR (Discrete Variable Representation) - Default method
    - Spectral (Chebyshev polynomial) method
    - Matrix Numerov
    - FGH (Fourier Grid Hamiltonian)
    - Shooting Numerov (classical shooting method)
    - QuantumBound (advanced inward-outward shooting with logarithmic derivative)
- **Time Evolution**: Proper quantum dynamics with individual eigenstate phase evolution for superpositions

### Installation

```bash
# Clone the repository
git clone https://github.com/veillette/QPPW.git

# Navigate to the project directory
cd QPPW

# Install dependencies
npm install
```

### Development

```bash
# Start development server
npm run dev

# Type checking
npm run check

# Lint code
npm run lint

# Format code
npm run format
```

### Building

```bash
# Build for production
npm run build

# Build generates a single HTML file for easy deployment
```

### Testing

The project includes comprehensive test suites to verify the accuracy of quantum mechanical calculations across all numerical methods and potential types.

**Quick test commands:**

```bash
# Run all tests
npm test

# Run specialized tests
npm run test:double-well        # Double well comprehensive tests
npm run test:coulomb            # Coulomb potential verification
npm run test:multi-square-well  # Multi-well square potential tests
npm run test:multi-coulomb-1d   # Multi-Coulomb 1D tests
```

#### Method 1: Terminal-Based Tests (Fastest)

Run the complete test suite directly in your terminal:

```bash
npm test
```

This command:

- Runs comprehensive accuracy tests across 6 numerical methods (DVR, Spectral, Matrix Numerov, FGH, Shooting Numerov, and QuantumBound)
- Tests harmonic oscillator, finite square wells, 3D Coulomb potential, Morse potential, Pöschl-Teller potential, and double wells
- Uses grid sizes of 32, 64, and 128 points
- Displays detailed pass/fail results with error percentages
- Shows performance metrics (execution times) for each method
- Provides a summary of passed/failed tests

**Output includes:**

- ✓/✗ Pass/fail indicators for each test
- Numerical vs analytical energy comparisons
- Error percentages for each energy level
- Performance summary with timing statistics

#### Method 2: Browser-Based Tests with Visual Interface

The easiest way to run the comprehensive test suite:

```bash
# 1. Build the project (required)
npm run build

# 2. Open the test runner in your browser
# On macOS:
open tests/accuracy-tests.html
# On Linux:
xdg-open tests/accuracy-tests.html
# On Windows:
start tests/accuracy-tests.html
```

The browser test interface provides:

- **Run Full Tests** button - Comprehensive test suite with multiple potentials and methods
- **Run Quick Check** button - Rapid validation subset
- Visual pass/fail indicators with color coding
- Detailed error percentages and performance metrics
- Side-by-side comparison of numerical vs analytical solutions

Results are displayed in the browser console with formatted output.

#### Method 3: Development Server with Interactive Console

Run tests interactively through the development server:

```bash
# 1. Start the development server
npm start

# 2. Open your browser to: http://localhost:5173/tests/accuracy-tests.html
#    (If port 5173 is in use, Vite will use the next available port)

# 3. Click "Run Full Tests" or "Run Quick Check" buttons
```

The test page displays results in a formatted console with color-coded pass/fail indicators.

**Alternative**: Run tests via browser developer console:

```javascript
# From http://localhost:5173 open the console (F12) and run:
import('/src/common/model/AccuracyTests.ts').then(m => m.runAccuracyTests());

# Or for a quick validation:
import('/src/common/model/AccuracyTests.ts').then(m => m.runQuickAccuracyCheck());
```

#### Test Coverage

The project includes two comprehensive test suites:

**1. Accuracy Tests** (`npm test`) - Validates all numerical methods against analytical solutions:

- **Harmonic Oscillator** - 10 energy levels, 0.1% tolerance
- **Finite Square Wells** (4 configurations) - 0.5% tolerance
- **3D Coulomb/Hydrogen Atom** - 1.0% tolerance
- **Morse Potential** - Vibrational levels, 1.0% tolerance
- **Pöschl-Teller Potential** - Bound states, 1.0% tolerance
- **Double Square Wells** (3 configurations) - 1.0% tolerance
- Tests all 6 numerical methods (DVR, Spectral, Matrix Numerov, FGH, Shooting Numerov, QuantumBound)
- Multiple grid sizes (32, 64, 128 points)

**2. Double Well Test Suite** (`npm run test:double-well`) - **23 stringent tests** for double quantum wells:

- Parity alternation, node counting, edge behavior
- Normalization (0.2% tolerance), energy ordering
- Derivative continuity (1.5% tolerance)
- **Orthogonality of eigenstates** (1% tolerance)
- **Wavefunction continuity** at boundaries
- **Probability localization** (>70% in wells required)
- **Energy bounds validation** (0 < E < V₀)
- **Tunneling/energy splitting consistency**
- Parameter variations and extreme regimes
- Grid convergence with 1500 points

These tests ensure numerical accuracy and physical correctness across all quantum systems in the simulation.

For more details, see [`tests/README.md`](tests/README.md).

## Deployment

The simulation is designed to be deployed as a single HTML file, making it easy to:

- Host on GitHub Pages
- Embed in educational platforms
- Distribute to students
- Use offline in classrooms

The included GitHub Actions workflow automates:

- Type checking and linting
- Building the simulation
- Deployment to GitHub Pages
- Release creation for tagged versions

## Accessibility

This project is committed to making quantum mechanics education accessible to all students. We are implementing comprehensive accessibility features including:

- Screen reader compatibility (NVDA, JAWS, VoiceOver, TalkBack)
- Full keyboard navigation
- Semantic HTML structure (PDOM - Parallel DOM)
- Live announcements for state changes
- Accessible descriptions of visualizations

For details on our accessibility implementation, see:

- [ACCESSIBILITY.md](ACCESSIBILITY.md) - Overview and current status
- [Accessibility Implementation Plan](docs/ACCESSIBILITY_IMPLEMENTATION_PLAN.md) - Detailed technical plan

## Educational Use

This simulation is ideal for:

- **Introductory Quantum Mechanics Courses**: Visualizing abstract quantum concepts
- **Advanced Physics Classes**: Exploring specific quantum systems in detail
- **Self-Directed Learning**: Interactive exploration of quantum phenomena
- **Classroom Demonstrations**: Real-time visualization of quantum mechanics

### Teaching Tips

1. **Start Simple**: Begin with a single square well to introduce basic concepts
2. **Build Intuition**: Have students manipulate the potential and observe how wave functions change
3. **Compare Systems**: Use different potential configurations to highlight similarities and differences
4. **Quantitative Analysis**: Encourage students to relate observed patterns to theoretical predictions
5. **Double Wells**: Use the two-well configuration to discuss molecular bonding and energy splitting

## Inspiration

This project was inspired by [PhET Interactive Simulations](https://phet.colorado.edu/), specifically the Quantum Bound States simulation, which has been a valuable educational resource for teaching quantum mechanics to students worldwide.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [SceneryStack](https://github.com/phetsims/scenery) framework
- Inspired by PhET Interactive Simulations at the University of Colorado Boulder
- Developed to make quantum mechanics more accessible and intuitive for students
