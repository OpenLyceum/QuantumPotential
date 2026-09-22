/**
 * BaseScreenView is an abstract base class for all screen views in the QPPW simulation.
 * It provides common functionality including standard layout for quantum well simulations.
 */

import { DerivedProperty, Property, type TReadOnlyProperty } from "scenerystack/axon";
import { Node, RichText, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenSummaryContent, ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import type { ManyWellsModel } from "../../many-wells/model/ManyWellsModel.js";
import type { ManyWellsViewState } from "../../many-wells/view/ManyWellsViewState.js";
import type { OneWellModel } from "../../one-well/model/OneWellModel.js";
import type { OneWellViewState } from "../../one-well/view/OneWellViewState.js";
import QPPWColors from "../../QPPWColors.js";
import type { TwoWellsModel } from "../../two-wells/model/TwoWellsModel.js";
import type { TwoWellsViewState } from "../../two-wells/view/TwoWellsViewState.js";
import type { BaseModel } from "../model/BaseModel.js";
import { QPPWAlerter } from "./accessibility/QPPWAlerter.js";
import { QPPWDescriber } from "./accessibility/QPPWDescriber.js";
import { ControlPanelNode, type ControlPanelNodeOptions } from "./ControlPanelNode.js";
import { EnergyChartNode } from "./EnergyChartNode.js";
import { SimulationControlBar } from "./SimulationControlBar.js";
import { WaveFunctionChartNode } from "./WaveFunctionChartNode.js";

/**
 * Screen-specific string properties for info dialog and screen summary.
 */
export type ScreenStringProperties = {
  titleStringProperty: TReadOnlyProperty<string>;
  descriptionStringProperty: TReadOnlyProperty<string>;
  keyConceptsStringProperty: TReadOnlyProperty<string>;
  interactionsStringProperty: TReadOnlyProperty<string>;
  educationalContentStringProperty: TReadOnlyProperty<string>;
};

/**
 * Options for screen summary content.
 */
export type ScreenSummaryOptions = {
  screenName: string;
  screenDescription: string;
};

export abstract class BaseScreenView extends ScreenView {
  protected readonly resetButton: ResetAllButton;
  protected readonly model: BaseModel | OneWellModel | TwoWellsModel | ManyWellsModel;

  // Common components (may be undefined for screens that don't use them)
  protected energyChart?: EnergyChartNode;
  protected waveFunctionChart?: WaveFunctionChartNode;
  protected controlPanel?: ControlPanelNode;
  protected simulationControlBar?: SimulationControlBar;
  protected chartsContainer?: Node;
  protected listBoxParent?: Node;

  // PDOM (Parallel DOM) structure components for accessibility
  protected alerter?: QPPWAlerter;

  protected constructor(
    model: BaseModel | OneWellModel | TwoWellsModel | ManyWellsModel,
    screenSummaryOptions: ScreenSummaryOptions,
    options?: ScreenViewOptions,
  ) {
    // Create screen summary content before calling super()
    const screenSummaryContent = BaseScreenView.createScreenSummaryContent(model, screenSummaryOptions);

    super({
      ...options,
      screenSummaryContent,
    });

    this.model = model;

    // Create the alerter for accessibility announcements using global voicing utterance queue
    this.alerter = new QPPWAlerter(model);

    // Create the reset all button in the bottom-right corner
    this.resetButton = new ResetAllButton({
      listener: () => {
        model.reset();
        this.reset();

        // Announce reset to screen readers
        if (this.alerter) {
          this.alerter.alertResetAll();
        }
      },
      right: this.layoutBounds.maxX - 10,
      bottom: this.layoutBounds.maxY - 10,

      // PDOM
      innerContent: "Reset All",
      // TODO: Add helpText when PhET accessibility is fully configured
      // helpText: "Return all parameters to their initial values. Keyboard shortcut: Alt+R.",
    });
    this.addChild(this.resetButton);
  }

  /**
   * Creates the standard quantum well layout with charts, control panel, and simulation controls.
   * This should be called by subclasses that use the standard layout.
   * @param model - The OneWellModel, TwoWellsModel, or ManyWellsModel instance
   * @param viewState - The view state for display properties
   * @param controlPanelOptions - Optional configuration for the control panel (e.g., hiding mass slider, filtering potential types)
   */
  protected createStandardLayout(
    model: OneWellModel | TwoWellsModel | ManyWellsModel,
    viewState: OneWellViewState | TwoWellsViewState | ManyWellsViewState,
    controlPanelOptions?: ControlPanelNodeOptions,
  ): void {
    // Calculate layout dimensions
    const screenWidth = this.layoutBounds.width;
    const screenHeight = this.layoutBounds.height;
    const margin = 20;

    // Fixed chart dimensions (both charts share the same width and have fixed height)
    const chartsWidth = 600; // Fixed width for consistency
    const energyChartHeight = 300; // Fixed height for energy chart
    const waveFunctionChartHeight = 180; // Fixed height for wavefunction chart (reduced by 40%)

    // Create the energy chart (top plot)
    this.energyChart = new EnergyChartNode(model, viewState, {
      width: chartsWidth,
      height: energyChartHeight,
    });

    // Create the wave function chart (bottom plot)
    this.waveFunctionChart = new WaveFunctionChartNode(model, viewState, {
      width: chartsWidth,
      height: waveFunctionChartHeight,
    });

    // Position charts with fixed layout, ensuring x-axes align horizontally
    this.energyChart.left = margin;
    this.energyChart.top = 10; // Reduced from margin to move energy chart upward and avoid overlap

    this.waveFunctionChart.left = margin; // Same left position to align x-axes
    this.waveFunctionChart.top = margin + energyChartHeight; // Reduced spacing between charts

    // Create container for charts
    this.chartsContainer = new Node({
      children: [this.energyChart, this.waveFunctionChart],
    });

    // Create listbox parent node for ComboBox popups (if not already created by subclass)
    if (!this.listBoxParent) {
      this.listBoxParent = new Node();
    }

    // Create control panel with optional configuration
    this.controlPanel = new ControlPanelNode(model, viewState, this.listBoxParent, controlPanelOptions);
    this.controlPanel.left = chartsWidth + margin * 2;
    this.controlPanel.top = margin;

    // Create simulation control bar (footer)
    this.simulationControlBar = new SimulationControlBar(model, {
      width: screenWidth,
    });
    this.simulationControlBar.left = 0;
    this.simulationControlBar.bottom = screenHeight;

    // Add all components to the view
    this.addChild(this.chartsContainer);
    this.addChild(this.controlPanel);
    this.addChild(this.simulationControlBar);
    this.addChild(this.listBoxParent); // ListBox parent must be added last for proper z-ordering
  }

  /**
   * Get screen-specific string properties for creating dialog content.
   * Subclasses must implement this method to provide their specific strings.
   */
  protected abstract getScreenStringProperties(): ScreenStringProperties;

  /**
   * Get the common "Key Concepts" title string property.
   * This is shared across all screens.
   */
  protected abstract getKeyConceptsTitleStringProperty(): TReadOnlyProperty<string>;

  /**
   * Get the common "Interactions" title string property.
   * This is shared across all screens.
   */
  protected abstract getInteractionsTitleStringProperty(): TReadOnlyProperty<string>;

  /**
   * Creates the content for the info dialog.
   * This is a concrete implementation that uses screen-specific string properties.
   */
  public createInfoDialogContent(): Node {
    const strings = this.getScreenStringProperties();
    const keyConceptsTitle = this.getKeyConceptsTitleStringProperty();
    const interactionsTitle = this.getInteractionsTitleStringProperty();

    const titleText = new Text(strings.titleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
      fill: QPPWColors.textFillProperty,
    });

    const descriptionText = new RichText(strings.descriptionStringProperty, {
      font: new PhetFont(14),
      fill: QPPWColors.textFillProperty,
      maxWidth: 500,
    });

    const keyConceptsTitleText = new Text(keyConceptsTitle, {
      font: new PhetFont({ size: 14, weight: "bold" }),
      fill: QPPWColors.textFillProperty,
    });

    const keyConceptsList = new RichText(strings.keyConceptsStringProperty, {
      font: new PhetFont(13),
      fill: QPPWColors.textFillProperty,
      maxWidth: 500,
    });

    const interactionTitleText = new Text(interactionsTitle, {
      font: new PhetFont({ size: 14, weight: "bold" }),
      fill: QPPWColors.textFillProperty,
    });

    const interactionsList = new RichText(strings.interactionsStringProperty, {
      font: new PhetFont(13),
      fill: QPPWColors.textFillProperty,
      maxWidth: 500,
    });

    return new VBox({
      spacing: 12,
      align: "left",
      children: [
        titleText,
        descriptionText,
        keyConceptsTitleText,
        keyConceptsList,
        interactionTitleText,
        interactionsList,
      ],
    });
  }

  /**
   * Creates the screen summary content for accessibility.
   * This is a concrete implementation that uses screen-specific string properties.
   */
  public createScreenSummaryContent(): Node {
    const strings = this.getScreenStringProperties();

    const summaryText = new RichText(strings.educationalContentStringProperty, {
      font: new PhetFont(13),
      fill: QPPWColors.textFillProperty,
      maxWidth: 600,
    });

    return new VBox({
      spacing: 10,
      align: "left",
      children: [summaryText],
    });
  }

  /**
   * Resets the screen view to its initial state.
   * Subclasses should override this method to add screen-specific reset logic.
   */
  public reset(): void {
    // Update charts to reflect reset model state
    if (this.energyChart) {
      this.energyChart.update();
    }
    if (this.waveFunctionChart) {
      this.waveFunctionChart.update();
    }
    // Base implementation - subclasses should call super.reset() and add their own logic
  }

  /**
   * Steps the screen view forward in time.
   * Subclasses should override this method to add screen-specific step logic.
   * @param dt - The time step in seconds
   */

  public override step(_dt: number): void {
    // Base implementation - subclasses should override
  }

  // ==================== ACCESSIBILITY PDOM METHODS ====================

  /**
   * Creates screen summary content for accessibility.
   * This provides dynamic descriptions that update when model properties change.
   */
  private static createScreenSummaryContent(
    model: BaseModel | OneWellModel | TwoWellsModel | ManyWellsModel,
    _options: ScreenSummaryOptions,
  ): ScreenSummaryContent {
    // Create dynamic description of current state
    const currentStateProperty = new DerivedProperty(
      [model.potentialTypeProperty, model.selectedEnergyLevelIndexProperty],
      (potentialType, levelIndex) => {
        const energyLevels = model.getEnergyLevels();
        const potentialName = QPPWDescriber.getPotentialTypeName(potentialType);

        if (energyLevels.length === 0) {
          return `Currently exploring a ${potentialName} potential well. No bound states found.`;
        }

        const energy = energyLevels[levelIndex]!;
        const levelNumber = levelIndex + 1;
        const totalLevels = energyLevels.length;

        return (
          `Currently exploring a ${potentialName} potential well. ` +
          `Selected energy level ${levelNumber} of ${totalLevels} ` +
          `with energy ${energy.toFixed(3)} electron volts.`
        );
      },
    );

    // Create dynamic description of parameters
    const parametersProperty = new DerivedProperty(
      [model.particleMassProperty, model.wellWidthProperty],
      (mass, width) => {
        return `Particle mass: ${mass.toFixed(2)} electron masses. Well width: ${width.toFixed(2)} nanometers.`;
      },
    );

    // Create the ScreenSummaryContent with our dynamic properties
    return new ScreenSummaryContent({
      playAreaContent: [currentStateProperty, parametersProperty],
      controlAreaContent: new Property(
        "Use controls to adjust potential type, particle mass, well dimensions, and other parameters.",
      ),
    });
  }

  /**
   * Sets up the PDOM structure for accessibility by adding content to the parent ScreenView's
   * pdomPlayAreaNode and pdomControlAreaNode.
   * This should be called by subclasses after creating their visual components.
   *
   * The PDOM order is managed by the parent ScreenView class:
   * 1. Screen Summary - Overview of current state (managed by parent ScreenView)
   * 2. Play Area - Interactive visualizations
   * 3. Control Area - Parameter controls
   *
   * @param playAreaChildren - Nodes to add to the play area (charts, visualizations)
   * @param controlAreaChildren - Nodes to add to the control area (control panels)
   */
  protected setupPDOMStructure(playAreaChildren: Node[], controlAreaChildren: Node[]): void {
    // Add children to the parent ScreenView's PDOM nodes
    this.pdomPlayAreaNode.pdomOrder = playAreaChildren;
    this.pdomControlAreaNode.pdomOrder = controlAreaChildren;
  }
}
