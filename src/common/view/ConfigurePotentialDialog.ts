/** Developer control for the parameters represented by the current potential's chart handles. */

import { Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Dialog } from "scenerystack/sim";
import { HSlider, RectangularPushButton } from "scenerystack/sun";
import stringManager from "../../i18n/StringManager.js";
import QuantumPotentialColors from "../../QuantumPotentialColors.js";
import type { ScreenModel } from "../model/ScreenModels.js";
import { FLAT_PANEL_PUSH_BUTTON_OPTIONS } from "../QuantumPotentialButtonOptions.js";
import { COMPACT_PANEL_SLIDER_OPTIONS } from "../QuantumPotentialControlOptions.js";
import { QuantumPotentialDescriber } from "./accessibility/QuantumPotentialDescriber.js";
import { PotentialHandlesLayer } from "./handles/PotentialHandlesLayer.js";
import { QuantumPotentialNumberControl } from "./QuantumPotentialNumberControl.js";

/** The gear is available only with ?dev, as in Totality's Quantum Bound States. */
export function createConfigurePotentialButton(model: ScreenModel): RectangularPushButton {
  const button = new RectangularPushButton({
    ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
    content: new Text(stringManager.configurePotentialIconStringProperty, {
      font: new PhetFont(22),
      fill: QuantumPotentialColors.textFillProperty,
    }),
    accessibleName: stringManager.configurePotentialStringProperty,
    xMargin: 5,
    yMargin: 1,
    listener: () => {
      const type = model.potentialTypeProperty.value;
      const seen = new Set<object>();
      const specs = PotentialHandlesLayer.createSpecs(model).filter((spec) => {
        if (!spec.isVisibleFor(type) || seen.has(spec.property)) {
          return false;
        }
        seen.add(spec.property);
        return true;
      });

      const controls = specs.map((spec) => {
        const name = QuantumPotentialDescriber.getParameterNameProperty(spec.parameter);
        return new VBox({
          spacing: 5,
          align: "left",
          children: [
            new QuantumPotentialNumberControl(name, spec.property, {
              deltaValue: 0.01,
              decimalPlaces: spec.decimalPlaces,
              valuePattern: spec.valuePattern,
              accessibleName: name,
            }),
            new HSlider(spec.property, spec.property.range, {
              ...COMPACT_PANEL_SLIDER_OPTIONS,
              accessibleName: name,
              descriptionContent: QuantumPotentialDescriber.getSliderHelpText(spec.parameter),
            }),
          ],
        });
      });

      const dialog = new Dialog(new VBox({ spacing: 14, align: "left", children: controls }), {
        title: new Text(stringManager.configurePotentialStringProperty, {
          font: new PhetFont({ size: 18, weight: "bold" }),
          fill: QuantumPotentialColors.textFillProperty,
        }),
        accessibleName: stringManager.configurePotentialStringProperty,
        fill: QuantumPotentialColors.controlPanelBackgroundColorProperty,
        stroke: QuantumPotentialColors.controlPanelStrokeColorProperty,
        closeButtonColor: QuantumPotentialColors.textFillProperty,
        hideCallback: () => dialog.dispose(),
      });
      dialog.show();
    },
  });

  model.potentialTypeProperty.link((type) => {
    button.visible = PotentialHandlesLayer.createSpecs(model).some((spec) => spec.isVisibleFor(type));
  });
  return button;
}
