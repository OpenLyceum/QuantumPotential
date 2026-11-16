import { describe, expect, it } from "vitest";
import { IntroModel } from "../src/intro/model/IntroModel.js";
import { IntroScreenView } from "../src/intro/view/IntroScreenView.js";
import { ManyWellsModel } from "../src/many-wells/model/ManyWellsModel.js";
import { ManyWellsScreenView } from "../src/many-wells/view/ManyWellsScreenView.js";
import { OneWellModel } from "../src/one-well/model/OneWellModel.js";
import { OneWellScreenView } from "../src/one-well/view/OneWellScreenView.js";
import { TwoWellsModel } from "../src/two-wells/model/TwoWellsModel.js";
import { TwoWellsScreenView } from "../src/two-wells/view/TwoWellsScreenView.js";

for (const [Model, View] of [
  [IntroModel, IntroScreenView],
  [OneWellModel, OneWellScreenView],
  [TwoWellsModel, TwoWellsScreenView],
  [ManyWellsModel, ManyWellsScreenView],
] as const) {
  describe(Model.name, () => {
    it("advances once through the framework's model/view callback pair", () => {
      const model = new Model();
      try {
        model.isPlayingProperty.value = true;
        const dt = 1 / 60;
        const initial = model.timeProperty.value;
        model.step(dt);
        View.prototype.step.call({ model } as never, dt);
        expect(model.timeProperty.value - initial).toBeCloseTo(dt * model.timeSpeedProperty.value, 12);
        model.isPlayingProperty.value = false;
        model.step(dt);
        View.prototype.step.call({ model } as never, dt);
        const paused = model.timeProperty.value;
        model.step(dt, true);
        expect(model.timeProperty.value - paused).toBeCloseTo(dt, 12);
        expect(model.isPlayingProperty.value).toBe(false);
      } finally {
        model.dispose();
      }
    });
  });
}
