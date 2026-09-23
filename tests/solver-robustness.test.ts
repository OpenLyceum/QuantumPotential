/**
 * Solver robustness: for random slider settings on every screen and every potential, the bound states must be finite numbers (or absent, e.g. a
 * well too shallow to bind), and normalized. A NaN here reaches the charts and trips NumberProperty
 * validation; an unnormalized state makes the probability tools read less than 100 %.
 */

import type { NumberProperty } from "scenerystack/axon";
import { describe, expect, it } from "vitest";
import type { BaseModel } from "../src/common/model/BaseModel.js";
import { PotentialType } from "../src/common/model/PotentialFunction.js";
import { IntroModel } from "../src/intro/model/IntroModel.js";
import { ManyWellsModel } from "../src/many-wells/model/ManyWellsModel.js";
import { OneWellModel } from "../src/one-well/model/OneWellModel.js";
import { TwoWellsModel } from "../src/two-wells/model/TwoWellsModel.js";

const TRIALS = 60;
const SKIPPED = new Set(["selectedEnergyLevelIndexProperty", "timeProperty"]);

/** Small deterministic LCG so failures are reproducible. */
function makeRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
}

/** The model's ranged NumberProperties (the sliders), excluding selection and time. */
function sliderProperties(model: BaseModel): Array<[string, NumberProperty]> {
  return Object.entries(model).filter(
    (entry): entry is [string, NumberProperty] =>
      entry[0].endsWith("Property") &&
      !SKIPPED.has(entry[0]) &&
      typeof entry[1] === "object" &&
      entry[1] !== null &&
      "range" in entry[1] &&
      Boolean((entry[1] as NumberProperty).range),
  );
}

// The potentials each screen's control panel offers
const SINGLE_WELL_POTENTIALS = [
  PotentialType.INFINITE_WELL,
  PotentialType.FINITE_WELL,
  PotentialType.HARMONIC_OSCILLATOR,
  PotentialType.MORSE,
  PotentialType.POSCHL_TELLER,
  PotentialType.ROSEN_MORSE,
  PotentialType.ECKART,
  PotentialType.ASYMMETRIC_TRIANGLE,
  PotentialType.TRIANGULAR,
  PotentialType.COULOMB_1D,
  PotentialType.COULOMB_3D,
];

const MODELS: ReadonlyArray<[string, () => BaseModel, PotentialType[]]> = [
  ["IntroModel", () => new IntroModel(), SINGLE_WELL_POTENTIALS],
  ["OneWellModel", () => new OneWellModel(), SINGLE_WELL_POTENTIALS],
  ["TwoWellsModel", () => new TwoWellsModel(), [PotentialType.DOUBLE_SQUARE_WELL, PotentialType.DOUBLE_POSCHL_TELLER]],
  ["ManyWellsModel", () => new ManyWellsModel(), [PotentialType.MULTI_SQUARE_WELL, PotentialType.MULTI_POSCHL_TELLER]],
];

describe("solver robustness", () => {
  it.each(MODELS)("%s gives finite bound states for random settings", (_name, create, potentials) => {
    const model = create();
    const random = makeRandom(20260922);
    const failures: string[] = [];

    for (let trial = 0; trial < TRIALS; trial++) {
      model.potentialTypeProperty.value = potentials[Math.floor(random() * potentials.length)]!;

      const setting: string[] = [model.potentialTypeProperty.value];
      for (const [name, property] of sliderProperties(model)) {
        const { min, max } = property.range;
        const value = min + random() * (max - min);
        property.value = name === "numberOfWellsProperty" ? Math.round(value) : value;
        setting.push(`${name}=${property.value.toFixed(3)}`);
      }

      const boundStates = model.getBoundStates();
      if (boundStates) {
        const finite =
          boundStates.energies.every(Number.isFinite) &&
          boundStates.wavefunctions.every((psi) => psi.every(Number.isFinite));
        if (!finite) {
          failures.push(setting.join(" "));
        } else if (model instanceof ManyWellsModel) {
          // Numerically solved states are normalized over their box. (Closed-form states are normalized
          // over the whole line, so a wide excited state legitimately has < 1 inside the chart window.)
          const { xGrid } = boundStates;
          for (const psi of boundStates.wavefunctions) {
            let norm = 0;
            for (let i = 0; i < psi.length - 1; i++) {
              norm += ((psi[i]! ** 2 + psi[i + 1]! ** 2) / 2) * (xGrid[i + 1]! - xGrid[i]!);
            }
            if (Math.abs(norm - 1) > 2e-2) {
              failures.push(`∫|ψ|² = ${norm.toFixed(4)}: ${setting.join(" ")}`);
              break;
            }
          }
        }
      }
    }

    expect(failures).toEqual([]);
    model.dispose();
  });
});
