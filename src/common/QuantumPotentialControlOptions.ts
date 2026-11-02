/**
 * Shared sizing and profile-aware colors for controls drawn on simulation panels.
 *
 * Template-owned toolkit: each sim uses only some of these, so every export is tagged
 * `@public` to tell dead-code checkers (knip) that an unused one is not dead code.
 */

import { Dimension2 } from "scenerystack/dot";
import type { CheckboxOptions, HSliderOptions } from "scenerystack/sun";
import QuantumPotentialColors from "../QuantumPotentialColors.js";

/** @public */
export const PANEL_SLIDER_OPTIONS = {
  trackSize: new Dimension2(150, 4),
  thumbSize: new Dimension2(15, 30),
  trackFillEnabled: QuantumPotentialColors.textFillProperty,
} satisfies HSliderOptions;

export const COMPACT_PANEL_SLIDER_OPTIONS = {
  ...PANEL_SLIDER_OPTIONS,
  trackSize: new Dimension2(120, 4),
} satisfies HSliderOptions;

/** @public */
export const PANEL_CHECKBOX_OPTIONS = {
  boxWidth: 16,
  spacing: 4,
  checkboxColor: QuantumPotentialColors.textFillProperty,
  checkboxColorBackground: QuantumPotentialColors.panelFillProperty,
} satisfies CheckboxOptions;
