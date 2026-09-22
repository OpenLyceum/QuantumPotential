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
| Solver facade | `src/common/model/Schrodinger1DSolver.ts` — picks analytical vs numerical, dispatches on `NumericalMethod` |
| Numerical solvers | `DVRSolver`, `FGHSolver`, `SpectralSolver`, `MatrixNumerovSolver`, `NumerovSolver`, `QuantumBoundStateSolver` in `src/common/model/` |
| Closed-form solutions | `src/common/model/analytical-solutions/` (one file per potential) + `potentials/` class wrappers, built by `PotentialFactory` |
| Charts | `src/common/view/{WaveFunction,Energy,Wavenumber}ChartNode.ts` (extend `BaseChartNode`), tools in `chart-tools/` |
| Control panels | `src/common/view/ControlPanelNode.ts` (One/Two/Many Wells), `src/intro/view/IntroControlPanelNode.ts` (Intro) |
| A11y | `src/common/view/accessibility/` (`ScreenSummaryNode`, `QPPWDescriber`, `QPPWAlerter`), `src/common/view/QPPWKeyboardHelpContent.ts` |
| Preferences | `src/preferences/` — `QPPWPreferencesModel` (numerical method, grid points, …), `QPPWPreferencesNode`, `qppwQueryParameters` |
| Colors / namespace | `src/QPPWColors.ts`, `src/QPPWNamespace.ts` |
| Logging | `src/common/utils/Logger.ts` — the **only** place in `src/` allowed to use `console` |

## Model

- **Models compute, views render.** All physics (solving, normalization, integration, time
  evolution, interpolation) lives in `model/`; views ask the model (`getTimeEvolvedSuperposition`,
  `getProbabilityInRegion`, `getWavefunctionAtPosition`, …) and never do physics themselves.
- **SI inside, display units at the edge.** Solvers work in metres/joules/kg; conversion to nm/eV
  happens when handing data to views.
- **Default numerical method is FGH, 64 grid points** — both seeded from query parameters
  (`?numericalMethod=`, `?gridPoints=`) and editable in Preferences → Simulation.
- **`BaseModel.dispose()`** unlinks the model's listeners on the global `QPPWPreferences`
  properties. Any new link to a global/preferences Property must be unlinked there, or
  `tests/memory-leak.test.ts` fails.

### Hard-won gotchas

- **m → nm wavefunction conversion divides by √(10⁹)** — `psi / Math.sqrt(M_TO_NM)` preserves
  ∫|ψ|² dx = 1. Multiplying produces ~10¹⁸ values (`BaseModel.getWavefunctionInNmUnits`, `getTimeEvolvedSuperpositionInNmUnits`).
- **Chart constructors use `lazyLink` and defer the first `update()`** (`setTimeout(…, 0)`).
  Synchronous `link()` lets charts cross-trigger during construction and hang the sim.
- **Classical probability 1/√(E − V) is singular at turning points** — regularize with a *relative*
  epsilon (1% of max kinetic energy), never an absolute one. The closed-form harmonic-oscillator
  classical density is unusable for the same reason.
- **Normalize numerically.** For Pöschl–Teller and 3D Coulomb the analytic Gamma-function
  normalizations were off by 2–5× / 10²⁰; trapezoidal ∫|ψ|² dx is the reliable path.

## Accessibility

Ships the three required layers: PDOM names on interactive nodes, a screen summary
(`ScreenSummaryNode`), and keyboard support — arrow/Home/End energy-level navigation on the energy
chart, `KeyboardDragListener`s on the chart tools, and `QPPWKeyboardHelpContent` wired through each
Screen's `createKeyboardHelpNode`. Known gap: several accessible descriptions in views (e.g.
`BaseScreenView`, `ScreenSummaryNode`, `WavenumberChartNode`) are still hardcoded English template
strings rather than `StringManager` entries. Full convention:
[Baton/ACCESSIBILITY.md](https://github.com/OpenLyceum/Baton/blob/main/ACCESSIBILITY.md).

## Compliance carve-outs

- **Nested constants:** there is no root `QPPWConstants.ts`. Physical constants live in
  `src/common/model/QuantumConstants.ts` and chart layout constants in
  `src/common/view/ChartConstants.ts`; per-model ranges are `static readonly` on `BaseModel`.
- **Biome `style.noNonNullAssertion: off`:** the solvers and charts index dense numeric arrays in
  tight loops; under `noUncheckedIndexedAccess` those reads carry intentional `!` assertions
  (same carve-out as OscillationsAndChaos).
- **Legacy accuracy harness (`tests/accuracy/`):** hand-run solver-vs-analytical diagnostics that
  predate the fleet setup. They are type-checked by `tsconfig.accuracy.json`, which relaxes
  `noUncheckedIndexedAccess` / `exactOptionalPropertyTypes`, and are not run by CI.
  `test-wavefunction-comprehensive.ts` is stale against the current analytical-solver signatures
  (it was already crashing before the fleet migration) and is excluded from type-checking until
  repaired. The accuracy report (`npm run test:accuracy`) still flags some solver/potential
  combinations, and `test:multi-square-well` / `test:multi-coulomb-1d` run for minutes.

### `package.json` overrides

Same fleet pins as the template (`lodash`, `three`, `brace-expansion`) — rationale in
[SceneryStackTemplate/CLAUDE.md](https://github.com/OpenLyceum/SceneryStackTemplate/blob/main/CLAUDE.md).

## Testing

Fleet-standard Vitest layout (`happy-dom`, `tests/setup.ts`, `execArgv: ["--expose-gc"]`):

| Path | Purpose |
|---|---|
| `tests/memory-leak.test.ts` | Every screen model is collected after `dispose()` |
| `tests/common/model/analytical-solutions.test.ts` | Closed-form energies/normalization vs textbook formulas |
| `tests/accuracy/` | Legacy manual accuracy harness (see carve-outs) |

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
| `npm run test:accuracy` | Manual solver accuracy report |
| `npm run icons` | Regenerate PWA icons |
