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
import { IntroControlPanelNode } from "./IntroControlPanelNode.js";
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

    // Calculate layout dimensions
    const margin = 10;
    const chartSpacing = 5; // Reduced spacing between charts

    // Fixed chart dimensions
    const chartsWidth = 600;
    const energyChartHeight = 220; // Increased from 200
    const probabilityChartHeight = 170; // Increased from 150
    const waveFunctionChartHeight = 150;
    const wavenumberChartHeight = 200;
    const wavenumberChartWidth = 350;

    // Create the energy chart (top plot)
    this.energyChart = new EnergyChartNode(model, this.viewState, {
      width: chartsWidth,
      height: energyChartHeight,
    });

    // Create the probability density chart (middle plot) - always shows probability density
    this.probabilityChart = new WaveFunctionChartNode(model, this.viewState, {
      width: chartsWidth,
      height: probabilityChartHeight,
      fixedDisplayMode: "probabilityDensity",
    });

    // Create the wave function chart - always shows wavefunction
    this.waveFunctionChart = new WaveFunctionChartNode(model, this.viewState, {
      width: chartsWidth,
      height: waveFunctionChartHeight,
      fixedDisplayMode: "waveFunction",
      showToolCheckboxes: true, // Show curvature/derivative checkboxes on intro screen
    });

    // Create the wavenumber chart (bottom plot) - shows |φ(k)|²
    this.wavenumberChart = new WavenumberChartNode(model, {
      width: wavenumberChartWidth,
      height: wavenumberChartHeight,
      viewState: this.viewState,
    });

    // Position charts stacked vertically
    // Use each chart's local origin: visible bounds vary with axis labels, but the plot coordinates match.
    this.energyChart.x = margin;
    this.energyChart.top = 10;

    this.probabilityChart.x = margin;
    this.probabilityChart.top = this.energyChart.top + energyChartHeight + chartSpacing;

    this.waveFunctionChart.x = margin;
    this.waveFunctionChart.top = this.probabilityChart.top + probabilityChartHeight + chartSpacing;

    this.wavenumberChart.left = 600;
    this.wavenumberChart.top = 400;

    // Create listbox parent node for ComboBox popups
    this.listBoxParent = new Node();

    // Create control panel (simplified for intro)
    this.introControlPanel = new IntroControlPanelNode(
      model,
      this.viewState,
      this.listBoxParent,
      this.probabilityChart,
    );
    this.introControlPanel.left = chartsWidth + margin * 2;
    this.introControlPanel.top = margin;

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
      educationalContentStringProperty: stringManager.introEducationalContentStringProperty,
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
