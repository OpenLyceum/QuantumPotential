import { expect, it } from "vitest";
import { SuperpositionType } from "../src/common/model/SuperpositionType.js";
import { OneWellModel } from "../src/one-well/model/OneWellModel.js";

it("keeps the chosen two-state pair when one-well coefficients are rebuilt", () => {
  const model = new OneWellModel();
  const count = model.getBoundStates()!.energies.length;
  expect(count).toBeGreaterThan(3);

  model.superpositionConfigProperty.value = {
    type: SuperpositionType.PSI_I_PSI_J,
    amplitudes: new Array(count).fill(0),
    phases: new Array(count).fill(0),
    stateIndices: [1, 3],
  };
  model.superpositionTypeProperty.value = SuperpositionType.PSI_I_PSI_J;
  model.wellWidthProperty.value = model.wellWidthProperty.range.max;
  model.updateSuperpositionCoefficients();

  const config = model.superpositionConfigProperty.value;
  expect(config.stateIndices).toEqual([1, 3]);
  expect(config.amplitudes[1]).toBeCloseTo(1 / Math.sqrt(2));
  expect(config.amplitudes[3]).toBeCloseTo(1 / Math.sqrt(2));
  expect(config.amplitudes.filter((value) => value !== 0)).toHaveLength(2);
  model.dispose();
});

it("allows coherent displacement across the full −4 to 4 nm range", () => {
  const model = new OneWellModel();
  expect(model.coherentDisplacementProperty.range.min).toBe(-4);
  expect(model.coherentDisplacementProperty.range.max).toBe(4);
  model.coherentDisplacementProperty.value = -4;
  expect(model.coherentDisplacementProperty.value).toBe(-4);
  model.coherentDisplacementProperty.value = 4;
  expect(model.coherentDisplacementProperty.value).toBe(4);
  model.dispose();
});
