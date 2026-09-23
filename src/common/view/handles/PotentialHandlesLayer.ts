/**
 * PotentialHandlesLayer holds the drag handles on the energy chart's potential curve, one set per potential
 * type, and shows those of the selected type. Each handle is declared by where it sits on the curve (its
 * anchor, in nm and eV) as a function of the parameter it controls; PotentialHandleNode does the rest.
 *
 * The anchors use the same formulas as the potentials the solver uses (analytical-solutions/*, the double and
 * multi-well models), so a handle stays on the drawn curve.
 */

import type { NumberProperty, TReadOnlyProperty } from "scenerystack/axon";
import { Node } from "scenerystack/scenery";
import stringManager from "../../../i18n/StringManager.js";
import {
  hasBarrierHeight,
  hasElectricField,
  hasPotentialOffset,
  hasWellSeparation,
  isManyWellsModel,
} from "../../model/ModelTypeGuards.js";
import { createMultiPoschlTellerPotential } from "../../model/multiPoschlTellerPotential.js";
import { PotentialType } from "../../model/PotentialFunction.js";
import QuantumConstants from "../../model/QuantumConstants.js";
import type { ScreenModel } from "../../model/ScreenModels.js";
import { type ChartCoordinates, type HandleSpec, PotentialHandleNode } from "./PotentialHandleNode.js";

// Width handles of the smooth wells sit where the curve is at ¾ of its depth, a point that stays on the ±4 nm
// chart over the whole width range (a ≤ 6 nm):
// x (in units of the width parameter a) where sech²(x/a) = ¾ (Pöschl–Teller, Rosen–Morse)
const SECH2_THREE_QUARTER_POINT = Math.acosh(2 / Math.sqrt(3));

// x (in units of a) where D(1 − e^(−x/a))² − D = −¾D on the steep (x < 0) side of the Morse well
const MORSE_THREE_QUARTER_POINT = -Math.log(1.5);

// x (in units of a) where the Eckart variable z = 1/(1 + e^(x/a)) is 0.6, left of the dip
const ECKART_HANDLE_POINT = Math.log(2 / 3);

// Where handles on asymptotes and plateaus sit, inside the ±4 nm chart
const ASYMPTOTE_X = 3.2;
const PLATEAU_MARGIN = 0.5;
const MAX_HANDLE_X = 3.7;

// Energy (eV) at which the handle on an infinite wall sits
const INFINITE_WALL_HANDLE_Y = 7.5;

const rosenMorse = (x: number, depth: number, barrier: number, a: number): number =>
  -depth / Math.cosh(x / a) ** 2 + barrier * Math.tanh(x / a);

const eckart = (x: number, depth: number, barrier: number, a: number): number => {
  const z = 1 / (1 + Math.exp(x / a));
  return depth * z * z - barrier * z;
};

const smoothWellEnergy = (
  x: number,
  count: number,
  width: number,
  depth: number,
  separation: number,
  field = 0,
): number =>
  createMultiPoschlTellerPotential(
    count,
    width * QuantumConstants.NM_TO_M,
    depth * QuantumConstants.EV_TO_JOULES,
    separation * QuantumConstants.NM_TO_M,
    field / QuantumConstants.NM_TO_M,
  )(x * QuantumConstants.NM_TO_M) * QuantumConstants.JOULES_TO_EV;

export class PotentialHandlesLayer extends Node {
  private readonly model: ScreenModel;
  private readonly handles: PotentialHandleNode[];
  private readonly isInsideChart: (x: number, y: number) => boolean;

  /**
   * @param model - the screen model
   * @param coordinates - the energy chart's model ↔ view conversions
   * @param isInsideChart - whether a point (nm, eV) is within the chart's current axis ranges
   */
  public constructor(
    model: ScreenModel,
    coordinates: ChartCoordinates,
    isInsideChart: (x: number, y: number) => boolean,
  ) {
    super();
    this.model = model;
    this.isInsideChart = isInsideChart;

    this.handles = PotentialHandlesLayer.createSpecs(model).map(
      (spec) => new PotentialHandleNode(spec, coordinates, model.isPlayingProperty),
    );
    this.children = this.handles;

    // Any parameter can move any handle (e.g. the depth moves the width handle up and down)
    const properties: TReadOnlyProperty<unknown>[] = [
      model.potentialTypeProperty,
      model.wellWidthProperty,
      model.wellDepthProperty,
    ];
    if (hasBarrierHeight(model)) {
      properties.push(model.barrierHeightProperty);
    }
    if (hasPotentialOffset(model)) {
      properties.push(model.potentialOffsetProperty);
    }
    if (hasWellSeparation(model)) {
      properties.push(model.wellSeparationProperty);
    }
    if (isManyWellsModel(model)) {
      properties.push(model.numberOfWellsProperty, model.electricFieldProperty);
    }
    for (const property of properties) {
      property.lazyLink(() => this.update());
    }
    this.update();
  }

  /**
   * Shows the handles of the selected potential and moves them to their points on the curve. Also called by
   * the chart when its axes change.
   */
  public update(): void {
    const type = this.model.potentialTypeProperty.value;
    for (const handle of this.handles) {
      const anchor = handle.spec.anchor(handle.spec.property.value);
      handle.visible = handle.spec.isVisibleFor(type) && this.isInsideChart(anchor.x, anchor.y);
      if (handle.visible) {
        handle.updatePosition();
      }
    }
  }

  /**
   * The handles of every potential this model offers. Positions are in nm and energies in eV, the units of the
   * model's Properties.
   */
  private static createSpecs(model: ScreenModel): HandleSpec[] {
    const width = model.wellWidthProperty;
    const depth = model.wellDepthProperty;
    const nm = stringManager.valueWithNanometersStringProperty;
    const eV = stringManager.valueWithElectronVoltsStringProperty;
    const is =
      (...types: PotentialType[]) =>
      (type: PotentialType): boolean =>
        types.includes(type);

    const spec = (
      property: NumberProperty,
      parameter: HandleSpec["parameter"],
      orientation: HandleSpec["orientation"],
      types: PotentialType[],
      anchor: HandleSpec["anchor"],
    ): HandleSpec => ({
      property,
      parameter,
      orientation,
      anchor,
      isVisibleFor: is(...types),
      valuePattern: orientation === "horizontal" ? nm : eV,
      decimalPlaces: 2,
    });

    const specs: HandleSpec[] = [
      // Infinite square well: walls at ±w/2
      spec(width, "wellWidth", "horizontal", [PotentialType.INFINITE_WELL], (w) => ({
        x: w / 2,
        y: INFINITE_WALL_HANDLE_Y,
      })),

      // Finite square well: −D on |x| ≤ w/2
      spec(width, "wellWidth", "horizontal", [PotentialType.FINITE_WELL], (w) => ({ x: w / 2, y: -depth.value / 2 })),
      spec(depth, "wellDepth", "vertical", [PotentialType.FINITE_WELL], (d) => ({ x: 0, y: -d })),

      // Harmonic oscillator: ½kx² with k = 8D/w², which passes through (±w/2, D)
      spec(width, "wellWidth", "horizontal", [PotentialType.HARMONIC_OSCILLATOR], (w) => ({
        x: w / 2,
        y: depth.value,
      })),
      spec(depth, "wellDepth", "vertical", [PotentialType.HARMONIC_OSCILLATOR], (d) => ({ x: -width.value / 2, y: d })),

      // Morse and Pöschl–Teller: minimum −D at x = 0; the width a sets how fast the curve rises from it
      spec(depth, "wellDepth", "vertical", [PotentialType.MORSE, PotentialType.POSCHL_TELLER], (d) => ({
        x: 0,
        y: -d,
      })),
      spec(width, "wellWidth", "horizontal", [PotentialType.MORSE], (a) => ({
        x: MORSE_THREE_QUARTER_POINT * a,
        y: -0.75 * depth.value,
      })),
      spec(width, "wellWidth", "horizontal", [PotentialType.POSCHL_TELLER], (a) => ({
        x: SECH2_THREE_QUARTER_POINT * a,
        y: -0.75 * depth.value,
      })),

      // Asymmetric triangle: wall at x = 0, then slope D/w; only the slope matters, set by dragging the line
      spec(depth, "wellDepth", "vertical", [PotentialType.ASYMMETRIC_TRIANGLE], (d) => ({
        x: 2,
        y: (2 * d) / width.value,
      })),
    ];

    // Rosen–Morse (−D sech² + B tanh) and Eckart (D z² − B z, z = 1/(1 + e^(x/a))) have a barrier parameter
    if (hasBarrierHeight(model)) {
      const barrier = model.barrierHeightProperty;
      specs.push(
        spec(depth, "wellDepth", "vertical", [PotentialType.ROSEN_MORSE], (d) => ({ x: 0, y: -d })),
        spec(width, "wellWidth", "horizontal", [PotentialType.ROSEN_MORSE], (a) => ({
          x: SECH2_THREE_QUARTER_POINT * a,
          y: rosenMorse(SECH2_THREE_QUARTER_POINT * a, depth.value, barrier.value, a),
        })),
        spec(barrier, "barrierHeight", "vertical", [PotentialType.ROSEN_MORSE], (b) => ({
          x: ASYMPTOTE_X,
          y: rosenMorse(ASYMPTOTE_X, depth.value, b, width.value),
        })),
        spec(depth, "wellDepth", "vertical", [PotentialType.ECKART], (d) => ({
          x: -ASYMPTOTE_X,
          y: eckart(-ASYMPTOTE_X, d, barrier.value, width.value),
        })),
        spec(barrier, "barrierHeight", "vertical", [PotentialType.ECKART], (b) => ({
          x: 0,
          y: eckart(0, depth.value, b, width.value),
        })),
        spec(width, "wellWidth", "horizontal", [PotentialType.ECKART], (a) => ({
          x: ECKART_HANDLE_POINT * a,
          y: eckart(ECKART_HANDLE_POINT * a, depth.value, barrier.value, a),
        })),
      );
    }

    // Triangular: V₀ = D + O outside [0, w], a ramp from O up to D + O inside
    if (hasPotentialOffset(model)) {
      const offset = model.potentialOffsetProperty;
      const triangular = [PotentialType.TRIANGULAR];
      specs.push(
        // the floor of the ramp moves the whole curve
        spec(offset, "potentialOffset", "vertical", triangular, (o) => ({ x: 0, y: o })),
        // the left plateau sets the height
        spec(depth, "wellDepth", "vertical", triangular, (d) => ({ x: -2, y: offset.value + d })),
        // the middle of the ramp sets its width
        spec(width, "wellWidth", "horizontal", triangular, (w) => ({ x: w / 2, y: offset.value + depth.value / 2 })),
      );
    }

    // Double square well: wells on d/2 ≤ |x| ≤ d/2 + w at V = 0, barrier and exterior at D
    if (hasWellSeparation(model) && !isManyWellsModel(model)) {
      const separation = model.wellSeparationProperty;
      const double = [PotentialType.DOUBLE_SQUARE_WELL];
      specs.push(
        spec(width, "wellWidth", "horizontal", double, (w) => ({
          x: separation.value / 2 + w,
          y: depth.value / 2,
        })),
        spec(separation, "wellSeparation", "horizontal", double, (d) => ({ x: d / 2, y: depth.value / 4 })),
        spec(depth, "wellDepth", "vertical", double, (d) => ({
          x: -Math.min(MAX_HANDLE_X, separation.value / 2 + width.value + PLATEAU_MARGIN),
          y: d,
        })),
      );

      const smooth = [PotentialType.DOUBLE_POSCHL_TELLER];
      const outerCenter = (w: number, s: number): number => (w + s) / 2;
      const smoothPoint = (x: number, w: number, d: number, s: number): { x: number; y: number } => ({
        x: x,
        y: smoothWellEnergy(x, 2, w, d, s),
      });
      specs.push(
        spec(width, "wellWidth", "horizontal", smooth, (w) =>
          smoothPoint(
            outerCenter(w, separation.value) + (SECH2_THREE_QUARTER_POINT * w) / 2,
            w,
            depth.value,
            separation.value,
          ),
        ),
        spec(separation, "wellSeparation", "horizontal", smooth, (s) =>
          smoothPoint(outerCenter(width.value, s), width.value, depth.value, s),
        ),
        spec(depth, "wellDepth", "vertical", smooth, (d) =>
          smoothPoint(outerCenter(width.value, separation.value), width.value, d, separation.value),
        ),
      );
    }

    // Multi-square well (N wells, barriers of width d, total T = Nw + (N − 1)d centred at 0)
    // and a row of smooth Pöschl–Teller wells, both tilted by eℰx.
    if (isManyWellsModel(model) && hasElectricField(model)) {
      const separation = model.wellSeparationProperty;
      const count = model.numberOfWellsProperty;
      const field = model.electricFieldProperty;
      const total = (w: number, d: number): number => count.value * w + (count.value - 1) * d;
      const tilted = (x: number, energy: number): { x: number; y: number } => ({ x: x, y: energy + field.value * x });
      const squares = [PotentialType.MULTI_SQUARE_WELL];
      specs.push(
        spec(width, "wellWidth", "horizontal", squares, (w) => tilted(total(w, separation.value) / 2, depth.value / 2)),
        {
          ...spec(separation, "wellSeparation", "horizontal", squares, (d) =>
            tilted(total(width.value, d) / 2 - width.value, depth.value / 4),
          ),
          isVisibleFor: (type) => type === PotentialType.MULTI_SQUARE_WELL && count.value > 1,
        },
        spec(depth, "wellDepth", "vertical", squares, (d) =>
          tilted(Math.min(MAX_HANDLE_X, total(width.value, separation.value) / 2 + PLATEAU_MARGIN), d),
        ),
      );
      const smooth = [PotentialType.MULTI_POSCHL_TELLER];
      const centralRightCenter = (w: number, s: number): number => (count.value % 2 === 0 ? 0.5 : 1) * (w + s);
      const smoothPoint = (x: number, w: number, d: number, s: number): { x: number; y: number } => ({
        x: x,
        y: smoothWellEnergy(x, count.value, w, d, s, field.value),
      });
      specs.push(
        spec(width, "wellWidth", "horizontal", smooth, (w) =>
          smoothPoint(
            centralRightCenter(w, separation.value) + (SECH2_THREE_QUARTER_POINT * w) / 2,
            w,
            depth.value,
            separation.value,
          ),
        ),
        {
          ...spec(separation, "wellSeparation", "horizontal", smooth, (s) =>
            smoothPoint(centralRightCenter(width.value, s), width.value, depth.value, s),
          ),
          isVisibleFor: (type) => type === PotentialType.MULTI_POSCHL_TELLER && count.value > 1,
        },
        spec(depth, "wellDepth", "vertical", smooth, (d) =>
          smoothPoint(centralRightCenter(width.value, separation.value), width.value, d, separation.value),
        ),
      );
    }

    return specs;
  }
}
