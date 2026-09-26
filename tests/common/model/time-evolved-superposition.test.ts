/**
 * BaseModel.getTimeEvolvedSuperposition is cached per (bound states, configuration, time) and shared by every
 * view and tool that draws a frame. The cache must hand back the same result within a frame, recompute when any
 * of the three changes, and the evolved state must stay normalized.
 */

import { expect, it } from "vitest";
import type { BaseModel } from "../../../src/common/model/BaseModel.js";
import QuantumConstants from "../../../src/common/model/QuantumConstants.js";
import { SuperpositionType } from "../../../src/common/model/SuperpositionType.js";
import { ManyWellsModel } from "../../../src/many-wells/model/ManyWellsModel.js";
import { OneWellModel } from "../../../src/one-well/model/OneWellModel.js";

/** Equal-weight superposition of states i and j, with the given relative phase. */
function superpose(model: BaseModel, i: number, j: number, relativePhase = 0): void {
  const count = model.getBoundStates()!.energies.length;
  const amplitudes = new Array<number>(count).fill(0);
  const phases = new Array<number>(count).fill(0);
  amplitudes[i] = Math.SQRT1_2;
  amplitudes[j] = Math.SQRT1_2;
  phases[j] = relativePhase;
  model.superpositionConfigProperty.value = { type: SuperpositionType.CUSTOM, amplitudes, phases };
  model.superpositionTypeProperty.value = SuperpositionType.CUSTOM;
}

function trapezoid(xGrid: readonly number[], values: readonly number[]): number {
  let sum = 0;
  for (let i = 0; i < xGrid.length - 1; i++) {
    sum += 0.5 * (values[i]! + values[i + 1]!) * (xGrid[i + 1]! - xGrid[i]!);
  }
  return sum;
}

it("returns the cached frame for the same time and recomputes when time, configuration or potential change", () => {
  const model = new OneWellModel();
  superpose(model, 0, 1);

  const first = model.getTimeEvolvedSuperposition(1e-15);
  expect(first).not.toBeNull();
  expect(model.getTimeEvolvedSuperposition(1e-15)).toBe(first);
  // The nm view of a frame is cached with it
  const firstNm = model.getTimeEvolvedSuperpositionInNmUnits(1e-15);
  expect(model.getTimeEvolvedSuperpositionInNmUnits(1e-15)).toBe(firstNm);

  const later = model.getTimeEvolvedSuperposition(2e-15);
  expect(later).not.toBe(first);
  expect(later!.realPart).not.toEqual(first!.realPart);

  superpose(model, 0, 1, Math.PI / 2);
  const rephased = model.getTimeEvolvedSuperposition(2e-15);
  expect(rephased).not.toBe(later);
  expect(rephased!.realPart).not.toEqual(later!.realPart);

  model.wellWidthProperty.value /= 2;
  superpose(model, 0, 1, Math.PI / 2);
  const narrower = model.getTimeEvolvedSuperposition(2e-15);
  expect(narrower).not.toBe(rephased);
  expect(narrower!.probabilityDensity).not.toEqual(rephased!.probabilityDensity);
  model.dispose();
});

it.each([
  ["OneWellModel (analytical)", () => new OneWellModel()],
  ["ManyWellsModel (Numerov)", () => new ManyWellsModel()],
])("keeps a two-state superposition normalized as it evolves: %s", (_name, createModel) => {
  const model = createModel();
  superpose(model, 0, 1);
  const { xGrid } = model.getBoundStates()!;
  const xGridNm = xGrid.map((x) => x * QuantumConstants.M_TO_NM);

  for (const time of [0, 0.37e-15, 1.9e-15, 11e-15]) {
    const si = model.getTimeEvolvedSuperposition(time)!;
    expect(trapezoid(xGrid, si.probabilityDensity)).toBeCloseTo(1, 3);
    const nm = model.getTimeEvolvedSuperpositionInNmUnits(time)!;
    expect(trapezoid(xGridNm, nm.probabilityDensity)).toBeCloseTo(1, 3);
    // |ψ|² = Re² + Im² and the magnitude is its square root
    const i = Math.floor(xGrid.length / 3);
    const density = si.realPart[i]! ** 2 + si.imagPart[i]! ** 2;
    expect(si.probabilityDensity[i]).toBe(density);
    expect(Math.abs(si.magnitude[i]! ** 2 - density)).toBeLessThan(1e-12 * density);
  }
  model.dispose();
});
