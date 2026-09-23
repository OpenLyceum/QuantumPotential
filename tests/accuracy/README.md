# Solver accuracy scripts

Hand-run diagnostics that check every numerical solver against exact results. They are slower and
more exhaustive than the Vitest suite (`npm test`, run by CI) and are not part of CI. Each exits
non-zero on failure.

| Command | Script | What it checks |
|---|---|---|
| `npm run test:accuracy` | `test-wavefunction-comprehensive.ts` | DVR, matrix Numerov, FGH, spectral and QuantumBound against the harmonic oscillator, finite well, 3D Coulomb (radial), Morse (H₂) and Pöschl–Teller: energies, normalization, orthogonality, nodes, parity and edge decay; plus Numerov shooting and Numerov wavefunctions |
| `npm run test:double-well` | `test-double-well.ts` | The analytical double square well: parity, nodes, edge decay, normalization, derivative continuity, parameter sweeps, grid convergence |
| `npm run test:coulomb` | `verify-coulomb.ts` | 1D and 3D Coulomb analytical solutions |
| `npm run test:multi-square-well` | `test-multi-square-well.ts` | The numerically solved multi-square well (Many Wells screen) |
| `npm run test:multi-coulomb-1d` | `test-multi-coulomb-1d.ts` | The numerically solved multi-Coulomb chain (Many Wells screen) — see the known issue below |

All scripts run under `tsx` with `tsconfig.accuracy.json` and `browser-globals.js` preloaded (SceneryStack
expects a DOM at import time).

## Writing checks that measure the solver, not the grid

Several failures these scripts used to report were artefacts of the test setup rather than solver
errors. Keep these in mind when adding cases:

- **Step potentials are sampled.** The numerical solvers see a square well only at grid points, so its
  effective width depends on where the edges fall. `Schrodinger1DSolver` evaluates cell-averaged
  potentials, but scripts that call a solver directly should put edges midway between samples
  (DVR: `dx = range/(N − 1)`; FGH is periodic: `dx = range/N`).
- **Singular potentials.** For the radial Coulomb problem start the grid at `r = h`, not near 0; the
  cusp limits uniform grids to ~linear convergence.
- **Compare bound states only.** A finite box turns the continuum into discrete states above the
  barrier; compare only as many states as the exact solution has.
- **Relative metrics.** Measure edge decay and node thresholds relative to the peak of |ψ|, count nodes
  only between significant samples, and pair grid points with their mirror image (`j ↔ N − 1 − j`)
  for parity.

## Known issue

`test:multi-coulomb-1d` reports an orthogonality/node failure for the lowest state. A bare `−α/|x|`
potential in one dimension has no finite ground state (the "1D hydrogen" collapse): the lowest state
shrinks onto a centre until the grid spacing stops it (≈ −200 eV here, about one grid cell wide), so
its shape is grid-limited. Softening the potential (`−α/√(x² + a²)`) would make the Many Wells
multi-Coulomb model well posed; that changes the sim's physics and is left as a design decision.
