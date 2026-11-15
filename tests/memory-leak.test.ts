/**
 * Fleet-standard memory-leak regression suite (SceneryStackTemplate / QubitSketch pattern).
 *
 * Creates each screen model inside a function boundary, disposes it, forces garbage
 * collection via global.gc (--expose-gc in vitest.config.ts), then asserts via WeakRef that
 * the model was collected. Models link to the global QuantumPotentialPreferences properties, so a model
 * whose dispose() forgets to unlink stays reachable and fails here.
 */

import { IntroModel } from "../src/intro/model/IntroModel.js";
import { ManyWellsModel } from "../src/many-wells/model/ManyWellsModel.js";
import { OneWellModel } from "../src/one-well/model/OneWellModel.js";
import { TwoWellsModel } from "../src/two-wells/model/TwoWellsModel.js";
import { describeDisposalLeaks } from "./helpers/memoryLeak.js";

describeDisposalLeaks([
  { name: "IntroModel", create: () => new IntroModel(), idempotentDispose: true },
  { name: "OneWellModel", create: () => new OneWellModel(), idempotentDispose: true },
  { name: "TwoWellsModel", create: () => new TwoWellsModel(), idempotentDispose: true },
  { name: "ManyWellsModel", create: () => new ManyWellsModel(), idempotentDispose: true },
]);
