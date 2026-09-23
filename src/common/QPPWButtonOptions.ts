/** Shared, fleet-standard flat appearance options for simulation buttons. */

import type { PlayPauseStepButtonGroupOptions } from "scenerystack/scenery-phet";
import { ButtonNode } from "scenerystack/sun";
import QPPWColors from "../QPPWColors.js";

export const FLAT_BUTTON_APPEARANCE_OPTIONS = {
  buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
} as const;

export const FLAT_PANEL_PUSH_BUTTON_OPTIONS = {
  ...FLAT_BUTTON_APPEARANCE_OPTIONS,
  baseColor: QPPWColors.controlPanelBackgroundColorProperty,
  disabledColor: QPPWColors.disabledButtonColorProperty,
} as const;

export const FLAT_RESET_ALL_BUTTON_OPTIONS = FLAT_BUTTON_APPEARANCE_OPTIONS;

export const FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS = {
  playPauseButtonOptions: FLAT_BUTTON_APPEARANCE_OPTIONS,
  stepForwardButtonOptions: FLAT_BUTTON_APPEARANCE_OPTIONS,
  stepBackwardButtonOptions: FLAT_BUTTON_APPEARANCE_OPTIONS,
} satisfies PlayPauseStepButtonGroupOptions;
