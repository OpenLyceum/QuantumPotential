import { describe, expect, it } from "vitest";
import { PotentialType } from "../src/common/model/PotentialFunction.js";
import QuantumConstants from "../src/common/model/QuantumConstants.js";
import type { ScreenModel } from "../src/common/model/ScreenModels.js";
import { IntroModel } from "../src/intro/model/IntroModel.js";
import { ManyWellsModel } from "../src/many-wells/model/ManyWellsModel.js";
import { OneWellModel } from "../src/one-well/model/OneWellModel.js";
import { TwoWellsModel } from "../src/two-wells/model/TwoWellsModel.js";

function potentialEv(model: ScreenModel, xNm: number): number {
  return model.getPotentialEnergy([xNm * QuantumConstants.NM_TO_M])[0]! * QuantumConstants.JOULES_TO_EV;
}

describe.each([
  ["Intro", () => new IntroModel()],
  ["One Well", () => new OneWellModel()],
] as const)("%s potential defaults", (_name, create) => {
  it("shows a wide starting well and a deep Pöschl–Teller curve", () => {
    const model = create();
    expect(model.wellWidthProperty.value / 8).toBeGreaterThan(0.65);

    model.potentialTypeProperty.value = PotentialType.POSCHL_TELLER;
    expect(potentialEv(model, 0)).toBeCloseTo(-12);
    expect(potentialEv(model, 4)).toBeGreaterThan(-0.3);
    expect(model.getEnergyLevels().length).toBeGreaterThan(0);
    model.dispose();
  });

  it("gives Eckart a visible dip and retains edits when returning to it", () => {
    const model = create();
    model.potentialTypeProperty.value = PotentialType.ECKART;
    expect(potentialEv(model, -4)).toBeGreaterThan(3);
    expect(potentialEv(model, 0)).toBeLessThan(-1);
    expect(model.getEnergyLevels().length).toBeGreaterThan(0);

    model.wellWidthProperty.value = 1.2;
    model.potentialTypeProperty.value = PotentialType.POSCHL_TELLER;
    model.potentialTypeProperty.value = PotentialType.ECKART;
    expect(model.wellWidthProperty.value).toBe(1.2);

    model.reset();
    model.potentialTypeProperty.value = PotentialType.ECKART;
    expect(model.wellWidthProperty.value).toBe(1);
    model.dispose();
  });
});

it("fills most of the starting Two Wells chart without clipping the structure", () => {
  const model = new TwoWellsModel();
  const structureWidth = 2 * model.wellWidthProperty.value + model.wellSeparationProperty.value;
  expect(structureWidth / 8).toBeGreaterThan(0.6);
  expect(structureWidth / 8).toBeLessThan(0.8);
  expect(potentialEv(model, 0)).toBeGreaterThan(10);
  expect(potentialEv(model, 1)).toBe(0);
  expect(model.getEnergyLevels().length).toBeGreaterThan(1);
  model.dispose();
});

it("allows a wider separation for the double Pöschl–Teller potential", () => {
  const model = new TwoWellsModel();
  model.potentialTypeProperty.value = PotentialType.DOUBLE_POSCHL_TELLER;
  expect(model.wellSeparationProperty.range.max).toBeGreaterThanOrEqual(4);
  model.wellSeparationProperty.value = 3.5;
  const wellCenter = (model.wellWidthProperty.value + model.wellSeparationProperty.value) / 2;
  expect(potentialEv(model, wellCenter)).toBeLessThan(potentialEv(model, 0));
  expect(model.getEnergyLevels().length).toBeGreaterThan(0);
  model.dispose();
});

it("keeps the separated double square wells inside the solver grid", () => {
  const model = new TwoWellsModel();
  model.potentialTypeProperty.value = PotentialType.DOUBLE_SQUARE_WELL;
  model.wellSeparationProperty.value = 4;
  model.wellWidthProperty.value = 3;
  const states = model.getBoundStates();
  expect(states).not.toBeNull();
  expect(states!.xGrid[0]).toBeLessThan(-5 * QuantumConstants.NM_TO_M);
  expect(states!.xGrid.at(-1)).toBeGreaterThan(5 * QuantumConstants.NM_TO_M);
  model.dispose();
});

it("fills most of the starting Many Wells chart without clipping the structure", () => {
  const model = new ManyWellsModel();
  const structureWidth =
    model.numberOfWellsProperty.value * model.wellWidthProperty.value +
    (model.numberOfWellsProperty.value - 1) * model.wellSeparationProperty.value;
  expect(structureWidth / 8).toBeGreaterThan(0.7);
  expect(structureWidth / 8).toBeLessThan(0.8);
  expect(potentialEv(model, 0)).toBe(0);
  expect(potentialEv(model, 3.2)).toBeGreaterThan(10);
  expect(model.getEnergyLevels().length).toBeGreaterThan(1);
  model.dispose();
});
