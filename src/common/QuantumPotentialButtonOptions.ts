/**
 * Shared, fleet-standard flat appearance options for simulation buttons.
 *
 * Template-owned toolkit: each sim uses only some of these, so every export is tagged
 * `@public` to tell dead-code checkers (knip) that an unused one is not dead code.
 */

import type { PlayPauseStepButtonGroupOptions } from "scenerystack/scenery-phet";
import { ButtonNode } from "scenerystack/sun";
import QuantumPotentialColors from "../QuantumPotentialColors.js";

/** @public */
export const FLAT_BUTTON_APPEARANCE_OPTIONS = {
  buttonAppearanceStrategy: ButtonNode.FlatAppearanceStrategy,
} as const;

/** @public */
export const FLAT_PANEL_PUSH_BUTTON_OPTIONS = {
  ...FLAT_BUTTON_APPEARANCE_OPTIONS,
  baseColor: QuantumPotentialColors.controlPanelBackgroundColorProperty,
  disabledColor: QuantumPotentialColors.disabledButtonColorProperty,
} as const;

/** @public */
export const FLAT_RESET_ALL_BUTTON_OPTIONS = { ...FLAT_BUTTON_APPEARANCE_OPTIONS } as const;

export const FLAT_INFO_BUTTON_OPTIONS = FLAT_BUTTON_APPEARANCE_OPTIONS;

/** @public */
export const FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS = {
  playPauseButtonOptions: FLAT_BUTTON_APPEARANCE_OPTIONS,
  stepForwardButtonOptions: FLAT_BUTTON_APPEARANCE_OPTIONS,
  stepBackwardButtonOptions: FLAT_BUTTON_APPEARANCE_OPTIONS,
} satisfies PlayPauseStepButtonGroupOptions;
