/**
 * PotentialHandleNode is a double-headed arrow on the potential curve in the energy chart. Dragging it changes
 * one parameter of the potential (width, depth, barrier height, offset or separation), so the user reshapes the
 * well directly instead of with a slider. Adapted from the handles of PhET's Quantum Bound States.
 *
 * Each handle is described by a HandleSpec: the Property it controls, the direction it moves, and an `anchor`
 * function giving the handle's point on the curve (nm, eV) for a candidate value of that Property. Dragging
 * finds the value whose anchor lies under the pointer, so a new potential only needs to say where its handles
 * sit. For the keyboard it is an accessible slider (arrow keys, Shift/Page steps, Home/End).
 */

import { type NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import type { Vector2 } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { StringUtils } from "scenerystack/phetcommon";
import { DragListener, Node, type NodeOptions, type SceneryEvent, Text } from "scenerystack/scenery";
import { ArrowNode, PhetFont } from "scenerystack/scenery-phet";
import { AccessibleSlider, type AccessibleSliderOptions } from "scenerystack/sun";
import stringManager from "../../../i18n/StringManager.js";
import QPPWColors from "../../../QPPWColors.js";
import type { PotentialType } from "../../model/PotentialFunction.js";
import { QPPWDescriber, type QPPWParameter } from "../accessibility/QPPWDescriber.js";

const a11y = stringManager.getA11yStrings();

const HANDLE_LENGTH = 34;

// Values sampled across the Property's range when solving for the value under the pointer, before refining
const COARSE_SAMPLES = 120;
const REFINE_ITERATIONS = 30;

/** A point in the energy chart's model coordinates: position (nm) and energy (eV). */
export type ChartPoint = { x: number; y: number };

export type HandleSpec = {
  property: NumberProperty;
  parameter: QPPWParameter; // names the handle for assistive technology
  orientation: "horizontal" | "vertical";

  // The handle's point on the curve if `property` had the given value (the other parameters as they are now)
  anchor: (value: number) => ChartPoint;

  // Which potential types show this handle
  isVisibleFor: (type: PotentialType) => boolean;

  // Visible value readout, e.g. "{{value}} nm"
  valuePattern: TReadOnlyProperty<string>;
  decimalPlaces: number;
};

/** Conversions between the energy chart's model coordinates and its view coordinates. */
export type ChartCoordinates = {
  toView: (point: ChartPoint) => Vector2;
  toModel: (viewPoint: Vector2) => ChartPoint;
};

export class PotentialHandleNode extends AccessibleSlider(Node, 0) {
  public readonly spec: HandleSpec;
  private readonly coordinates: ChartCoordinates;
  private readonly arrowNode: ArrowNode;
  private readonly valueText: Text;

  public constructor(
    spec: HandleSpec,
    coordinates: ChartCoordinates,
    isPlayingProperty: Property<boolean>,
    showValuesProperty: TReadOnlyProperty<boolean>,
  ) {
    const range = spec.property.range;

    // Time pauses while a handle is dragged, then resumes (as in Quantum Bound States)
    let wasPlaying = false;
    const pause = (): void => {
      wasPlaying = isPlayingProperty.value;
      isPlayingProperty.value = false;
    };
    const resume = (): void => {
      if (wasPlaying) {
        isPlayingProperty.value = true;
      }
    };

    const options: AccessibleSliderOptions & NodeOptions = {
      valueProperty: spec.property,
      enabledRangeProperty: new Property(range),
      keyboardStep: range.getLength() / 40,
      shiftKeyboardStep: range.getLength() / 200,
      pageKeyboardStep: range.getLength() / 8,
      startDrag: pause,
      endDrag: resume,
      pdomCreateAriaValueText: (value: number) =>
        StringUtils.fillIn(spec.valuePattern, { value: value.toFixed(spec.decimalPlaces) }),
      cursor: "pointer",

      // PDOM
      accessibleName: QPPWDescriber.getParameterNameProperty(spec.parameter),
      accessibleHelpText: QPPWDescriber.getSliderHelpText(spec.parameter),
      accessibleRoleDescription: a11y.handles.roleDescriptionStringProperty,
    };

    // The mixin's constructor is typed with its super type's options; AccessibleSlider reads its own from them
    super(options as NodeOptions);

    this.spec = spec;
    this.coordinates = coordinates;

    const halfLength = HANDLE_LENGTH / 2;
    const [tailX, tailY, tipX, tipY] =
      spec.orientation === "horizontal" ? [-halfLength, 0, halfLength, 0] : [0, -halfLength, 0, halfLength];
    this.arrowNode = new ArrowNode(tailX, tailY, tipX, tipY, {
      doubleHead: true,
      headHeight: 10,
      headWidth: 14,
      tailWidth: 5,
      fill: QPPWColors.potentialHandleFillProperty,
      stroke: QPPWColors.potentialHandleStrokeProperty,
    });
    this.addChild(this.arrowNode);

    this.valueText = new Text("", {
      font: new PhetFont(11),
      fill: QPPWColors.potentialHandleFillProperty,
      pickable: false,
    });
    this.addChild(this.valueText);

    this.mouseArea = this.arrowNode.localBounds.dilated(4);
    this.touchArea = this.arrowNode.localBounds.dilated(12);
    this.focusHighlight = Shape.bounds(this.arrowNode.localBounds.dilated(4));

    this.addInputListener(
      new DragListener({
        start: pause,
        drag: (event: SceneryEvent) => {
          const parentPoint = this.globalToParentPoint(event.pointer.point);
          spec.property.value = this.getValueForPoint(this.coordinates.toModel(parentPoint));
        },
        end: resume,
      }),
    );

    const parameterNameProperty = QPPWDescriber.getParameterNameProperty(spec.parameter);
    const updateValueText = () => {
      this.valueText.string = showValuesProperty.value
        ? `${parameterNameProperty.value} = ${StringUtils.fillIn(spec.valuePattern, { value: spec.property.value.toFixed(spec.decimalPlaces) })}`
        : "";
      this.updateLabelPosition();
    };
    spec.property.link(updateValueText);
    showValuesProperty.lazyLink(updateValueText);
    parameterNameProperty.lazyLink(updateValueText);
    spec.valuePattern.lazyLink(updateValueText);
  }

  /**
   * Moves the handle to its anchor on the current curve.
   */
  public updatePosition(): void {
    this.translation = this.coordinates.toView(this.spec.anchor(this.spec.property.value));
  }

  private updateLabelPosition(): void {
    if (this.spec.orientation === "horizontal") {
      this.valueText.centerX = 0;
      this.valueText.bottom = this.arrowNode.top - 2;
    } else {
      this.valueText.left = this.arrowNode.right + 4;
      this.valueText.centerY = 0;
    }
  }

  /**
   * The value of the Property whose anchor is closest to the target along the handle's direction: a coarse
   * scan of the range (the anchor need not be monotonic in the value), then bisection-like refinement between
   * the neighbours of the best sample.
   */
  public getValueForPoint(target: ChartPoint): number {
    const { min, max } = this.spec.property.range;
    const coordinate = (value: number): number => {
      const point = this.spec.anchor(value);
      return this.spec.orientation === "horizontal" ? point.x : point.y;
    };
    const goal = this.spec.orientation === "horizontal" ? target.x : target.y;
    const error = (value: number): number => Math.abs(coordinate(value) - goal);

    let best = min;
    let bestError = error(min);
    const step = (max - min) / COARSE_SAMPLES;
    for (let i = 1; i <= COARSE_SAMPLES; i++) {
      const value = min + i * step;
      const e = error(value);
      if (e < bestError) {
        best = value;
        bestError = e;
      }
    }

    // Golden-section search on the error within one step of the best sample
    let lo = Math.max(min, best - step);
    let hi = Math.min(max, best + step);
    const ratio = (Math.sqrt(5) - 1) / 2;
    for (let i = 0; i < REFINE_ITERATIONS; i++) {
      const a = hi - ratio * (hi - lo);
      const b = lo + ratio * (hi - lo);
      if (error(a) < error(b)) {
        hi = b;
      } else {
        lo = a;
      }
    }
    return Math.min(max, Math.max(min, (lo + hi) / 2));
  }
}
