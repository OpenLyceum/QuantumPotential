/**
 * IntroViewState holds display-related properties specific to the Intro screen.
 */

import { Property } from "scenerystack/axon";
import { BaseViewState, type DisplayMode } from "../../common/view/BaseViewState.js";

// Intro screen only supports these two modes (no "phaseColor")
export type IntroDisplayMode = "probabilityDensity" | "waveFunction";

export class IntroViewState extends BaseViewState {
  // Intro-specific display mode (simplified, no "phaseColor" mode)
  // Note: Uses DisplayMode type for compatibility with base class, but only "probabilityDensity" and "waveFunction" are used
  public readonly displayModeProperty: Property<DisplayMode>;

  public constructor() {
    super();

    // Initialize intro-specific display settings
    this.displayModeProperty = new Property<DisplayMode>("probabilityDensity");
  }

  /**
   * Resets all view state properties to their initial values.
   */
  public override reset(): void {
    super.reset();
    this.displayModeProperty.reset();
  }
}
