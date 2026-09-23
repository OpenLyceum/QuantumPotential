# Quantum Bound States - Implementation Notes

## Overview

This document provides a high-level overview of the Quantum Bound States (QPPW) simulation implementation to supplement the internal documentation (source code comments) and external documentation (teacher guide). It is intended for developers who want to understand, maintain, or extend the simulation.

**Authors**: Martin Veillette
**Last Updated**: November 2024

## General Design Philosophy

QPPW follows a Model-View-Controller (MVC) architecture as established by PhET Interactive Simulations and the SceneryStack framework:

- **Model**: Handles quantum mechanical calculations, potential definitions, and time evolution
- **View**: Renders visualizations, charts, and interactive controls
- **Controller**: Manages user input, property updates, and coordinate transformations (implicit in SceneryStack)

The simulation emphasizes:

- **Accuracy**: Provides both analytical solutions (when available) and validated numerical methods
- **Performance**: Uses optimized numerical algorithms and caching strategies
- **Modularity**: Separates concerns between physics, numerics, and visualization
- **Extensibility**: Makes it easy to add new potential types or visualization modes

## Technology Stack

- **SceneryStack**: PhET's framework for interactive simulations
  - **Scenery**: Scene graph and rendering engine
  - **Axon**: Observable properties and data binding
  - **Bamboo**: Chart rendering components (ChartTransform, TickMarkSet, TickLabelSet)
  - **Sun**: UI controls (buttons, sliders, panels)
  - **Dot**: Mathematical utilities (vectors, ranges, matrices)
  - **Phet-core**: Core utilities and patterns
- **TypeScript**: Type-safe development with strict mode enabled
- **Vite**: Fast build tool and development server
- **KaTeX**: Mathematical equation rendering

## Project Structure

```
QPPW/
├── src/
│   ├── main.ts                          # Entry point, simulation setup
│   ├── preferences/                     # QPPWPreferencesModel, QPPWPreferencesNode, qppwQueryParameters
│   ├── QPPWColors.ts                    # Color scheme definitions
│   ├── i18n/                            # Internationalization strings
│   ├── common/                          # Shared code across all screens
│   │   ├── model/
│   │   │   ├── BaseModel.ts             # Abstract base model for all screens
│   │   │   ├── Schrodinger1DSolver.ts   # Main solver dispatcher
│   │   │   ├── PotentialFunction.ts     # Potential type definitions and interfaces
│   │   │   ├── QuantumConstants.ts      # Physical constants (ℏ, m_e, eV, etc.)
│   │   │   ├── SuperpositionType.ts     # Superposition state definitions
│   │   │   ├── FGHSolver.ts             # Fourier Grid Hamiltonian solver
│   │   │   ├── NumerovSolver.ts         # Shooting Numerov solver
│   │   │   ├── numerov/                 # Numerov shooting solver (ported from Quantum Bound States)
│   │   │   ├── analytical-solutions/    # Exact solutions for specific potentials
│   │   │   │   ├── infinite-square-well.ts
│   │   │   │   ├── finite-square-well.ts
│   │   │   │   ├── harmonic-oscillator.ts
│   │   │   │   ├── morse-potential.ts
│   │   │   │   ├── poschl-teller.ts
│   │   │   │   ├── coulomb-1d.ts
│   │   │   │   ├── coulomb-3d.ts
│   │   │   │   ├── double-square-well.ts
│   │   │   │   └── ... (other analytical solutions)
│   │   │   └── potentials/              # Potential function implementations
│   │   │       ├── InfiniteSquareWellPotential.ts
│   │   │       ├── FiniteSquareWellPotential.ts
│   │   │       ├── HarmonicOscillatorPotential.ts
│   │   │       └── ... (other potentials)
│   │   └── view/
│   │       ├── BaseScreenView.ts        # Abstract base view for all screens
│   │       ├── BaseChartNode.ts         # Base class for chart visualizations
│   │       ├── WaveFunctionChartNode.ts # Wave function display
│   │       ├── EnergyChartNode.ts       # Energy level diagram
│   │       ├── WavenumberChartNode.ts   # Momentum space representation
│   │       ├── ControlPanelNode.ts      # Energy panel + graph panel (One/Two/Many Wells)
│   │       ├── handles/                 # Drag handles on the potential curve
│   │       ├── SimulationControlBar.ts  # Play/pause/step controls
│   │       └── SuperpositionDialog.ts   # Superposition state selection
│   ├── intro/                           # Intro screen (simplified interface)
│   │   ├── IntroScreen.ts
│   │   ├── model/IntroModel.ts
│   │   └── view/IntroScreenView.ts
│   ├── one-well/                        # One Well screen (main exploration)
│   │   ├── OneWellScreen.ts
│   │   ├── model/OneWellModel.ts
│   │   └── view/OneWellScreenView.ts
│   ├── two-wells/                       # Two Wells screen (double well potential)
│   │   ├── TwoWellsScreen.ts
│   │   ├── model/TwoWellsModel.ts
│   │   └── view/TwoWellsScreenView.ts
│   └── many-wells/                      # Many Wells screen (multi-well systems)
│       ├── ManyWellsScreen.ts
│       ├── model/ManyWellsModel.ts
│       └── view/ManyWellsScreenView.ts
├── tests/
│   ├── *.test.ts, common/model/*.test.ts  # Vitest unit tests (run by CI)
│   └── accuracy/                          # Hand-run solver accuracy scripts (npm run test:accuracy, …)
└── doc/
    ├── model.md                         # Educational resource for instructors
    ├── implementation-notes.md          # This file
    ├── SOLVER_DOCUMENTATION.md          # Detailed solver documentation
    └── PERFORMANCE_MONITORING.md        # Performance profiling guide
```

## Key Design Patterns

### 1. Model-View Separation

Each screen follows a strict Model-View separation:

**Model Responsibilities**:

- Quantum mechanical calculations
- Time evolution of quantum states
- Energy eigenvalue/eigenfunction computation
- Physical parameter management
- State synchronization

**View Responsibilities**:

- Chart rendering (wave functions, energy levels, momentum space)
- User interface controls
- Coordinate transformations (model ↔ view)
- Visual styling and layout
- User input handling

### 2. Property-Based Reactivity

All dynamic state uses SceneryStack's `Property` pattern:

```typescript
// Example from BaseModel
public readonly potentialTypeProperty: EnumerationProperty<PotentialType>;
public readonly energyLevelIndexProperty: NumberProperty;
public readonly superpositionTypeProperty: EnumerationProperty<SuperpositionType>;
```

Views observe properties and automatically update when values change:

```typescript
// Automatic view synchronization
model.energyLevelIndexProperty.link((energyLevelIndex) => {
  // Update visualization
  this.updateWaveFunctionDisplay();
});
```

This pattern ensures:

- Unidirectional data flow (model → view)
- Automatic UI synchronization
- Easy debugging (all state changes are observable)
- Testability (properties can be set programmatically)

### 3. Abstract Base Classes

**BaseModel** provides common functionality:

- Time evolution (`step(dt)` method)
- Simulation control (play/pause, time speed)
- Solver configuration and dispatch
- Well parameter management
- Superposition state generation

**BaseScreenView** provides common visualization:

- Chart layout and positioning
- Control panel structure
- Play/pause/step controls
- Superposition dialog management
- Coordinate system transformations

**BaseChartNode** provides common chart functionality:

- Bamboo ChartTransform for model-to-view coordinate mapping
- Axis rendering and tick marks
- Grid display
- Label positioning
- Zoom/pan handling (where applicable)

Screens extend these bases and add screen-specific features:

```typescript
export class OneWellModel extends BaseModel {
  // Add one-well-specific properties and methods
}

export class OneWellScreenView extends BaseScreenView {
  // Add one-well-specific visualizations
}
```

## Simulation Architecture

### Screen Structure

QPPW has four screens, each targeting different learning objectives:

#### 1. Intro Screen

- **Purpose**: Simplified introduction to quantum bound states
- **Features**: Basic potential types, limited controls
- **Target**: First-time users, high school students
- **Unique Aspects**:
  - Fewer potential types (square well, harmonic oscillator)
  - Simplified parameter controls
  - Focus on core concepts

#### 2. One Well Screen

- **Purpose**: Comprehensive exploration of single-well potentials
- **Features**: All 12 analytical potentials, full parameter control
- **Target**: Undergraduate quantum mechanics students
- **Unique Aspects**:
  - Complete potential library
  - Advanced visualization options (phase, nodes, magnitudes)
  - Full superposition capabilities
  - Classical probability comparison

#### 3. Two Wells Screen

- **Purpose**: Explore double-well systems and energy splitting
- **Features**: Double square well, barrier height control
- **Target**: Advanced undergraduate students
- **Unique Aspects**:
  - Demonstrates tunneling and energy level splitting
  - Shows symmetric/antisymmetric wave functions
  - Relates to molecular bonding concepts
  - Parity alternation visualization

#### 4. Many Wells Screen

- **Purpose**: Explore multi-well systems and band structure formation
- **Features**: 1-10 wells, numerical solving only
- **Target**: Advanced students, graduate level
- **Unique Aspects**:
  - Band structure emergence
  - Multi-Coulomb 1D systems
  - Numerical method demonstration
  - Introduction to solid-state physics concepts

### Model Architecture

#### BaseModel Structure

The `BaseModel` class manages:

1. **Physical Properties**:

   ```typescript
   public readonly potentialTypeProperty: EnumerationProperty<PotentialType>;
   public readonly wellWidthProperty: NumberProperty;
   public readonly wellDepthProperty: NumberProperty;
   public readonly wellOffsetProperty: NumberProperty;
   public readonly particleMassProperty: NumberProperty;
   ```

2. **Quantum State**:

   ```typescript
   public readonly energyLevelIndexProperty: NumberProperty;
   public readonly superpositionTypeProperty: EnumerationProperty<SuperpositionType>;
   private currentWaveFunction: BoundStateResult | null;
   private currentEnergies: number[];
   ```

3. **Time Evolution**:

   ```typescript
   public readonly isPlayingProperty: Property<boolean>;
   public readonly timeSpeedProperty: EnumerationProperty<TimeSpeed>;
   private elapsedTime: number;

   public step(dt: number): void {
     if (this.isPlayingProperty.value) {
       this.elapsedTime += dt * this.timeSpeedProperty.value.scale;
       this.updateQuantumPhase();
     }
   }
   ```

4. **Solver Management**:

   ```typescript
   private solver: Schrodinger1DSolver;

   private updateQuantumState(): void {
     const result = this.solver.solve(
       this.currentPotential,
       this.wellWidthProperty.value,
       /* ... other parameters ... */
     );
     this.currentWaveFunction = result;
   }
   ```

#### Solver Architecture

`Schrodinger1DSolver` is a facade. Screen models call `solveAnalyticalIfPossible`, which uses the
closed-form solution for every single- and double-well potential, and the numerical path only for the
Many Wells potentials:

- **Analytical solutions** (12 potentials): exact energies from closed-form or transcendental equations,
  with wave functions evaluated on the model's grid.
- **Numerical solution** (multi-square well and multi-Coulomb 1D, 1–10 wells, optional electric-field
  tilt): Numerov shooting with node-count bracketing, parity mirroring for symmetric potentials, and
  inverse-iteration clean-up. `?numericalMethod=fgh` switches to a Fourier Grid Hamiltonian cross-check.

See [SOLVER_DOCUMENTATION.md](SOLVER_DOCUMENTATION.md) for the details.

### Superposition States

The simulation supports various superposition types:

```typescript
export enum SuperpositionType {
  SINGLE_STATE = "singleState", // Pure eigenstate ψₙ
  TWO_STATE_SUPERPOSITION = "twoState", // ψ₀ + ψ₁
  NARROW_WAVE_PACKET = "narrowWavePacket", // Localized Gaussian
  WIDE_WAVE_PACKET = "wideWavePacket", // Broader Gaussian
  COHERENT_STATE = "coherentState", // Coherent state (for HO)
  CUSTOM = "custom", // User-defined coefficients
}
```

**Superposition Construction**:

1. Compute all needed eigenstates
2. Apply coefficients (Gaussian weights for wave packets)
3. Normalize the total state
4. For coherent states: use analytical formulas (harmonic oscillator) or approximate (other potentials)

**Time Evolution**:

```typescript
ψ(x,t) = Σₙ cₙ ψₙ(x) exp(-iEₙt/ℏ)
```

Each eigenstate evolves independently with its energy-dependent phase.

### View Architecture

#### Chart Rendering

Charts use **Bamboo** components from SceneryStack:

```typescript
export class WaveFunctionChartNode extends BaseChartNode {
  private chartTransform: ChartTransform;
  private waveFunctionPath: Path;
  private probabilityPath: Path;

  protected updateChart(): void {
    // Transform model coordinates to view coordinates
    const viewPoints = modelPoints.map((p) =>
      this.chartTransform.modelToViewPosition(p),
    );

    // Update path shapes
    this.waveFunctionPath.shape = new Shape()
      .moveTo(viewPoints[0].x, viewPoints[0].y)
      .lineTo(/* ... */);
  }
}
```

**ChartTransform** handles:

- Model coordinate system (physical units: nm, eV)
- View coordinate system (screen pixels)
- Scaling and translation
- Inverted y-axis (screen coordinates vs. Cartesian)

#### Layout and Interactive Controls

The One, Two and Many Wells screens use the layout of PhET's *Quantum Bound States*
(`BaseScreenView.createStandardLayout`):

- The energy chart sits on top, with its legend in a row above it. It has no position labels of its own:
  the wave-function chart directly below it carries the shared x axis. Both charts keep numeric y axes
  with units.
- Two panels sit in a column on the right, 250 px wide:
  - the energy panel, beside the energy chart: potential, superposition, and ◀ ▶ spinners for particle
    mass, number of wells and electric field;
  - the graph panel, beside the wave-function chart: display mode and the parts of ψ to draw.
- The time controls sit under the charts, and the reset button in the corner.

**Direct manipulation on the energy chart**:

- **Potential handles** (`src/common/view/handles/`) are double-headed arrows on the curve. Dragging one
  changes width, depth, barrier height, offset or separation. Each handle is declared by its anchor (its
  point on the curve as a function of its parameter); the drag inverts the anchor. Handles are
  accessible sliders for the keyboard.
- **Energy levels**: the level nearest the pointer is highlighted, and a click selects it. "Eₙ = … eV"
  readouts show the selected and hovered levels. Arrow keys, Home and End also move the selection.
- The panel sliders for the geometric parameters appear only with `?dev`.

**Simulation Controls**:

- Play/Pause button
- Step button (advance by one frame)
- Time speed control (normal, slow, fast)
- Reset button (restore initial state)

## Key Implementation Details

### 1. Coordinate Systems

The simulation uses multiple coordinate systems:

**Model Coordinates** (SI-based):

- Position: nanometers (nm)
- Energy: electron volts (eV)
- Wave function: 1/√nm (normalized)
- Time: seconds (s)

**View Coordinates**:

- Screen pixels
- Origin at top-left
- Y-axis inverted (down is positive)

**Transformations**:

```typescript
// Model to View
const viewX = chartTransform.modelToViewX(modelX);
const viewY = chartTransform.modelToViewY(modelY);

// View to Model
const modelX = chartTransform.viewToModelX(viewX);
const modelY = chartTransform.viewToModelY(viewY);
```

**Normalized Coordinates** (for some potentials):

- Position: x/L (dimensionless, 0 to 1)
- Energy: E/V₀ (dimensionless)
- Used internally for some analytical solutions

### 2. Time Evolution

**Eigenstate Evolution**:

- Individual eigenstates: Only phase changes, no shape change
- Phase evolution: θₙ(t) = -Eₙt/ℏ
- Visualization: Can show phase using color coding

**Superposition Evolution**:

- Each component evolves independently
- Total state: ψ(x,t) = Σₙ cₙ ψₙ(x) exp(-iEₙt/ℏ)
- Probability density oscillates periodically
- Beat frequencies: (Eₘ - Eₙ)/ℏ

**Implementation**:

```typescript
public step(dt: number): void {
  if (!this.isPlayingProperty.value) return;

  // Update elapsed time
  this.elapsedTime += dt * this.getTimeSpeedScale();

  // Update quantum phases for each eigenstate
  this.updateQuantumPhases();

  // Trigger view update
  this.waveFunctionChangedEmitter.emit();
}

private updateQuantumPhases(): void {
  for (let n = 0; n < this.eigenstates.length; n++) {
    const energy = this.energies[n];
    const phase = -energy * this.elapsedTime / QuantumConstants.HBAR;
    this.phases[n] = phase;
  }
}
```

### 3. Numerical Stability

**Potential Issues**:

- Division by zero at classical turning points
- Overflow/underflow in exponential wave function tails
- Ill-conditioned matrices for extreme parameters

**Solutions Implemented**:

1. **Classical Probability Clamping**:

   ```typescript
   // Prevent infinities at turning points
   const MIN_KINETIC_ENERGY_FRACTION = 0.01;
   const clampedKE = Math.max(maxKE * MIN_KINETIC_ENERGY_FRACTION, actualKE);
   ```

2. **Wave Function Normalization**:

   ```typescript
   // Normalize to prevent overflow
   const norm = Math.sqrt(this.integrateProbability(waveFunction));
   waveFunction = waveFunction.map((psi) => psi / norm);
   ```

3. **Energy Bounds Checking**:

   ```typescript
   // Ensure energies are within valid range
   if (energy < potential.minEnergy || energy > potential.maxEnergy) {
     console.warn("Energy out of bounds, clamping");
     energy = clamp(energy, potential.minEnergy, potential.maxEnergy);
   }
   ```

4. **Grid Resolution Adaptation**:
   - Analytical solutions: 1000 points (high resolution)
   - Numerical solutions: 64-256 points (performance/accuracy trade-off)
   - Multi-well systems: Adaptive based on number of wells

### 4. Performance Optimization

**Caching Strategies**:

1. **Eigenstate Caching**:

   ```typescript
   private eigenstateCache: Map<string, BoundStateResult>;

   private getCacheKey(): string {
     return `${this.potentialType}_${this.width}_${this.depth}_${...}`;
   }

   private getEigenstate(n: number): BoundStateResult {
     const key = this.getCacheKey();
     if (!this.eigenstateCache.has(key)) {
       this.eigenstateCache.set(key, this.computeEigenstate(n));
     }
     return this.eigenstateCache.get(key)!;
   }
   ```

2. **Lazy Evaluation**:
   - Only compute eigenstates when requested
   - Don't recompute if parameters haven't changed
   - Defer expensive calculations until user interaction pauses

3. **View Culling**:
   - Only render visible portions of charts
   - Skip rendering when view is off-screen
   - Reduce resolution for distant objects

**Profiling Results** (see PERFORMANCE_MONITORING.md):

- Analytical solutions: ~1-5 ms
- Numerov, multi-well (1001 points): ~15 ms for 3 wells, ~60 ms for 10; scales with states × points

### 5. Memory Management

**Object Lifecycle**:

Most objects persist for the simulation lifetime:

- Models (one per screen)
- Screen views (one per screen)
- Chart nodes (created once, updated dynamically)
- Control panels (static)

**Disposal Pattern**:

Few objects require explicit disposal:

```typescript
public dispose(): void {
  this.eigenstateCache.clear();
  this.property.dispose();
  this.emitter.dispose();
  super.dispose();
}
```

Most cleanup happens automatically through SceneryStack's scene graph management.

**Assertions**:

Development builds include assertions for validation:

```typescript
assert &&
  assert(
    waveFunctionNorm > 0.99 && waveFunctionNorm < 1.01,
    "Wave function normalization failed",
  );

assert &&
  assert(energies[n] < energies[n + 1], "Energy levels not properly ordered");
```

Assertions are stripped in production builds for performance.

## Testing Strategy

### Unit Tests

Terminal-based tests verify numerical accuracy:

```bash
npm test                      # Run full test suite
npm run test:double-well      # Test double well specifically
npm run test:coulomb          # Test Coulomb potential
npm run test:multi-square-well # Test multi-well systems
```

**Test Coverage**:

- All 12 analytical potentials
- The Numerov solver (invariants, closed-form spectra, tilted wells, FGH cross-check)
- Accuracy tolerances: 0.1% - 1.0% depending on potential
- Double well stringent tests: 23 tests including orthogonality, continuity, tunneling

### Validation Approach

1. **Analytical vs. Numerical**:
   - Compare numerical methods to analytical solutions
   - Verify convergence with grid refinement
   - Check energy eigenvalue accuracy

2. **Physical Constraints**:
   - Energy ordering: E₀ < E₁ < E₂ < ...
   - Wave function normalization: ∫|ψ|²dx = 1
   - Node counting: n nodes for nth eigenstate
   - Orthogonality: ∫ψₙ\*ψₘdx = δₙₘ
   - Parity (symmetric potentials): ψ(-x) = ±ψ(x)

3. **Known Limits**:
   - Infinite well → finite well as V₀ → ∞
   - Harmonic oscillator: Equally spaced levels
   - Hydrogen atom: E ∝ -1/n²

## Adding New Features

### Adding a New Potential Type

1. **Define the potential** in `src/common/model/potentials/`:

   ```typescript
   export class NewPotential implements PotentialFunction {
     public readonly type = PotentialType.NEW_POTENTIAL;
     public readonly hasAnalyticalSolution = true; // or false

     public evaluate(x: number, width: number, depth: number): number {
       // Return V(x)
     }

     public getEnergyRange(width: number, depth: number): Range {
       // Return valid energy range
     }
   }
   ```

2. **Add analytical solution** (if available) in `src/common/model/analytical-solutions/`:

   ```typescript
   export function solveNewPotential(
     width: number,
     depth: number,
     numPoints: number
   ): BoundStateResult {
     // Compute eigenvalues and eigenfunctions analytically
     return {
       energies: [...],
       waveFunctions: [...],
       positions: [...]
     };
   }
   ```

3. **Register in PotentialType enum**:

   ```typescript
   export enum PotentialType {
     // ... existing types ...
     NEW_POTENTIAL = "newPotential",
   }
   ```

4. **Add to solver dispatcher** in `Schrodinger1DSolver.ts`:

   ```typescript
   if (potential.type === PotentialType.NEW_POTENTIAL) {
     return solveNewPotential(width, depth, numPoints);
   }
   ```

5. **Add UI controls** in appropriate screen view:

   ```typescript
   if (potentialType === PotentialType.NEW_POTENTIAL) {
     // Add parameter sliders, controls, etc.
   }
   ```

6. **Add tests** in `tests/`:
   - Verify analytical solution (if applicable)
   - Compare against the numerical solver
   - Check physical constraints

### Changing the Numerical Solver

The numerical path lives in `Schrodinger1DSolver.solveNumerical`. It dispatches on `NumericalMethod`
(`NUMEROV`, or `FGH` for cross-checks) and converts SI to the Numerov solver's nm/eV/mₑ units. A new
method should return a `BoundStateResult` in SI units. Check it against
`tests/common/model/numerov-solver.test.ts` and `npm run test:accuracy`.

### Adding a New Visualization

1. **Create chart node** in `src/common/view/`:

   ```typescript
   export class NewVisualizationNode extends BaseChartNode {
     public constructor(model: BaseModel, options?: NewVisualizationOptions) {
       super(model, options);

       // Create Bamboo chart
       this.chartTransform = new ChartTransform({
         viewWidth: 400,
         viewHeight: 300,
         modelXRange: new Range(-width / 2, width / 2),
         modelYRange: new Range(minValue, maxValue),
       });

       // Add visual elements
       this.addChild(new Path(/* ... */));
     }

     protected updateChart(): void {
       // Update visualization when model changes
     }
   }
   ```

2. **Add to screen view**:

   ```typescript
   const newVisualization = new NewVisualizationNode(model);
   this.addChild(newVisualization);
   ```

3. **Link to model properties**:
   ```typescript
   model.waveFunctionChangedEmitter.addListener(() => {
     newVisualization.update();
   });
   ```

### Adding a New Screen

1. **Create screen directory**: `src/new-screen/`

2. **Implement model**:

   ```typescript
   export class NewScreenModel extends BaseModel {
     // Add screen-specific properties and methods
   }
   ```

3. **Implement view**:

   ```typescript
   export class NewScreenView extends BaseScreenView {
     // Add screen-specific visualizations
   }
   ```

4. **Implement screen class**:

   ```typescript
   export class NewScreen extends Screen<NewScreenModel, NewScreenView> {
     public constructor() {
       super(
         () => new NewScreenModel(),
         (model) => new NewScreenView(model),
       );
     }
   }
   ```

5. **Register in main.ts**:
   ```typescript
   const sim = new Sim(
     "QPPW",
     [
       new IntroScreen(),
       new OneWellScreen(),
       new TwoWellsScreen(),
       new ManyWellsScreen(),
       new NewScreen(), // Add here
     ],
     simOptions,
   );
   ```

## Common Pitfalls and Solutions

### Pitfall 1: Coordinate System Confusion

**Problem**: Mixing up model and view coordinates leads to incorrect rendering.

**Solution**: Always use `ChartTransform` methods explicitly:

```typescript
// ✓ Correct
const viewX = this.chartTransform.modelToViewX(modelX);

// ✗ Incorrect
const viewX = modelX * someScaleFactor; // Don't do this!
```

### Pitfall 2: Forgetting to Link Properties

**Problem**: View doesn't update when model changes.

**Solution**: Always link view updates to model properties:

```typescript
model.energyLevelIndexProperty.link(() => {
  this.updateVisualization();
});
```

### Pitfall 3: Numerical Instability

**Problem**: Solver fails or produces garbage for certain parameters.

**Solution**: Add bounds checking and validation:

```typescript
assert && assert(isFinite(energy), "Energy is not finite");
assert && assert(norm > 0, "Norm is non-positive");
```

### Pitfall 4: Performance Degradation

**Problem**: Simulation becomes slow or unresponsive.

**Solution**: Profile with browser dev tools, then:

- Cache expensive calculations
- Reduce grid resolution for interactive changes
- Use analytical solutions when available
- Implement lazy evaluation

### Pitfall 5: Memory Leaks

**Problem**: Memory usage grows over time.

**Solution**: Ensure proper disposal:

```typescript
public dispose(): void {
  this.propertyLinks.forEach(link => link.dispose());
  this.eigenstateCache.clear();
  super.dispose();
}
```

## Build and Deployment

### Development Build

```bash
npm run dev          # Start dev server with hot reload
npm run check        # Type checking
npm run lint         # Code linting
npm run format       # Code formatting
```

### Production Build

```bash
npm run build        # Build for production
npm run preview      # Preview production build locally
```

The build process:

1. TypeScript compilation with strict checks
2. Vite bundling and optimization
3. Terser minification
4. Single HTML file generation (via vite-plugin-singlefile)

### Deployment

GitHub Actions automatically:

1. Runs on push to main branch
2. Executes type checking and tests
3. Builds production bundle
4. Deploys to GitHub Pages

Manual deployment:

```bash
npm run build
npm run serve        # Serve locally to test
# Then upload dist/ to hosting provider
```

## Additional Resources

### Internal Documentation

- Source code comments (TSDoc format)
- `doc/SOLVER_DOCUMENTATION.md` - Detailed solver mathematics
- `doc/PERFORMANCE_MONITORING.md` - Profiling guide
- `tests/doc/ACCURACY_TESTS.md` - Test suite documentation

### External Resources

- [SceneryStack Documentation](https://github.com/phetsims/scenery)
- [PhET Development Overview](https://github.com/phetsims/phet-info/blob/main/doc/phet-development-overview.md)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- Griffiths & Schroeter: _Introduction to Quantum Mechanics_ (physics background)

### Related Projects

- [PhET Quantum Bound States](https://phet.colorado.edu/en/simulation/bound-states) - Original inspiration
- [Quantum Tunneling and Wave Packets](https://phet.colorado.edu/en/simulation/quantum-tunneling)

## Versioning and Changelog

This simulation follows semantic versioning (semver):

- **Major**: Breaking changes to API or behavior
- **Minor**: New features, backward compatible
- **Patch**: Bug fixes, performance improvements

See git commit history for detailed changes.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Ensure `npm run check` and `npm test` pass
5. Submit a pull request with clear description

## License

GNU Affero General Public License v3.0 or later — see the [org LICENSE](https://github.com/OpenLyceum/.github/blob/main/LICENSE).

## Contact

For questions, issues, or suggestions:

- GitHub Issues: https://github.com/OpenLyceum/QuantumPotential/issues
- Repository: https://github.com/OpenLyceum/QuantumPotential

---

**Document Version**: 1.0
**Last Updated**: November 2024
**Maintainer**: Martin Veillette
