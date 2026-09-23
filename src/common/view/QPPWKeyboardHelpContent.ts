/**
 * QPPWKeyboardHelpContent — content for the standard keyboard-help dialog (the "?" button joist adds
 * to the navigation bar), shared by every screen. It mirrors the keys actually wired up in the views:
 * energy-level selection on the energy chart (EnergyChartNode), the potential handles on that chart
 * (accessible sliders, so the slider section covers them), the combo boxes and ◀ ▶ spinners in the
 * control panels, and the keyboard-draggable chart tools (area, derivative, curvature).
 */

import {
  ArrowKeyNode,
  BasicActionsKeyboardHelpSection,
  ComboBoxKeyboardHelpSection,
  KeyboardHelpIconFactory,
  KeyboardHelpSection,
  KeyboardHelpSectionRow,
  MoveDraggableItemsKeyboardHelpSection,
  SliderControlsKeyboardHelpSection,
  TextKeyNode,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import stringManager from "../../i18n/StringManager.js";

export class QPPWKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    const strings = stringManager.getKeyboardShortcutsStrings();

    // Energy-level selection on the energy chart (see EnergyChartNode.setupKeyboardNavigation).
    const energyLevelSection = new KeyboardHelpSection(strings.energyLevelNavigationStringProperty, [
      KeyboardHelpSectionRow.labelWithIcon(
        strings.arrowUpRightDescriptionStringProperty,
        KeyboardHelpIconFactory.iconOrIcon(new ArrowKeyNode("up"), new ArrowKeyNode("right")),
      ),
      KeyboardHelpSectionRow.labelWithIcon(
        strings.arrowDownLeftDescriptionStringProperty,
        KeyboardHelpIconFactory.iconOrIcon(new ArrowKeyNode("down"), new ArrowKeyNode("left")),
      ),
      KeyboardHelpSectionRow.labelWithIcon(strings.homeDescriptionStringProperty, TextKeyNode.home()),
      KeyboardHelpSectionRow.labelWithIcon(strings.endDescriptionStringProperty, TextKeyNode.end()),
    ]);

    const sliderSection = new SliderControlsKeyboardHelpSection();
    const comboBoxSection = new ComboBoxKeyboardHelpSection();
    const moveToolsSection = new MoveDraggableItemsKeyboardHelpSection();
    const basicActionsSection = new BasicActionsKeyboardHelpSection({ withCheckboxContent: true });

    KeyboardHelpSection.alignHelpSectionIcons([energyLevelSection, sliderSection]);

    super([energyLevelSection, sliderSection, comboBoxSection], [moveToolsSection, basicActionsSection]);
  }
}
