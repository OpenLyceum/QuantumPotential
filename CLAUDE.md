# CLAUDE.md — Quantum Potential (QPPW)

Sim-specific context for AI assistants. General SceneryStack guidance: [OpenLyceum/.github/CLAUDE.md](https://github.com/OpenLyceum/.github/blob/main/CLAUDE.md).

## Project

Four-screen SceneryStack simulation of **bound states in 1D potential wells** — *Intro*, *One Well*,
*Two Wells*, *Many Wells* — re-solving the time-independent Schrödinger equation live as the user
drags and reshapes the well. Inspired by PhET's *Quantum Bound States*. The class prefix is
**`QPPW`** (historical name: Quantum Physics Potential Wells); the repo, package and namespace id
are `QuantumPotential` / `quantum-potential`.

Educator physics: [`doc/model.md`](doc/model.md). Architecture: [`doc/implementation-notes.md`](doc/implementation-notes.md).
Solver details: [`doc/SOLVER_DOCUMENTATION.md`](doc/SOLVER_DOCUMENTATION.md).

## Key files

| Area | Location |
|---|---|
| Screen models | `src/{intro,one-well,two-wells,many-wells}/model/*Model.ts`, all extending `src/common/model/BaseModel.ts` |
| Solver facade | `src/common/model/Schrodinger1DSolver.ts` — analytical when possible, else Numerov (`?numericalMethod=fgh` for the FGH cross-check); converts SI ↔ the solver's nm/eV/mₑ |
| Numerical solver | `src/common/model/numerov/` (Numerov shooting, ported from PhET *Quantum Bound States*); `FGHSolver.ts` kept as a cross-check |
| Closed-form solutions | `src/common/model/analytical-solutions/` (one file per potential) + `potentials/` class wrappers, built by `PotentialFactory` |
| Charts | `src/common/view/{WaveFunction,Energy,Wavenumber}ChartNode.ts` (extend `BaseChartNode`), tools in `chart-tools/` |
| Layout | `BaseScreenView.createStandardLayout` (One/Two/Many Wells): QBS-style energy chart over the wave-function chart (shared x axis), energy panel + graph panel on the right, time controls below |
| Control panels | `src/common/view/ControlPanelNode.ts` builds `energyPanel` + `graphPanel`; `src/intro/view/IntroControlPanelNode.ts` (Intro); `QPPWNumberControl` (◀ value ▶ spinner) |
| Potential handles | `src/common/view/handles/` — `PotentialHandleNode` (drag + accessible slider), `PotentialHandlesLayer` (per-potential anchors) |
| Shared UI styling | `src/common/QPPWPanel.ts`, `QPPWButtonOptions.ts`, `QPPWControlOptions.ts` |
| A11y | `src/common/view/accessibility/` (`QPPWDescriber`, `QPPWAlerter`); screen summary in `BaseScreenView`, `src/common/view/QPPWKeyboardHelpContent.ts` |
| Preferences | `src/preferences/` — `QPPWPreferencesModel` (auto-pause), `QPPWPreferencesNode`, `qppwQueryParameters` (`numericalMethod`, `numberOfPoints`) |
| Colors / namespace | `src/QPPWColors.ts`, `src/QPPWNamespace.ts` |
| Logging | `src/common/utils/Logger.ts` — the **only** place in `src/` allowed to use `console` |

## Model

- **Models compute, views render.** All physics (solving, normalization, integration, time
  evolution, interpolation) lives in `model/`; views ask the model (`getTimeEvolvedSuperposition`,
  `getProbabilityInRegion`, `getWavefunctionAtPosition`, …) and never do physics themselves.
- **SI inside, display units at the edge.** Solvers work in metres/joules/kg; conversion to nm/eV
  happens when handing data to views.
- **One numerical solver: Numerov shooting**, used only by Many Wells (every other potential is
  analytical). It brackets states by node count, mirrors symmetric potentials, matches log-derivatives
  for tilted ones, and cleans up with inverse iteration. The grid is odd (`?numberOfPoints`, default
  1001), and the spacing is refined to ≤ 8 pm. `?numericalMethod=fgh` is a developer cross-check.
  There is no solver choice in Preferences.
- **Many Wells' solver domain grows with the structure** (±max(4 nm, half-width + 1.5 nm)). The chart
  stays at ±4 nm and clips. The electric field (V/nm) enters the physics as V = eℰx.
- **Views draw the model's potential** (`BaseModel.getPotentialEnergy`), never a re-derived one. This
  is the analytical solution's own `createPotential()` when there is one, and the model's
  `calculatePotentialEnergy` otherwise. The per-type drawing code it replaced was wrong in several places:
  Many Wells barriers were 10× too wide, the Two Wells wells overlapped, Morse was unshifted, and the
  asymmetric triangle had no wall.
- **`BaseModel.dispose()`** must unlink any link a model makes to a global or preferences Property.
  There are none today; add the unlink there if you add a link, or `tests/memory-leak.test.ts` fails.
- **Per-screen defaults go through the `BaseModel` constructor** (`BaseModelOptions`: potential type,
  well width + range, superposition config) so every Property's `reset()` returns to the screen's own
  default. Don't assign defaults after `super()`.
- **Selected-level clamping happens in `step()`**, not while computing bound states (that re-entered
  `selectedEnergyLevelIndexProperty`'s own notification). Views must treat an index ≥ the number of
  states as "nothing selected" for up to one frame.
- **"No bound states" is not an error.** Analytical solvers throw `NoBoundStatesError`; models log it
  at debug level and show no levels.
- **Numerical solvers see cell-averaged potentials** (`Schrodinger1DSolver.solveNumerical`), so square
  wells converge smoothly with grid size.
- **Energy tolerances are relative.** Energies are ~1e-19 J, so an absolute tolerance such as `1e-12`
  stops a bisection before it starts. The double well and the old solvers had this bug.
- **Bare 1D Coulomb collapses.** Multi-Coulomb's deepest states are grid-limited. The facade drops any
  Numerov state that cannot be normalized.

### Hard-won gotchas

- **m → nm wavefunction conversion divides by √(10⁹)** — `psi / Math.sqrt(M_TO_NM)` preserves
  ∫|ψ|² dx = 1. Multiplying produces ~10¹⁸ values (`BaseModel.getWavefunctionInNmUnits`, `getTimeEvolvedSuperpositionInNmUnits`).
- **Chart constructors use `lazyLink` and defer the first `update()`** (`setTimeout(…, 0)`).
  Synchronous `link()` lets charts cross-trigger during construction and hang the sim.
- **Classical probability 1/√(E − V) is singular at turning points** — regularize with a *relative*
  epsilon (1% of max kinetic energy), never an absolute one. The closed-form harmonic-oscillator
  classical density is unusable for the same reason.
- **Normalize numerically.** For Pöschl–Teller the analytic Gamma-function
  normalization was off by 2–5×; trapezoidal ∫|ψ|² dx is the reliable path.

## Parameter controls

- **Geometric parameters are dragged on the potential.** Width, depth, barrier height, offset and
  separation each have a double-headed arrow handle on the energy chart's curve (`handles/`). A handle is
  declared by its *anchor*, its point (nm, eV) on the curve as a function of the parameter.
  `PotentialHandleNode.getValueForPoint` inverts that to follow the pointer, so a new potential only
  needs anchors. `tests/potential-handles.test.ts` checks that every anchor is on the solved curve and
  that the mapping inverts. Handles pause time while dragged. Keyboard access is an `AccessibleSlider`,
  and handles come first in the chart's focus order.
- **Non-geometric parameters use ◀ ▶ spinners** (`QPPWNumberControl`, a sun `NumberSpinner`): particle
  mass, number of wells, electric field.
- **The parameter gear is `?dev` only** (`src/common/utils/isDevMode.ts`); it opens controls for the current potential's handles.
- **Energy levels**: a transparent picker over the plot hovers and selects the level nearest the
  pointer. In-plot readouts show "Eₙ = … eV" for the selected and hovered levels.

## Accessibility

Ships the three required layers: PDOM names on interactive nodes (combo-box items and radio buttons
included), a screen summary (`ScreenSummaryContent` built in `BaseScreenView` with live
`currentDetailsContent`), and keyboard support — arrow/Home/End energy-level navigation on the energy
chart, `KeyboardDragListener`s on the chart tools, and `QPPWKeyboardHelpContent` wired through each
Screen's `createKeyboardHelpNode`. All accessible text lives under the `a11y` group of the locale
files (`StringManager.getA11yStrings()`); `QPPWDescriber` turns model state into sentences
(`*Pattern` strings + `StringUtils.fillIn`), and description `DerivedProperty`s depend on
`localeProperty` so they follow language changes. Voicing is not offered (no voicing responses yet;
deferred fleet-wide). Full convention:
[Baton/ACCESSIBILITY.md](https://github.com/OpenLyceum/Baton/blob/main/ACCESSIBILITY.md).

## Compliance carve-outs

- **Nested constants:** there is no root `QPPWConstants.ts`. Physical constants live in
  `src/common/model/QuantumConstants.ts` and chart layout constants in
  `src/common/view/ChartConstants.ts`; per-model ranges are `static readonly` on `BaseModel`.
- **Biome `style.noNonNullAssertion: off`:** the solvers and charts index dense numeric arrays in
  tight loops; under `noUncheckedIndexedAccess` those reads carry intentional `!` assertions
  (same carve-out as OscillationsAndChaos).
- **Accuracy scripts (`tests/accuracy/`):** hand-run, exhaustive solver-vs-exact diagnostics, not run
  by CI; type-checked by `tsconfig.accuracy.json`, which relaxes `noUncheckedIndexedAccess` /
  `exactOptionalPropertyTypes`. All pass except `test:multi-coulomb-1d`, whose deepest states are
  grid-limited because a bare 1D Coulomb potential has no finite ground state (see
  `tests/accuracy/README.md`).

### `package.json` overrides

Same fleet pins as the template (`lodash`, `three`, `brace-expansion`) — rationale in
[SceneryStackTemplate/CLAUDE.md](https://github.com/OpenLyceum/SceneryStackTemplate/blob/main/CLAUDE.md).

## Testing

Fleet-standard Vitest layout (`happy-dom`, `tests/setup.ts`, `execArgv: ["--expose-gc"]`):

| Path | Purpose |
|---|---|
| `tests/memory-leak.test.ts` | Every screen model is collected after `dispose()` |
| `tests/screen-models.test.ts` | Screen defaults, `reset()`, deferred selection clamp |
| `tests/solver-robustness.test.ts` | Random settings × potentials × methods give finite, normalized states |
| `tests/common/model/analytical-solutions.test.ts` | Closed-form energies/normalization vs textbook formulas |
| `tests/common/model/analytical-vs-numerical.test.ts` | Pöschl–Teller, Rosen–Morse, Eckart spectra vs fine-grid Numerov |
| `tests/common/model/numerov-solver.test.ts` | Numerov invariants, closed-form spectra, tilted wells, FGH cross-check |
| `tests/common/model/{wavefunction-derivatives,uncertainty,fft}.test.ts` | Solver regressions |
| `tests/accuracy/` | Hand-run accuracy scripts (see carve-outs) |

## Commands

```bash
npm run lint && npm run check && npm run build && npm test
```

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Vite dev server |
| `npm run build` / `npm run build:single` | Production build / single-file build |
| `npm run check` | TypeScript: app, scripts, tests, accuracy harness |
| `npm run lint` / `npm run fix` | Biome check / auto-fix |
| `npm test` | Vitest unit tests |
| `npm run test:accuracy` | Manual solver accuracy suite (see `tests/accuracy/README.md`) |
| `npm run icons` | Regenerate PWA icons |
