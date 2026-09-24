/**
 * The drag handles on the energy chart (PotentialHandlesLayer). For every screen, potential and handle:
 *  - the handle's anchor lies on the potential the solver uses (between the values just left and right of it,
 *    which also covers handles on a step such as a square-well wall), so a handle is always on the drawn curve;
 *  - dragging to the anchor of a value recovers that value, i.e. the drag mapping inverts the anchor.
 */

import { Property } from "scenerystack/axon";
import { Vector2 } from "scenerystack/dot";
import { describe, expect, it } from "vitest";
import { PotentialType } from "../src/common/model/PotentialFunction.js";
import QuantumConstants from "../src/common/model/QuantumConstants.js";
import type { ScreenModel } from "../src/common/model/ScreenModels.js";
import type { PotentialHandleNode } from "../src/common/view/handles/PotentialHandleNode.js";
import { PotentialHandlesLayer } from "../src/common/view/handles/PotentialHandlesLayer.js";
import { IntroModel } from "../src/intro/model/IntroModel.js";
import { ManyWellsModel } from "../src/many-wells/model/ManyWellsModel.js";
import { OneWellModel } from "../src/one-well/model/OneWellModel.js";
import { TwoWellsModel } from "../src/two-wells/model/TwoWellsModel.js";

const SINGLE_WELLS = [
  PotentialType.INFINITE_WELL,
  PotentialType.FINITE_WELL,
  PotentialType.HARMONIC_OSCILLATOR,
  PotentialType.MORSE,
  PotentialType.POSCHL_TELLER,
  PotentialType.ROSEN_MORSE,
  PotentialType.ECKART,
  PotentialType.ASYMMETRIC_TRIANGLE,
  PotentialType.TRIANGULAR,
];

const SCREENS: ReadonlyArray<[string, () => ScreenModel, PotentialType[]]> = [
  ["Intro", () => new IntroModel(), SINGLE_WELLS],
  ["One Well", () => new OneWellModel(), SINGLE_WELLS],
  ["Two Wells", () => new TwoWellsModel(), [PotentialType.DOUBLE_SQUARE_WELL, PotentialType.DOUBLE_POSCHL_TELLER]],
  ["Many Wells", () => new ManyWellsModel(), [PotentialType.MULTI_SQUARE_WELL, PotentialType.MULTI_POSCHL_TELLER]],
];

const ENERGY_TOLERANCE_EV = 1e-3;
const STEP_PROBE_NM = 1e-3;

function potentialEv(model: ScreenModel, xNm: number): number {
  const [energy] = model.getPotentialEnergy([xNm * QuantumConstants.NM_TO_M]);
  return Math.min(1e6, energy! * QuantumConstants.JOULES_TO_EV);
}

function createHandles(model: ScreenModel): PotentialHandleNode[] {
  const layer = new PotentialHandlesLayer(
    model,
    { toView: ({ x, y }) => new Vector2(x, y), toModel: ({ x, y }) => ({ x, y }) },
    () => true,
    new Property(false),
  );
  return layer.children as PotentialHandleNode[];
}

describe("potential handles", () => {
  it.each(SCREENS)("%s: handles sit on the solved potential and invert their anchors", (_name, create, types) => {
    const model = create();
    if (model instanceof ManyWellsModel) {
      model.electricFieldProperty.value = 0.2; // exercise the tilt
    }
    const handles = createHandles(model);
    const failures: string[] = [];

    for (const type of types) {
      model.potentialTypeProperty.value = type;
      const visible = handles.filter((handle) => handle.spec.isVisibleFor(type));
      expect(visible.length, `${type} has handles`).toBeGreaterThan(0);

      for (const handle of visible) {
        const { property, parameter, orientation, anchor } = handle.spec;
        const label = `${type}/${parameter}`;

        // On the curve: between V just left and just right of the anchor
        const point = anchor(property.value);
        const left = potentialEv(model, point.x - STEP_PROBE_NM);
        const right = potentialEv(model, point.x + STEP_PROBE_NM);
        if (
          point.y < Math.min(left, right) - ENERGY_TOLERANCE_EV - 0.05 * Math.abs(left - right) ||
          point.y > Math.max(left, right) + ENERGY_TOLERANCE_EV + 0.05 * Math.abs(left - right)
        ) {
          failures.push(
            `${label}: anchor (${point.x.toFixed(3)}, ${point.y.toFixed(3)}) not on V ∈ [${left}, ${right}]`,
          );
        }

        // Drag inverts the anchor
        const { min, max } = property.range;
        for (const fraction of [0.25, 0.75]) {
          const value = min + fraction * (max - min);
          const recovered = handle.getValueForPoint(anchor(value));
          if (Math.abs(recovered - value) > 0.01 * (max - min)) {
            failures.push(`${label} (${orientation}): ${value.toFixed(3)} → ${recovered.toFixed(3)}`);
          }
        }
      }
    }

    expect(failures).toEqual([]);
    model.dispose();
  });
});
