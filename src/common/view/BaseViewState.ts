/**
 * BaseViewState holds display-related properties that control what is shown in the view.
 * This separates view concerns from the physics model, following proper MVC architecture.
 */

import { Property } from "scenerystack/axon";

// Union type for all possible display modes across all screens
export type DisplayMode = "probabilityDensity" | "waveFunction" | "phaseColor";

export abstract class BaseViewState {
  // Wave function component visibility
  public readonly showRealPartProperty: Property<boolean>;
  public readonly showImaginaryPartProperty: Property<boolean>;
  public readonly showMagnitudeProperty: Property<boolean>;
  public readonly showPhaseProperty: Property<boolean>;
  public readonly showClassicalProbabilityProperty: Property<boolean>;
  public readonly showZerosProperty: Property<boolean>;

  // Chart element visibility
  public readonly showTotalEnergyProperty: Property<boolean>;
  public readonly showPotentialEnergyProperty: Property<boolean>;

  // Display mode (common to all screens)
  public abstract readonly displayModeProperty: Property<DisplayMode | "probabilityDensity" | "waveFunction">;

  protected constructor() {
    // Initialize display settings with default values
    this.showRealPartProperty = new Property<boolean>(true);
    this.showImaginaryPartProperty = new Property<boolean>(false);
    this.showMagnitudeProperty = new Property<boolean>(false);
    this.showPhaseProperty = new Property<boolean>(false);
    this.showClassicalProbabilityProperty = new Property<boolean>(false);
    this.showZerosProperty = new Property<boolean>(false);

    // Initialize chart visibility
    this.showTotalEnergyProperty = new Property<boolean>(true);
    this.showPotentialEnergyProperty = new Property<boolean>(true);
  }

  /**
   * Resets all view state properties to their initial values.
   * Subclasses should override this method and call super.reset().
   */
  public reset(): void {
    this.showRealPartProperty.reset();
    this.showImaginaryPartProperty.reset();
    this.showMagnitudeProperty.reset();
    this.showPhaseProperty.reset();
    this.showClassicalProbabilityProperty.reset();
    this.showZerosProperty.reset();
    this.showTotalEnergyProperty.reset();
    this.showPotentialEnergyProperty.reset();
  }
}
