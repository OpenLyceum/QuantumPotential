import { describe, expect, it } from "vitest";
import { EnergyLevelControl } from "../src/common/view/EnergyLevelControl.js";
import { IntroModel } from "../src/intro/model/IntroModel.js";

describe("energy level selector", () => {
  it("limits arrow selection to available bound states", () => {
    const model = new IntroModel();
    const count = model.getBoundStates()!.energies.length;
    const control = new EnergyLevelControl(model);
    const spinner = control.children[1]!;
    const incrementButton = spinner.children[1]!;
    const decrementButton = spinner.children[2]!;

    expect(count).toBeGreaterThan(1);
    expect(incrementButton.enabled).toBe(true);
    expect(decrementButton.enabled).toBe(false);

    model.selectedEnergyLevelIndexProperty.value = count - 1;
    expect(incrementButton.enabled).toBe(false);
    expect(decrementButton.enabled).toBe(true);

    model.dispose();
  });
});
