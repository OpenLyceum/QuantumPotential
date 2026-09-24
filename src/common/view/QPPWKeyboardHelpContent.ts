/**
 * QPPWKeyboardHelpContent — content for the standard keyboard-help dialog (the keyboard button joist adds
 * to the navigation bar), shared by every screen. Its sections follow PhET's Quantum Bound States (QBSKeyboardHelpContent),
 * laid out in two columns. Every section describes keys that are actually wired up in the views:
 *
 * - Energy Levels: arrow/Home/End selection on the energy chart (EnergyChartNode)
 * - Move Draggable Items: the keyboard-draggable chart tools (area, derivative, curvature markers)
 * - Time Controls: the Alt+K play/pause hotkey registered by TimeControlNode (SimulationControlBar)
 * - Combo Boxes: the potential-type pickers
 * - Slider Controls: the potential handles, which are accessible sliders
 * - Spinner Controls: the ◀ ▶ spinners (QPPWNumberControl) for mass, number of wells, electric field, level
 * - Basic Actions: buttons, checkboxes and navigation
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
  SpinnerControlsKeyboardHelpSection,
  TextKeyNode,
  TimeControlsKeyboardHelpSection,
  TwoColumnKeyboardHelpContent,
} from "scenerystack/scenery-phet";
import stringManager from "../../i18n/StringManager.js";

export class QPPWKeyboardHelpContent extends TwoColumnKeyboardHelpContent {
  public constructor() {
    const strings = stringManager.getKeyboardShortcutsStrings();

    // Energy-level selection on the energy chart (see EnergyChartNode.setupKeyboardNavigation). This is the
    // sim-specific section, like Quantum Bound States' Reference Line section.
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

    // The sim-specific keys on the left with the other chart controls; generic controls on the right
    const leftSections = [
      energyLevelSection,
      new SliderControlsKeyboardHelpSection(),
      new MoveDraggableItemsKeyboardHelpSection(),
      new TimeControlsKeyboardHelpSection(),
    ];
    const rightSections = [
      new ComboBoxKeyboardHelpSection(),
      new SpinnerControlsKeyboardHelpSection(),
      new BasicActionsKeyboardHelpSection({ withCheckboxContent: true }),
    ];

    // Line up the key icons of the sections stacked in each column
    KeyboardHelpSection.alignHelpSectionIcons(leftSections);
    KeyboardHelpSection.alignHelpSectionIcons(rightSections);

    super(leftSections, rightSections);
  }
}
