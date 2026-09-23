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

/**
 * Force garbage collection with multiple passes, bailing out as soon as every referenced
 * object is confirmed collected. The setTimeout(0) yield after a live deref() avoids the
 * WeakRef macrotask-liveness pin.
 */
async function forceGC(earlyExitRefs: WeakRef<object> | readonly WeakRef<object>[]): Promise<void> {
  const refs = Array.isArray(earlyExitRefs) ? earlyExitRefs : [earlyExitRefs];
  for (let i = 0; i < 15; i++) {
    globalThis.gc?.();
    await new Promise<void>((r) => setTimeout(r, 50));
    if (refs.every((ref) => ref.deref() === undefined)) {
      return;
    }
    await new Promise<void>((r) => setTimeout(r, 0));
  }
}

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
  it("global.gc is available (--expose-gc)", () => {
    expect(globalThis.gc).toBeDefined();
  });

  it("sanity: plain object is collected", async () => {
    const ref = (() => new WeakRef({ hello: "world" }))();
    await forceGC(ref);
    expect(ref.deref()).toBeUndefined();
  });

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
