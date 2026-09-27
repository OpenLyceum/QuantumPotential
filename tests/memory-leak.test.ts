/**
 * Fleet-standard memory-leak regression suite (SceneryStackTemplate / QubitSketch pattern).
 *
 * Creates each screen model inside a function boundary, disposes it, forces garbage
 * collection via global.gc (--expose-gc in vitest.config.ts), then asserts via WeakRef that
 * the model was collected. Models link to the global QPPWPreferences properties, so a model
 * whose dispose() forgets to unlink stays reachable and fails here.
 */

import { describe, expect, it } from "vitest";
import type { BaseModel } from "../src/common/model/BaseModel.js";
import { IntroModel } from "../src/intro/model/IntroModel.js";
import { ManyWellsModel } from "../src/many-wells/model/ManyWellsModel.js";
import { OneWellModel } from "../src/one-well/model/OneWellModel.js";
import { TwoWellsModel } from "../src/two-wells/model/TwoWellsModel.js";
import { forceGC } from "./helpers/memoryLeak.js";

const MODELS: ReadonlyArray<[string, () => BaseModel]> = [
  ["IntroModel", () => new IntroModel()],
  ["OneWellModel", () => new OneWellModel()],
  ["TwoWellsModel", () => new TwoWellsModel()],
  ["ManyWellsModel", () => new ManyWellsModel()],
];

function createAndDispose(create: () => BaseModel): WeakRef<object> {
  const model = create();
  const ref = new WeakRef<object>(model);
  model.dispose();
  return ref;
}

describe("Memory leak regression", () => {
  for (const [name, create] of MODELS) {
    it(`${name} is collected after dispose`, async () => {
      const ref = createAndDispose(create);
      await forceGC(ref);
      expect(ref.deref()).toBeUndefined();
    });

    it(`${name} double dispose() does not throw`, () => {
      const model = create();
      model.dispose();
      expect(() => model.dispose()).not.toThrow();
    });
  }

  it("repeated create/dispose cycles leave no survivors", async () => {
    const refs: WeakRef<object>[] = [];
    for (let i = 0; i < 5; i++) {
      refs.push(createAndDispose(() => new OneWellModel()));
    }
    await forceGC(refs);
    expect(refs.filter((r) => r.deref() !== undefined)).toHaveLength(0);
  });
});
