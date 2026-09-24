/**
 * QPPWNumberControl is a titled ◀ value ▶ control for a parameter that is not a geometric feature of the
 * potential (particle mass, number of wells, electric field), so it cannot have a handle on the energy chart.
 * It is a sun NumberSpinner (an accessible spin button: arrow keys, Home/End) with no slider track.
 */

import { type NumberProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { NumberSpinner } from "scenerystack/sun";
import QPPWColors from "../../QPPWColors.js";

export type QPPWNumberControlOptions = {
  deltaValue: number;
  decimalPlaces: number;
  valuePattern?: TReadOnlyProperty<string>; // e.g. "{{value}} mₑ"; defaults to the bare value
  accessibleName: TReadOnlyProperty<string>;
  accessibleHelpText?: TReadOnlyProperty<string>;
  // Non-uniform steps; both default to ± deltaValue
  incrementFunction?: (value: number) => number;
  decrementFunction?: (value: number) => number;
};

export class QPPWNumberControl extends VBox {
  public constructor(
    titleStringProperty: TReadOnlyProperty<string>,
    numberProperty: NumberProperty,
    options: QPPWNumberControlOptions,
  ) {
    const spinner = new NumberSpinner(numberProperty, new Property(numberProperty.range), {
      arrowsPosition: "leftRight",
      deltaValue: options.deltaValue,
      ...(options.incrementFunction ? { incrementFunction: options.incrementFunction } : {}),
      ...(options.decrementFunction ? { decrementFunction: options.decrementFunction } : {}),
      xSpacing: 6,
      arrowButtonOptions: {
        baseColor: QPPWColors.controlPanelBackgroundColorProperty,
      },
      numberDisplayOptions: {
        decimalPlaces: options.decimalPlaces,
        ...(options.valuePattern ? { valuePattern: options.valuePattern } : {}),
        align: "center",
        xMargin: 8,
        yMargin: 3,
        textOptions: { font: new PhetFont(13) },
      },
      accessibleName: options.accessibleName,
      ...(options.accessibleHelpText ? { accessibleHelpText: options.accessibleHelpText } : {}),
    });

    super({
      spacing: 4,
      align: "left",
      children: [
        new Text(titleStringProperty, {
          font: new PhetFont(13),
          fill: QPPWColors.textFillProperty,
          maxWidth: 200,
        }),
        spinner,
      ],
    });
  }
}

/**
 * Particle-mass spinner steps (in electron masses). The 0.5–50 mₑ range spans two decades, so the step grows
 * with the mass: 0.1 below 2 mₑ, 0.5 below 5 mₑ, 1 below 10 mₑ, then 5.
 */
const particleMassStep = (mass: number): number => (mass < 2 ? 0.1 : mass < 5 ? 0.5 : mass < 10 ? 1 : 5);
const roundToTenth = (value: number): number => Math.round(value * 10) / 10;

export const PARTICLE_MASS_STEP_OPTIONS = {
  deltaValue: 0.1,
  decimalPlaces: 1,
  incrementFunction: (mass: number): number => roundToTenth(mass + particleMassStep(mass)),
  // Step by the size of the band below, so increment and decrement retrace the same values
  decrementFunction: (mass: number): number => roundToTenth(mass - particleMassStep(mass - 1e-9)),
} satisfies Partial<QPPWNumberControlOptions>;
