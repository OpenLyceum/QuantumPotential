# Quantum Potential — Implementation Notes

For developers who want to understand, maintain or extend the sim. The physics for educators is in
[model.md](model.md), the solver in [SOLVER_DOCUMENTATION.md](SOLVER_DOCUMENTATION.md), and the
conventions and gotchas that AI assistants and humans both need are in [`AGENTS.md`](../AGENTS.md).
Fleet-wide SceneryStack conventions (bootstrap import chain, layout, lint, CI) live in
`OpenLyceum/.github/AGENTS.md` and are not repeated here.

## Structure

```
src/
├── main.ts, brand.ts, splash.ts, assert.ts, init.ts   # Fleet bootstrap chain (import order matters)
├── QPPWColors.ts, QPPWNamespace.ts
├── i18n/                     # StringManager + strings_{en,fr,es}.json (a11y strings under "a11y")
├── preferences/              # QPPWPreferencesModel, QPPWPreferencesNode, qppwQueryParameters
├── common/
│   ├── model/
│   │   ├── BaseModel.ts                  # Shared Properties, lazy bound states, time evolution, queries
│   │   ├── SingleWellModel.ts            # Intro + One Well: closed-form potentials, turning points
│   │   ├── ClassicalProbability.ts       # Regularized classical 1/v density
│   │   ├── Schrodinger1DSolver.ts        # Facade: analytical if possible, else Numerov (or FGH)
│   │   ├── PotentialFactory.ts           # WellParameters → AnalyticalSolution
│   │   ├── PotentialFunction.ts          # PotentialType, WellParameters, result types
│   │   ├── SingleWellParameters.ts       # Intro/One Well controls → typed SI parameters
│   │   ├── PotentialParameterPresets.ts  # Per-potential starting values, kept across type switches
│   │   ├── LocalizedWavePacket.ts        # Spatial presets projected onto eigenstates
│   │   ├── analytical-solutions/         # One AnalyticalSolution subclass per closed-form potential
│   │   ├── numerov/                      # Numerov shooting solver (ported from Quantum Bound States)
│   │   └── FGHSolver.ts                  # Developer cross-check (?numericalMethod=fgh)
│   ├── view/
│   │   ├── BaseScreenView.ts             # createStandardLayout, screen summary, PDOM order
│   │   ├── BaseChartNode.ts              # Margins, x range, model↔view transforms
│   │   ├── {Energy,WaveFunction,Wavenumber}ChartNode.ts
│   │   ├── ControlPanelNode.ts           # Energy panel + graph panel (One/Two/Many Wells)
│   │   ├── chart-tools/                  # Area, derivative, curvature, zeros, classical overlay, phase
│   │   ├── handles/                      # Drag handles on the potential curve
│   │   ├── accessibility/                # QPPWDescriber, QPPWAlerter
│   │   └── BaseViewState.ts              # Display toggles (what is drawn), separate from the model
│   └── utils/Logger.ts                   # The only module allowed to use console
└── {intro,one-well,two-wells,many-wells}/  # <Screen>.ts, model/<Screen>Model.ts, view/…
```

## Model

### Screen models

Every screen model extends `BaseModel`, which owns the Properties all screens share (potential type,
width, depth, offset, mass, selected level, superposition, time). Subclasses add their own Properties and
implement two template methods:

- `calculateBoundStates()` — build typed `WellParameters` in SI units, pick a grid and a state count, and
  call `solver.solveAnalyticalIfPossible`. Store the result in `boundStateResult`, or `null` when no state
  is bound (`NoBoundStatesError` is logged at debug level, not treated as an error).
- `calculatePotentialEnergy(xGrid)` — V(x) for potentials without a closed-form solution class. Callers use
  `getPotentialEnergy`, which prefers the analytical solution's own `createPotential()`.

Intro and One Well extend `SingleWellModel`, which implements both template methods for the closed-form
potentials and adds the barrier height, potential offset, turning points and classically forbidden
probability, all taken from the solver's `AnalyticalSolution`. One Well adds only the superposition presets.
Two Wells and Many Wells extend `BaseModel` directly.

Per-screen defaults go through the `BaseModel` constructor (`BaseModelOptions`) so that `reset()` restores
the screen's own values. The ±4 nm chart range is `BaseModel.CHART_HALF_RANGE_NM`.

### Lazy bound states

`boundStateResult` is `undefined` when stale, `null` when a solve found nothing, and a `BoundStateResult`
otherwise. Each subclass calls `setupCacheInvalidation()` at the end of its constructor. It lazily links
every parameter Property to `invalidateBoundStates()`, which clears the cache and increments
`potentialRevisionProperty`. Every public query (`getBoundStates`, `getEnergyLevels`,
`getWavefunctionInNmUnits`, …) solves on demand, so a burst of parameter changes costs one solve.

Charts and handles listen to `potentialRevisionProperty` through `CoalescedUpdate`, which runs one refresh
in a microtask after all the synchronous notifications of a change.

### Solver

`Schrodinger1DSolver` is a facade. `solveAnalyticalIfPossible` asks `PotentialFactory` for an
`AnalyticalSolution` and solves it; if the type has none (double Pöschl–Teller, multi-square,
multi-Pöschl–Teller), it builds V(x) and calls `solveNumerical`. The double square well
has its own closed-form function. The solver keeps the last `AnalyticalSolution` so models can ask it for
turning points, derivatives, V(x) and the momentum-space transform (`getAnalyticalSolution()`).

`solveNumerical` is a strategy switch between Numerov (default) and FGH, chosen once from
`?numericalMethod`. See [SOLVER_DOCUMENTATION.md](SOLVER_DOCUMENTATION.md).

### Units

Models and solvers work in SI (m, J, kg). Conversion to nm, eV and nm^(−1/2) happens in the `…InNmUnits`
queries that views call. `timeProperty` is in femtoseconds; `step(dt)` advances it by `dt × speed`.

### Time evolution and superpositions

Eigenstates are stored once; nothing is re-solved as time passes. `getTimeEvolvedSuperposition(t)` sums
cₙ e^(iφₙ) ψₙ(x) e^(−iEₙt/ħ) on demand. `superpositionConfigProperty` holds the amplitudes and phases.
The spatial presets (localized, moving, two-lobed) are defined in position space and projected onto the
current eigenstates by `LocalizedWavePacket` (cached per bound-state result). The coherent state uses
closed-form coefficients for the harmonic oscillator.

## View

- **Layout.** `BaseScreenView.createStandardLayout` (One, Two and Many Wells) stacks the energy chart over
  the wave-function chart on a shared x axis, with the energy and graph panels on the right and the time
  controls below. Intro builds its own simpler layout.
- **Charts** extend `BaseChartNode` and draw only what the model returns; they never recompute physics or
  re-derive the potential.
- **View state.** Display toggles (which parts of ψ are drawn, display mode, tools) live in the screen's
  `…ViewState`, not in the model.
- **Handles.** Each geometric parameter is a handle declared by its anchor, its (nm, eV) point on the
  curve as a function of the parameter; `PotentialHandleNode.getValueForPoint` inverts the anchor to follow
  the pointer. A new potential only needs anchors (`PotentialHandlesLayer`).
- **Info dialog.** Every screen has a half-size `InfoButton` beside the reset button (`BaseScreenView`). It
  opens a dialog, built on first use, from the screen's description, key-concepts and interactions strings.
- **Accessibility.** `QPPWDescriber` turns model state into localized sentences; `QPPWAlerter` sends live
  announcements. See [ACCESSIBILITY.md](ACCESSIBILITY.md).

## Adding a closed-form potential

1. Add a key to `PotentialType` and a variant to `SingleWellParameters` in `PotentialFunction.ts`.
2. Implement an `AnalyticalSolution` subclass in `analytical-solutions/` (energies, wave functions on the
   grid, V(x), turning points, derivatives). The wavenumber chart transforms the solved ψ(x) itself
   (`WavenumberTransform.ts`), so there is no per-potential Fourier transform. The classical probability comes free from
   V(x); override it only for a closed form.
3. Add a case to `PotentialFactory` and to `createSingleWellParameters` (and to the state-count switch in
   `SingleWellModel` if it needs a special count).
4. Add a preset to `SINGLE_WELL_PARAMETER_PRESETS`, handle anchors to `PotentialHandlesLayer`, a combo-box
   item to the control panel(s), and name/description strings in all three locale files.
5. Add tests: textbook energies in `analytical-solutions.test.ts`, the potential in
   `solver-robustness.test.ts`, and a Numerov comparison in `analytical-vs-numerical.test.ts` if it is
   not exactly solvable in elementary functions.

## Testing

`npm test` runs the Vitest suite (CI). `npm run test:accuracy` and the other `test:*` scripts are slower,
hand-run solver checks; see `tests/accuracy/README.md`. The test files are listed in `AGENTS.md`.

## Build and deployment

`npm run build` type-checks and builds with Vite; `npm run build:single` produces one self-contained
`dist/index.html`. CI and deployment call Baton's reusable workflows (`.github/workflows/ci.yml`,
`deploy.yml`).
