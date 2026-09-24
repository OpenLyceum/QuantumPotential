/**
 * IntroScreenView is the view for the Intro screen.
 * It displays quantum wells without play/pause controls or superposition options.
 */

import type { TReadOnlyProperty } from "scenerystack/axon";
import { Node } from "scenerystack/scenery";
import type { ScreenViewOptions } from "scenerystack/sim";
import { BaseScreenView, type ScreenStringProperties } from "../../common/view/BaseScreenView.js";
import { EnergyChartNode } from "../../common/view/EnergyChartNode.js";
import { WaveFunctionChartNode } from "../../common/view/WaveFunctionChartNode.js";
import { WavenumberChartNode } from "../../common/view/WavenumberChartNode.js";
import stringManager from "../../i18n/StringManager.js";
import type { IntroModel } from "../model/IntroModel.js";
import { INTRO_CONTROL_PANEL_WIDTH, IntroControlPanelNode } from "./IntroControlPanelNode.js";
import { IntroViewState } from "./IntroViewState.js";

export class IntroScreenView extends BaseScreenView {
  private readonly viewState: IntroViewState;
  private introControlPanel: IntroControlPanelNode;
  private probabilityChart: WaveFunctionChartNode;
  private wavenumberChart: WavenumberChartNode;

  public constructor(model: IntroModel, options?: ScreenViewOptions) {
    super(
      model,
      {
        screenDescriptionStringProperty: stringManager.getScreenSummaryDescriptions().introStringProperty,
      },
      options,
    );

    // Create the view state for display properties
    this.viewState = new IntroViewState();

    const margin = 10;
    const chartSpacing = 5;
    const panelSpacing = 10;

    // The charts take all the width left of the control panel, which is pinned to the right edge
    const chartsWidth = this.layoutBounds.width - 2 * margin - panelSpacing - INTRO_CONTROL_PANEL_WIDTH;

    // Three charts stacked down the full height of the screen
    const chartsTop = margin / 2;
    const energyChartHeight = 220;
    const lowerChartHeight = (this.layoutBounds.height - chartsTop - energyChartHeight - 2 * chartSpacing - margin) / 2;

    this.energyChart = new EnergyChartNode(model, this.viewState, {
      width: chartsWidth,
      height: energyChartHeight,
    });

    // Probability density chart (middle) - always shows probability density
    this.probabilityChart = new WaveFunctionChartNode(model, this.viewState, {
      width: chartsWidth,
      height: lowerChartHeight,
      fixedDisplayMode: "probabilityDensity",
    });

    // Wave function chart (bottom) - always shows the wavefunction, with the curvature/derivative tools
    this.waveFunctionChart = new WaveFunctionChartNode(model, this.viewState, {
      width: chartsWidth,
      height: lowerChartHeight,
      fixedDisplayMode: "waveFunction",
      showToolCheckboxes: true,
    });

    // Use each chart's local origin: visible bounds vary with axis labels, but the plot coordinates match.
    this.energyChart.x = margin;
    this.energyChart.y = chartsTop;
    this.probabilityChart.x = margin;
    this.probabilityChart.y = this.energyChart.y + energyChartHeight + chartSpacing;
    this.waveFunctionChart.x = margin;
    this.waveFunctionChart.y = this.probabilityChart.y + lowerChartHeight + chartSpacing;

    // Control panel in the top-right corner
    this.listBoxParent = new Node(); // parent for ComboBox popups
    this.introControlPanel = new IntroControlPanelNode(
      model,
      this.viewState,
      this.listBoxParent,
      this.probabilityChart,
    );
    this.introControlPanel.right = this.layoutBounds.maxX - margin;
    this.introControlPanel.top = margin;

    // Wavenumber chart |φ(k)|² fills the column under the control panel, down to the reset button
    const wavenumberChartTop = this.introControlPanel.bottom + panelSpacing;
    this.wavenumberChart = new WavenumberChartNode(model, {
      width: this.introControlPanel.width,
      height: this.resetButton.top - margin - wavenumberChartTop,
      viewState: this.viewState,
    });
    this.wavenumberChart.x = this.introControlPanel.left;
    this.wavenumberChart.y = wavenumberChartTop;

    // Add all components to the view
    this.addChild(this.energyChart);
    this.addChild(this.probabilityChart);
    this.addChild(this.waveFunctionChart);
    this.addChild(this.wavenumberChart);
    this.addChild(this.introControlPanel);
    this.addChild(this.listBoxParent); // ListBox parent must be added last for proper z-ordering

    // Set up PDOM (Parallel DOM) structure for accessibility
    this.setupAccessibility(model);
  }

  /**
   * Sets up the PDOM structure for accessibility.
   */
  private setupAccessibility(_model: IntroModel): void {
    // Set PDOM navigation order for play area and control area
    this.setupPDOMStructure(
      // Play area children
      [this.energyChart!, this.probabilityChart, this.waveFunctionChart!, this.wavenumberChart],
      // Control area children
      [this.introControlPanel],
    );
  }

  /**
   * Get screen-specific string properties for creating dialog content.
   */
  protected getScreenStringProperties(): ScreenStringProperties {
    return {
      titleStringProperty: stringManager.introStringProperty,
      descriptionStringProperty: stringManager.introDescriptionStringProperty,
      keyConceptsStringProperty: stringManager.introKeyConceptsStringProperty,
      interactionsStringProperty: stringManager.introInteractionsStringProperty,
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

    // Update IntroScreen-specific charts to reflect reset model state
    this.probabilityChart.resetVisibility();
    this.probabilityChart.update();
    this.wavenumberChart.update();
  }

  /**
   * Steps the screen view forward in time.
   * Note: Intro screen doesn't have play/pause controls, but model still steps
   * @param dt - The time step in seconds
   */
  public override step(dt: number): void {
    super.step(dt);
    this.model.step(dt);
  }
}
