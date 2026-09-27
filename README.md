# Quantum Potential Simulation

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

Explore the bound states of a quantum particle in a potential well. Drag the well, change its
shape, and watch the energy levels, wave functions and probability densities respond in real
time as the 1D Schrödinger equation is re-solved for an electron-mass particle. Inspired by the
PhET *Quantum Bound States* simulation.

## Features

- **Four screens.** *Intro* (a simplified single well), *One Well* (time evolution and
  superpositions), *Two Wells* (tunnelling and energy-level splitting) and *Many Wells* (energy
  bands forming in a periodic potential).
- **Many potentials.** Eleven closed-form solutions — infinite and finite square wells, harmonic
  oscillator, Morse, Pöschl–Teller, Rosen–Morse, Eckart, triangular, asymmetric triangle, 1D
  Coulomb, and the double square well — plus numerically solved double Pöschl–Teller wells and
  rows of 1–10 square or Pöschl–Teller wells.
- **A robust numerical solver** for the smooth and multi-well potentials: Numerov shooting with
  node-count bracketing (ported from PhET's *Quantum Bound States*), which resolves dense energy
  bands and electric-field-tilted wells.
- **Direct manipulation.** Reshape the well by dragging handles on the potential itself (width, depth,
  barrier, offset, separation), then hover or click energy levels to read and select them. The layout
  follows PhET's *Quantum Bound States*: the energy diagram sits above the wave-function graph on a
  shared position axis.
- **Rich views of ψ.** Real and imaginary parts, magnitude, probability density, phase-coloured
  display, node positions, the classically forbidden region, ⟨x⟩ and Δx, and a momentum-space
  (wavenumber) chart.
- **Superpositions.** Single eigenstates, two-state superpositions, localized, moving and
  two-lobed wave packets, coherent states, and custom amplitudes, each evolving with the correct
  phases.
- **Measurement tools** for area under |ψ|², first derivative and curvature, all draggable with
  mouse, touch or keyboard.
- **Accessible.** Keyboard navigation of energy levels, a screen summary, and a keyboard-help
  dialog.
- Installable and offline-capable (PWA), with a projector colour profile and English, French and
  Spanish.

## Quick Start

```bash
npm install
npm run icons     # generate PWA icons on a fresh clone
npm start         # → http://localhost:5173
```

Developer query parameters: `?numericalMethod=fgh` (cross-check the Numerov solver with a Fourier
Grid Hamiltonian) and `?numberOfPoints=3001` (odd grid size for the numerical solver).

## Scripts

| Command | Description |
|---|---|
| `npm start` / `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check + production build → `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm test` | Run Vitest unit tests (includes memory-leak suite) |
| `npm run test:fuzz` | Optional Playwright fuzz smoke: pointer (`?fuzz`) + keyboard (`?fuzzBoard`), with `?ea`, 30s each |
| `npm run test:fuzz -- 90` | Same fuzz for 90 seconds (`--duration 90` or `FUZZ_DURATION=90` also work) |
| `npm run test:fuzz:quick` | Shorter fuzz smoke (10s) |
| `npm run test:fuzz:long` | Longer fuzz smoke (300s) |
| `npm run check` | TypeScript type check |
| `npm run lint` | Biome lint check |
| `npm run format` | Auto-format all files |
| `npm run fix` | Lint + auto-fix |
| `npm run icons` | Regenerate PNG icons from `public/icons/icon.svg` |
| `npm run release` | `check && lint && build && test`, then version patch + push tags |
| `npm run clean` | Remove `dist/` |
| `npm run test:accuracy` | Exhaustive solver-vs-exact accuracy suite (manual; see `tests/accuracy/README.md`) |
| `npm run test:double-well` / `test:coulomb` / `test:multi-square-well` | Focused accuracy diagnostics (manual) |

## Tech Stack

| Tool | Version | Notes |
|---|---|---|
| SceneryStack | ^3.0.0 | Simulation framework; `bamboo` for the charts |
| Vite | ^8 | Build tool and dev server |
| TypeScript | ^7 | `erasableSyntaxOnly` — no `enum`, no `namespace` |
| Biome | ^2.5 | Lint + format |
| Vitest | ^5 | Unit tests (`happy-dom`) |
| vite-plugin-pwa | ^1 | Installable / offline |

## License

GNU Affero General Public License v3.0 or later — see the
[org LICENSE](https://github.com/OpenLyceum/.github/blob/main/LICENSE).

## Contributing

See the [org contributing guide](https://github.com/OpenLyceum/.github/blob/main/CONTRIBUTING.md).
