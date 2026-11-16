# Code review — QuantumPotential — 2026-11-16

Reviewed commit: `502356d73b48e0382eaa72d946286b0488db2583`. Working tree was clean at review start.
Selected as one of the ten oldest catalogued simulations by the earliest root commit's author timestamp: `2025-11-11T19:42:15-05:00`. This is source-history age, not GitHub repository-creation age.

## Scope

Framework/model/view step ownership; screen model defaults; probability/statistics and wave-packet helpers; solver regression coverage. This was not a fresh exhaustive derivation of every analytical potential.

This is a targeted functional code review with broad automated checks, not a full release certification. The findings below describe the reviewed commit. The remediation section records the subsequent corrections.

## Findings

### P1: Advance quantum time only once per animation frame

Location: `src/one-well/view/OneWellScreenView.ts:87`.

Joist's `Sim.ts` calls `screen.model.step(dt)` before `screen.view.step(dt)`. All four screen views call their model's `step(dt)` again. The model's reentry guard only protects nested calls, so sequential calls both advance time. At normal speed a 1/60-second frame adds 0.0333333 fs instead of 0.0166667 fs. Superposition phase evolution runs twice as fast as the documented wall-clock mapping, and automatic playback disagrees with the manual Step interval.

The diagnostic invokes the actual OneWellScreenView prototype callback after the framework-equivalent model callback. The duplicate forwarding is also present in IntroScreenView (line 169), TwoWellsScreenView (line 78) and ManyWellsScreenView (line 81).

Recommendation: remove model stepping from all four view callbacks; keep Joist as the sole automatic model-step owner. Add an integration regression covering the model/view callback pair and manual stepping.

## Validation

Node v26.13.0. `npm run lint`, `npm run check`, `npm run build`, `npm run check:architecture`, and the existing `npm test` suite pass (110 tests). Local Baton compliance passes with warnings; GitHub security settings could not be read by the checker.

Template drift is pre-existing and separate from the functional findings:

```text
❌ QuantumPotential (1)
   dependency    @biomejs/biome — @biomejs/biome@^2.6.5 ≠ template ^2.6.6
```

The first concurrent unit run exceeded the existing 2,000 ms dense-Many-Wells solver timing assertion (2,632 ms). The unchanged complete suite passed in isolation (110 tests, 42.12 s overall). No timing assertion was weakened.

## Reproducer

Temporarily save the following as `tests/review-diagnostic.test.ts`, then run `npm test -- tests/review-diagnostic.test.ts` inside this repository under Node 26. The assertion intentionally fails on the reviewed commit. Remove the temporary test afterward.

```ts
import {it,expect} from "vitest";
import {OneWellModel} from "../src/one-well/model/OneWellModel.js";
import {OneWellScreenView} from "../src/one-well/view/OneWellScreenView.js";
it("framework model and view callbacks advance only once",()=>{
 const m=new OneWellModel();m.isPlayingProperty.value=true;const initial=m.timeProperty.value;
 m.step(1/60);
 OneWellScreenView.prototype.step.call({model:m} as OneWellScreenView,1/60);
 console.log("time delta",m.timeProperty.value-initial);
 expect(m.timeProperty.value-initial).toBeCloseTo(1/60*m.timeSpeedProperty.value,10);m.dispose();
});
```

## Limits and retained evidence

No new browser fuzz, live video/camera, heap profiling, manual screen-reader audit, remote dependency audit, or educator sign-off was performed in this review. Unit mocks and source tracing do not substitute for these checks. The November 15 fleet-fuzz results in the superproject review log are prior evidence, not a new browser run.

Validation logs and original diagnostic sources/output are retained locally in `/tmp/oldest-review/`; temporary evidence may be removed by the system. This report preserves the actionable reproducers.


## Remediation — 2026-11-16

Removed model-step forwarding from all four screen views. Joist now owns automatic stepping, while manual transport retains its explicit forced model step.

Permanent regression coverage: `tests/screen-timing.test.ts`. The historical diagnostic above describes the original failure; use the permanent regression suite to validate the corrected transport path.

Aligned template-owned configuration and shared dependency declarations with SceneryStackTemplate: Biome ^2.6.6, its 2.6.6 schema and locked executable, dependency ordering, and Resonance’s Vitest declaration where applicable. Preserved documented per-simulation configuration exceptions.

Final validation and commit identifiers are recorded in the superproject’s `review-log.md`.
