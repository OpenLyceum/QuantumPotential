/** Control for choosing one of the bound-state energy levels. */

import { Property } from "scenerystack/axon";
import { Range } from "scenerystack/dot";
import { HBox, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { NumberSpinner } from "scenerystack/sun";
import stringManager from "../../i18n/StringManager.js";
import QPPWColors from "../../QPPWColors.js";
import type { ScreenModel } from "../model/ScreenModels.js";

export class EnergyLevelControl extends HBox {
  public constructor(model: ScreenModel) {
    const maximumIndex = model.selectedEnergyLevelIndexProperty.range.max;
    const rangeProperty = new Property(
      new Range(0, Math.min(maximumIndex, Math.max(0, (model.getBoundStates()?.energies.length ?? 0) - 1))),
    );
    const spinner = new NumberSpinner(model.selectedEnergyLevelIndexProperty, rangeProperty, {
      arrowsPosition: "leftRight",
      deltaValue: 1,
      xSpacing: 5,
      arrowButtonOptions: { baseColor: QPPWColors.controlPanelBackgroundColorProperty },
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
    });

    super({
      spacing: 8,
      align: "center",
      children: [
        new Text(stringManager.energyLevelStringProperty, {
          font: new PhetFont(13),
          fill: QPPWColors.textFillProperty,
        }),
        spinner,
      ],
    });

    const updateRange = () => {
      const count = model.getBoundStates()?.energies.length ?? 0;
      // A potential change can leave a stale selection until the model's next step.
      // Keep that value in range while preventing the spinner from advancing farther.
      rangeProperty.value = new Range(
        0,
        Math.min(maximumIndex, Math.max(0, count - 1, model.selectedEnergyLevelIndexProperty.value)),
      );
      spinner.enabled = count > 0;
    };
    model.selectedEnergyLevelIndexProperty.lazyLink(updateRange);
    model.potentialTypeProperty.lazyLink(updateRange);
    model.wellWidthProperty.lazyLink(updateRange);
    model.wellDepthProperty.lazyLink(updateRange);
    model.wellOffsetProperty.lazyLink(updateRange);
    model.particleMassProperty.lazyLink(updateRange);
    if ("barrierHeightProperty" in model) {
      model.barrierHeightProperty.lazyLink(updateRange);
    }
    if ("barrierWidthProperty" in model) {
      model.barrierWidthProperty.lazyLink(updateRange);
    }
    if ("potentialOffsetProperty" in model) {
      model.potentialOffsetProperty.lazyLink(updateRange);
    }
    if ("wellSeparationProperty" in model) {
      model.wellSeparationProperty.lazyLink(updateRange);
    }
    if ("numberOfWellsProperty" in model) {
      model.numberOfWellsProperty.lazyLink(updateRange);
    }
    if ("electricFieldProperty" in model) {
      model.electricFieldProperty.lazyLink(updateRange);
    }
    updateRange();
  }
}
