/**
 * Screen-model lifecycle: every model starts on its own screen defaults and reset() returns to
 * them. (Two Wells / Many Wells used to reset to the One Well infinite square well and to a well
 * width outside their own slider range.)
 */

import { describe, expect, it } from "vitest";
import { BaseModel } from "../src/common/model/BaseModel.js";
import {
  isIntroModel,
  isManyWellsModel,
  isOneWellModel,
  isSingleWellModel,
  isTwoWellsModel,
} from "../src/common/model/ModelTypeGuards.js";
import { PotentialType } from "../src/common/model/PotentialFunction.js";
import { IntroModel } from "../src/intro/model/IntroModel.js";
import { ManyWellsModel } from "../src/many-wells/model/ManyWellsModel.js";
import { OneWellModel } from "../src/one-well/model/OneWellModel.js";
import { TwoWellsModel } from "../src/two-wells/model/TwoWellsModel.js";

const MODELS: ReadonlyArray<[string, () => BaseModel, PotentialType]> = [
  ["IntroModel", () => new IntroModel(), PotentialType.INFINITE_WELL],
  ["OneWellModel", () => new OneWellModel(), PotentialType.INFINITE_WELL],
  ["TwoWellsModel", () => new TwoWellsModel(), PotentialType.DOUBLE_SQUARE_WELL],
  ["ManyWellsModel", () => new ManyWellsModel(), PotentialType.MULTI_SQUARE_WELL],
];

it("identifies screens from their explicit kind", () => {
  const intro = new IntroModel();
  const one = new OneWellModel();
  const two = new TwoWellsModel();
  const many = new ManyWellsModel();
  expect(isIntroModel(intro)).toBe(true);
  expect(isIntroModel(one)).toBe(false);
  expect(isOneWellModel(one)).toBe(true);
  expect(isTwoWellsModel(two)).toBe(true);
  expect(isManyWellsModel(many)).toBe(true);
  expect([intro, one, two, many].map(isSingleWellModel)).toEqual([true, true, false, false]);
  for (const model of [intro, one, two, many]) {
    model.dispose();
  }
});

describe.each(MODELS)("%s", (_name, create, defaultPotential) => {
  it("starts on its screen's default potential with an in-range well width", () => {
    const model = create();
    expect(model.potentialTypeProperty.value).toBe(defaultPotential);
    expect(model.wellWidthProperty.range.contains(model.wellWidthProperty.value)).toBe(true);
    model.dispose();
  });

  it("reset() restores the screen defaults", () => {
    const model = create();
    const initialWidth = model.wellWidthProperty.value;
    const initialConfig = model.superpositionConfigProperty.value;

    model.wellWidthProperty.value = model.wellWidthProperty.range.max;
    model.selectedEnergyLevelIndexProperty.value = 1;
    model.reset();

    expect(model.potentialTypeProperty.value).toBe(defaultPotential);
    expect(model.wellWidthProperty.value).toBe(initialWidth);
    expect(model.selectedEnergyLevelIndexProperty.value).toBe(0);
    expect(model.superpositionConfigProperty.value).toEqual(initialConfig);
    model.dispose();
  });

  it("finds bound states for its default configuration", () => {
    const model = create();
    const levels = model.getEnergyLevels();
    expect(levels.length).toBeGreaterThan(0);
    expect(levels.every(Number.isFinite)).toBe(true);
    model.dispose();
  });

  it("clamps an out-of-range selection on the next step, not inside the bound-state calculation", () => {
    const model = create();
    const maxIndex = model.selectedEnergyLevelIndexProperty.range.max;
    model.selectedEnergyLevelIndexProperty.value = maxIndex;

    const levels = model.getEnergyLevels();
    expect(levels.length).toBeLessThanOrEqual(maxIndex);
    // Computing bound states must not write the selection (that re-entered its own listeners)
    expect(model.selectedEnergyLevelIndexProperty.value).toBe(maxIndex);

    model.step(0);
    expect(model.selectedEnergyLevelIndexProperty.value).toBe(levels.length - 1);
    model.dispose();
  });
});

it("applies every selected playback rate and keeps manual steps independent of speed", () => {
  const model = new OneWellModel();
  model.isPlayingProperty.value = true;

  for (const speed of BaseModel.TIME_SPEED_MULTIPLIERS) {
    model.timeProperty.value = 0;
    model.timeSpeedProperty.value = speed;
    model.step(0.5);
    expect(model.timeProperty.value).toBeCloseTo(0.5 * speed);
  }

  model.isPlayingProperty.value = false;
  model.timeProperty.value = 0;
  model.step(BaseModel.MANUAL_STEP_SIZE, true);
  expect(model.timeProperty.value).toBeCloseTo(BaseModel.MANUAL_STEP_SIZE);

  model.reset();
  expect(model.timeSpeedProperty.value).toBe(1);
  model.dispose();
});

describe("multiple Pöschl–Teller wells", () => {
  it("solves two smooth wells and keeps their potential symmetric", () => {
    const model = new TwoWellsModel();
    model.potentialTypeProperty.value = PotentialType.DOUBLE_POSCHL_TELLER;

    const levels = model.getEnergyLevels();
    const [left, center, right] = model.getPotentialEnergy([-1e-9, 0, 1e-9]);
    expect(levels.length).toBeGreaterThan(1);
    expect(levels.every((energy) => Number.isFinite(energy) && energy < 0)).toBe(true);
    expect(left).toBeCloseTo(right!, 25);
    expect(left!).toBeLessThan(0);
    expect(center!).toBeLessThan(0);
    model.dispose();
  });

  it("solves a tilted smooth well array and updates when its spacing changes", () => {
    const model = new ManyWellsModel();
    model.potentialTypeProperty.value = PotentialType.MULTI_POSCHL_TELLER;
    model.electricFieldProperty.value = 0.2;

    const levels = model.getEnergyLevels();
    const [left, right] = model.getPotentialEnergy([-1e-9, 1e-9]);
    expect(levels.length).toBeGreaterThan(1);
    expect(levels.every(Number.isFinite)).toBe(true);
    expect(right!).toBeGreaterThan(left!);

    const oldCenterPotential = model.getPotentialEnergy([0])[0]!;
    model.wellSeparationProperty.value = 0.6;
    expect(model.getPotentialEnergy([0])[0]).not.toBeCloseTo(oldCenterPotential, 25);
    model.dispose();
  });
});
