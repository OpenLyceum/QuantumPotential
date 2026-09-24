/**
 * QPPWKeyboardHelpContent — content for the standard keyboard-help dialog (the keyboard button joist adds
 * to the navigation bar), shared by every screen. Its three-column layout follows PhET's Quantum Bound States
 * (QBSKeyboardHelpContent). Every section describes keys that are actually wired up in the views:
 *
 * - Energy Levels: arrow/Home/End selection on the energy chart (EnergyChartNode)
 * - Move Draggable Items: the keyboard-draggable chart tools (area, derivative, curvature markers)
 * - Time Controls: the Alt+K play/pause hotkey registered by TimeControlNode (SimulationControlBar)
 * - Combo Boxes: the potential-type pickers
 * - Slider Controls: the potential handles, which are accessible sliders
 * - Spinner Controls: the ◀ ▶ spinners (QPPWNumberControl) for mass, number of wells, electric field, level
 * - Basic Actions: buttons, checkboxes and navigation
 */

import { HBox, Node, VBox } from "scenerystack/scenery";
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
} from "scenerystack/scenery-phet";
import stringManager from "../../i18n/StringManager.js";

/** Spacing between columns and between the sections of a column, as in TwoColumnKeyboardHelpContent. */
const COLUMN_SPACING = 40;
const SECTION_SPACING = 40;

export class QPPWKeyboardHelpContent extends Node {
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

    const column1 = [
      energyLevelSection,
      new MoveDraggableItemsKeyboardHelpSection(),
      new TimeControlsKeyboardHelpSection(),
    ];
    const column2 = [new ComboBoxKeyboardHelpSection(), new SliderControlsKeyboardHelpSection()];
    const column3 = [
      new SpinnerControlsKeyboardHelpSection(),
      new BasicActionsKeyboardHelpSection({ withCheckboxContent: true }),
    ];

    // Line up the key icons of the sections stacked in each column
    for (const column of [column1, column2, column3]) {
      KeyboardHelpSection.alignHelpSectionIcons(column);
    }

    super({
      children: [
        new HBox({
          align: "top",
          spacing: COLUMN_SPACING,
          children: [column1, column2, column3].map(
            (sections) => new VBox({ align: "left", spacing: SECTION_SPACING, children: sections }),
          ),
        }),
      ],
    });
  }
}
