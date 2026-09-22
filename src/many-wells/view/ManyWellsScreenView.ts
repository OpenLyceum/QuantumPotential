/**
 * ManyWellsScreenView is the main view for the Many Wells screen.
 * It displays multiple quantum potential wells (1-10) with two potential types:
 * - Multi-square well (generalization of double square well)
 * - Multi-Coulomb 1D (multiple Coulomb centers)
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import type { ScreenViewOptions } from "scenerystack/sim";
import { PotentialType } from "../../common/model/PotentialFunction.js";
import { BaseScreenView, type ScreenStringProperties } from "../../common/view/BaseScreenView.js";
import stringManager from "../../i18n/StringManager.js";
import type { ManyWellsModel } from "../model/ManyWellsModel.js";
import { ManyWellsViewState } from "./ManyWellsViewState.js";

export class ManyWellsScreenView extends BaseScreenView {
  private readonly viewState: ManyWellsViewState;

  public constructor(model: ManyWellsModel, options?: ScreenViewOptions) {
    super(
      model,
      {
        screenName: "Many Wells",
        screenDescription:
          "Many Wells screen for exploring band structure and quantum mechanics in multi-well potentials.",
      },
      options,
    );

    // Create the view state for display properties
    this.viewState = new ManyWellsViewState();

    // Create the standard quantum well layout with custom control panel options
    // - Hide particle mass slider (use electron mass for simplicity)
    // - Allow Multi-Square Well and Multi-Coulomb 1D potential types
    // - Show number of wells slider (1-10)
    this.createStandardLayout(model, this.viewState, {
      showParticleMass: false,
      allowedPotentialTypes: [PotentialType.MULTI_SQUARE_WELL, PotentialType.MULTI_COULOMB_1D],
    });

    // Set up PDOM (Parallel DOM) structure for accessibility
    this.setupAccessibility(model);
  }

  /**
   * Sets up the PDOM structure for accessibility.
   */
  private setupAccessibility(_model: ManyWellsModel): void {
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
      titleStringProperty: stringManager.manyWellsStringProperty,
      descriptionStringProperty: stringManager.manyWellsDescriptionStringProperty,
      keyConceptsStringProperty: stringManager.manyWellsKeyConceptsStringProperty,
      interactionsStringProperty: stringManager.manyWellsInteractionsStringProperty,
      educationalContentStringProperty: stringManager.manyWellsEducationalContentStringProperty,
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
    (this.model as ManyWellsModel).step(dt);
  }
}
