/**
 * OneWellScreenView is the main view for the One Well screen.
 * It displays a single quantum potential well and its wave functions.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import type { ScreenViewOptions } from "scenerystack/sim";
import { PotentialType } from "../../common/model/PotentialFunction.js";
import { BaseScreenView, type ScreenStringProperties } from "../../common/view/BaseScreenView.js";
import stringManager from "../../i18n/StringManager.js";
import type { OneWellModel } from "../model/OneWellModel.js";
import { OneWellViewState } from "./OneWellViewState.js";

export class OneWellScreenView extends BaseScreenView {
  private readonly viewState: OneWellViewState;

  public constructor(model: OneWellModel, options?: ScreenViewOptions) {
    super(
      model,
      {
        screenDescriptionStringProperty: stringManager.getScreenSummaryDescriptions().oneWellStringProperty,
      },
      options,
    );

    // Create the view state for display properties
    this.viewState = new OneWellViewState();

    // Create the standard quantum well layout, excluding Double Square Well
    // which is meant for the Two Wells screen
    const allowedPotentials = [
      PotentialType.INFINITE_WELL,
      PotentialType.FINITE_WELL,
      PotentialType.HARMONIC_OSCILLATOR,
      PotentialType.MORSE,
      PotentialType.POSCHL_TELLER,
      PotentialType.ROSEN_MORSE,
      PotentialType.ECKART,
      PotentialType.ASYMMETRIC_TRIANGLE,
      PotentialType.TRIANGULAR,
      PotentialType.COULOMB_1D,
    ];

    this.createStandardLayout(model, this.viewState, {
      allowedPotentialTypes: allowedPotentials,
    });
  }

  /**
   * Get screen-specific string properties for creating dialog content.
   */
  protected getScreenStringProperties(): ScreenStringProperties {
    return {
      titleStringProperty: stringManager.oneWellStringProperty,
      descriptionStringProperty: stringManager.oneWellDescriptionStringProperty,
      keyConceptsStringProperty: stringManager.oneWellKeyConceptsStringProperty,
      interactionsStringProperty: stringManager.oneWellInteractionsStringProperty,
      educationalContentStringProperty: stringManager.oneWellEducationalContentStringProperty,
    };
  }

  /**
   * Get the common "Key Concepts" title string property.
   */
  protected getKeyConceptsTitleStringProperty(): TReadOnlyProperty<string> {
    return stringManager.keyConceptsTitleStringProperty;
  }

  /**
   * Get the common "Interactions" title string property.
   */
  protected getInteractionsTitleStringProperty(): TReadOnlyProperty<string> {
    return stringManager.interactionsTitleStringProperty;
  }

  /**
   * Resets the screen view to its initial state.
   */
  public override reset(): void {
    super.reset();
    this.viewState.reset();
  }

  /**
   * Steps the screen view forward in time.
   * @param dt - The time step in seconds
   */
  public override step(dt: number): void {
    super.step(dt);
    if (this.model) {
      (this.model as OneWellModel).step(dt);
    }
  }
}
