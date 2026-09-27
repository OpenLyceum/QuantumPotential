/** Control for choosing one of the bound-state energy levels. */

import { BooleanProperty, Property } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { HBox, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { NumberSpinner } from "scenerystack/sun";
import stringManager from "../../i18n/StringManager.js";
import QuantumPotentialColors from "../../QuantumPotentialColors.js";
import type { ScreenModel } from "../model/ScreenModels.js";

export class EnergyLevelControl extends HBox {
  public constructor(model: ScreenModel) {
    const maximumIndex = model.selectedEnergyLevelIndexProperty.range.max;
    const rangeProperty = new Property(
      new Range(0, Math.min(maximumIndex, Math.max(0, (model.getBoundStates()?.energies.length ?? 0) - 1))),
    );
    const enabledProperty = new BooleanProperty(false);
    const updateRange = () => {
      const count = model.getBoundStates()?.energies.length ?? 0;
      // A potential change can leave a stale selection until the model's next step.
      // Keep that value in range while preventing the spinner from advancing farther.
      rangeProperty.value = new Range(
        0,
        Math.min(maximumIndex, Math.max(0, count - 1, model.selectedEnergyLevelIndexProperty.value)),
      );
      enabledProperty.value = count > 0;
    };
    // Registered before the spinner exists, so a new selection widens the range before
    // NumberSpinner's own listener asserts the value is inside it (a chart click can select
    // a level beyond the range computed for the previous spectrum). Any parameter change
    // that alters the spectrum bumps potentialRevisionProperty.
    model.selectedEnergyLevelIndexProperty.lazyLink(updateRange);
    model.potentialRevisionProperty.lazyLink(updateRange);
    updateRange();

    const spinner = new NumberSpinner(model.selectedEnergyLevelIndexProperty, rangeProperty, {
      arrowsPosition: "leftRight",
      deltaValue: 1,
      xSpacing: 5,
      arrowButtonOptions: { baseColor: QuantumPotentialColors.controlPanelBackgroundColorProperty },
      numberDisplayOptions: {
        useRichText: true,
        numberFormatter: (index) => `E<sub>${index + 1}</sub>`,
        minBackgroundWidth: 48,
        align: "center",
        xMargin: 5,
        yMargin: 2,
        textOptions: { font: new PhetFont(13) },
      },
      accessibleName: stringManager.energyLevelStringProperty,
      enabledProperty,
    });

    super({
      spacing: 8,
      align: "center",
      children: [
        new Text(stringManager.energyLevelStringProperty, {
          font: new PhetFont(13),
          fill: QuantumPotentialColors.textFillProperty,
        }),
        spinner,
      ],
    });
  }
}
