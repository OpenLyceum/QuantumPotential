/**
 * TwoWellsViewState holds display-related properties specific to the Two Wells screen.
 */

import { Property } from "scenerystack/axon";
import { BaseViewState, type DisplayMode } from "../../common/view/BaseViewState.js";

export class TwoWellsViewState extends BaseViewState {
  // Two Wells-specific display mode (includes "phaseColor" mode)
  public readonly displayModeProperty: Property<DisplayMode>;

  public constructor() {
    super();

    // Initialize two wells-specific display settings
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
