/**
 * QPPWPreferencesNode — content of Preferences → Simulation: auto-pause when the tab is hidden.
 */

import { HStrut, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import stringManager from "../i18n/StringManager.js";
import QPPWPreferences from "./QPPWPreferencesModel.js";

const DESCRIPTION_FONT = new PhetFont(12);
const TEXT_MAX_WIDTH = 600;

export class QPPWPreferencesNode extends VBox {
  public constructor() {
    const preferencesLabels = stringManager.getPreferencesLabels();

    // Auto-pause preference
    const autoPauseSection = new VBox({
      align: "left",
      spacing: 8,
      children: [
        new Checkbox(
          QPPWPreferences.autoPauseWhenTabHiddenProperty,
          new Text(preferencesLabels.autoPauseWhenTabHiddenStringProperty, { font: new PhetFont(16) }),
          { boxWidth: 16 },
        ),
        new Text(preferencesLabels.autoPauseDescriptionStringProperty, {
          font: DESCRIPTION_FONT,
          maxWidth: TEXT_MAX_WIDTH,
        }),
      ],
    });

    super({
      align: "left",
      spacing: 20,
      children: [
        autoPauseSection,
        new HStrut(650), // minimum width
      ],
    });
  }
}
