/**
 * TwoWellsScreenView is the main view for the Two Wells screen.
 * It displays a double quantum potential well and demonstrates quantum tunneling.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import type { ScreenViewOptions } from "scenerystack/sim";
import { PotentialType } from "../../common/model/PotentialFunction.js";
import { BaseScreenView, type ScreenStringProperties } from "../../common/view/BaseScreenView.js";
import stringManager from "../../i18n/StringManager.js";
import type { TwoWellsModel } from "../model/TwoWellsModel.js";
import { TwoWellsViewState } from "./TwoWellsViewState.js";

export class TwoWellsScreenView extends BaseScreenView {
  private readonly viewState: TwoWellsViewState;

  public constructor(model: TwoWellsModel, options?: ScreenViewOptions) {
    super(
      model,
      {
        screenDescriptionStringProperty: stringManager.getScreenSummaryDescriptions().twoWellsStringProperty,
      },
      options,
    );

    // Create the view state for display properties
    this.viewState = new TwoWellsViewState();

    // Create the standard quantum well layout with custom control panel options
    // - Hide particle mass slider
    // - Allow Coulomb 1D and Double Square Well potential types
    this.createStandardLayout(model, this.viewState, {
      showParticleMass: false,
      allowedPotentialTypes: [PotentialType.COULOMB_1D, PotentialType.DOUBLE_SQUARE_WELL],
    });

    // Set up PDOM (Parallel DOM) structure for accessibility
    this.setupAccessibility(model);
  }

  /**
   * Sets up the PDOM structure for accessibility.
   */
  private setupAccessibility(_model: TwoWellsModel): void {
    // Set PDOM navigation order for play area and control area
    const playAreaChildren = [];
    if (this.chartsContainer) {
      playAreaChildren.push(this.chartsContainer);
    }

    const controlAreaChildren = [];
    if (this.controlPanel) {
      controlAreaChildren.push(this.controlPanel);
    }
    if (this.simulationControlBar) {
      controlAreaChildren.push(this.simulationControlBar);
    }

    this.setupPDOMStructure(playAreaChildren, controlAreaChildren);
  }

  /**
   * Get screen-specific string properties for creating dialog content.
   */
  protected getScreenStringProperties(): ScreenStringProperties {
    return {
      titleStringProperty: stringManager.twoWellsStringProperty,
      descriptionStringProperty: stringManager.twoWellsDescriptionStringProperty,
      keyConceptsStringProperty: stringManager.twoWellsKeyConceptsStringProperty,
      interactionsStringProperty: stringManager.twoWellsInteractionsStringProperty,
      educationalContentStringProperty: stringManager.twoWellsEducationalContentStringProperty,
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
    (this.model as TwoWellsModel).step(dt);
  }
}
