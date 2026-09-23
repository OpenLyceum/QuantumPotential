/**
 * BaseScreenView is an abstract base class for all screen views in the QPPW simulation.
 * It provides common functionality including standard layout for quantum well simulations.
 */

import { DerivedProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { Node, RichText, Text, VBox } from "scenerystack/scenery";
import { PhetFont, ResetAllButton } from "scenerystack/scenery-phet";
import { ScreenSummaryContent, ScreenView, type ScreenViewOptions } from "scenerystack/sim";
import stringManager from "../../i18n/StringManager.js";
import type { ManyWellsModel } from "../../many-wells/model/ManyWellsModel.js";
import type { ManyWellsViewState } from "../../many-wells/view/ManyWellsViewState.js";
import type { OneWellModel } from "../../one-well/model/OneWellModel.js";
import type { OneWellViewState } from "../../one-well/view/OneWellViewState.js";
import QPPWColors from "../../QPPWColors.js";
import type { TwoWellsModel } from "../../two-wells/model/TwoWellsModel.js";
import type { TwoWellsViewState } from "../../two-wells/view/TwoWellsViewState.js";
import type { BaseModel } from "../model/BaseModel.js";
import { FLAT_RESET_ALL_BUTTON_OPTIONS } from "../QPPWButtonOptions.js";
import { QPPWAlerter } from "./accessibility/QPPWAlerter.js";
import { QPPWDescriber } from "./accessibility/QPPWDescriber.js";
import { CONTROL_PANEL_WIDTH, ControlPanelNode, type ControlPanelNodeOptions } from "./ControlPanelNode.js";
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
  // What this screen is for; read first in the screen summary's play-area paragraph
  screenDescriptionStringProperty: TReadOnlyProperty<string>;
};

export abstract class BaseScreenView extends ScreenView {
  protected readonly resetButton: ResetAllButton;
  protected readonly model: BaseModel | OneWellModel | TwoWellsModel | ManyWellsModel;

  // Common components (may be undefined for screens that don't use them)
  protected energyChart?: EnergyChartNode;
  protected waveFunctionChart?: WaveFunctionChartNode;
  protected energyPanel?: Node;
  protected graphPanel?: Node;
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
      ...FLAT_RESET_ALL_BUTTON_OPTIONS,
      listener: () => {
        this.interruptSubtreeInput();
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
      innerContent: stringManager.getA11yStrings().controls.resetAllStringProperty,
      // TODO: Add helpText when PhET accessibility is fully configured
      // helpText: "Return all parameters to their initial values. Keyboard shortcut: Alt+R.",
    });
    this.addChild(this.resetButton);
  }

  /**
   * Creates the standard layout of the One, Two and Many Wells screens, after PhET's Quantum Bound States:
   *
   *   ┌ legend ──────────────────────────┐ ┌ energy panel ┐
   *   │ energy chart (no x labels)        │ │              │
   *   ├───────────────────────────────────┤ └──────────────┘
   *   │ wave-function chart (x axis, nm)  │ ┌ graph panel ─┐
   *   └───────────────────────────────────┘ └──────────────┘
   *              time controls                     [reset]
   *
   * The two charts share one position axis. Their y axes keep numeric ticks with units.
   *
   * @param model - The OneWellModel, TwoWellsModel, or ManyWellsModel instance
   * @param viewState - The view state for display properties
   * @param controlPanelOptions - Optional configuration for the control panels (mass control, potential types)
   */
  protected createStandardLayout(
    model: OneWellModel | TwoWellsModel | ManyWellsModel,
    viewState: OneWellViewState | TwoWellsViewState | ManyWellsViewState,
    controlPanelOptions?: ControlPanelNodeOptions,
  ): void {
    const margin = 10;
    const panelSpacing = 10;
    const chartsWidth = this.layoutBounds.width - 2 * margin - panelSpacing - CONTROL_PANEL_WIDTH;
    const energyChartHeight = 290;
    const waveFunctionChartHeight = 220;

    // Energy chart on top; it draws no position labels because the chart below supplies them
    this.energyChart = new EnergyChartNode(model, viewState, {
      width: chartsWidth,
      height: energyChartHeight,
      sharedXAxis: true,
    });
    // Charts are placed by their nominal size: their bounds vary with labels and clipped content
    const chartsTop = margin / 2;
    this.energyChart.x = margin;
    this.energyChart.y = chartsTop;

    // Wave-function chart directly below, with the same left and right margins so the x axes line up
    this.waveFunctionChart = new WaveFunctionChartNode(model, viewState, {
      width: chartsWidth,
      height: waveFunctionChartHeight,
    });
    const waveFunctionChartTop = chartsTop + energyChartHeight;
    const chartsBottom = waveFunctionChartTop + waveFunctionChartHeight;
    this.waveFunctionChart.x = margin;
    this.waveFunctionChart.y = waveFunctionChartTop;

    this.chartsContainer = new Node({
      children: [this.energyChart, this.waveFunctionChart],
    });

    // Create listbox parent node for ComboBox popups (if not already created by subclass)
    if (!this.listBoxParent) {
      this.listBoxParent = new Node();
    }

    // One panel beside each chart, top-aligned with it
    const controlPanel = new ControlPanelNode(model, viewState, this.listBoxParent, controlPanelOptions);
    this.energyPanel = controlPanel.energyPanel;
    this.graphPanel = controlPanel.graphPanel;
    const panelLeft = margin + chartsWidth + panelSpacing;
    this.energyPanel.left = panelLeft;
    this.energyPanel.top = margin;
    this.graphPanel.left = panelLeft;
    this.graphPanel.top = Math.max(waveFunctionChartTop, this.energyPanel.bottom + panelSpacing);

    // Time controls centered under the charts, reset button in the corner
    this.simulationControlBar = new SimulationControlBar(model);
    this.simulationControlBar.centerX = margin + chartsWidth / 2;
    this.simulationControlBar.centerY = (chartsBottom + this.layoutBounds.maxY) / 2;

    this.addChild(this.chartsContainer);
    this.addChild(this.energyPanel);
    this.addChild(this.graphPanel);
    this.addChild(this.simulationControlBar);
    this.addChild(this.listBoxParent); // ListBox parent must be added last for proper z-ordering

    // Keyboard and screen-reader order follows the layout: each chart, then the panel that controls it
    this.setupPDOMStructure(
      [this.energyChart, this.energyPanel, this.waveFunctionChart, this.graphPanel],
      [this.simulationControlBar, this.resetButton],
    );
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
      this.waveFunctionChart.resetVisibility();
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
    options: ScreenSummaryOptions,
  ): ScreenSummaryContent {
    const summaryStrings = stringManager.getA11yStrings().screenSummary;

    // Live description of the current state. The locale string Properties are dependencies so the
    // sentence is rebuilt on a language change as well as on a model change.
    const currentStateProperty = new DerivedProperty(
      [
        model.potentialTypeProperty,
        model.selectedEnergyLevelIndexProperty,
        summaryStrings.currentStatePatternStringProperty,
        summaryStrings.currentStateNoStatesPatternStringProperty,
      ],
      (potentialType, levelIndex, currentStatePattern, noStatesPattern) => {
        const energyLevels = model.getEnergyLevels();
        const potential = QPPWDescriber.getPotentialTypeName(potentialType);

        // The selection can briefly exceed the level count until the model clamps it on its next step
        const energy = energyLevels[levelIndex];
        if (energy === undefined) {
          return StringUtils.fillIn(noStatesPattern, { potential: potential });
        }

        return StringUtils.fillIn(currentStatePattern, {
          potential: potential,
          level: levelIndex + 1,
          total: energyLevels.length,
          energy: energy.toFixed(3),
        });
      },
    );

    const parametersProperty = new DerivedProperty(
      [model.particleMassProperty, model.wellWidthProperty, summaryStrings.parametersPatternStringProperty],
      (mass, width, pattern) => StringUtils.fillIn(pattern, { mass: mass.toFixed(2), width: width.toFixed(2) }),
    );

    return new ScreenSummaryContent({
      playAreaContent: options.screenDescriptionStringProperty,
      controlAreaContent: summaryStrings.controlAreaStringProperty,
      currentDetailsContent: [currentStateProperty, parametersProperty],
      interactionHintContent: summaryStrings.interactionHintStringProperty,
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
