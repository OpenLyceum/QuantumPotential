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
