/** Shared sizing and profile-aware colors for controls drawn on simulation panels. */

import { Dimension2 } from "scenerystack/dot";
import type { CheckboxOptions, HSliderOptions } from "scenerystack/sun";
import QPPWColors from "../QPPWColors.js";

export const PANEL_SLIDER_OPTIONS = {
  trackSize: new Dimension2(150, 4),
  thumbSize: new Dimension2(15, 30),
  trackFillEnabled: QPPWColors.textFillProperty,
} satisfies HSliderOptions;

export const COMPACT_PANEL_SLIDER_OPTIONS = {
  ...PANEL_SLIDER_OPTIONS,
  trackSize: new Dimension2(120, 4),
} satisfies HSliderOptions;

export const PANEL_CHECKBOX_OPTIONS = {
  boxWidth: 16,
  spacing: 4,
  checkboxColor: QPPWColors.textFillProperty,
  checkboxColorBackground: QPPWColors.panelFillProperty,
} satisfies CheckboxOptions;
