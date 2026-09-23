/**
 * WaveFunctionChartNode displays the wave function or probability density
 * for the selected energy state. This is the bottom chart in the One Well screen.
 */

import { DerivedProperty, NumberProperty } from "scenerystack/axon";
import { AxisLine, ChartRectangle, ChartTransform, TickLabelSet, TickMarkSet } from "scenerystack/bamboo";
import { Range } from "scenerystack/dot";
import { localeProperty } from "scenerystack/joist";
import { Shape } from "scenerystack/kite";
import { Orientation } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { Line, Node, Path, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import stringManager from "../../i18n/StringManager.js";
import QPPWColors from "../../QPPWColors.js";
import { hasSuperpositionConfig, hasWellOffset, hasWellSeparation } from "../model/ModelTypeGuards.js";
import type { BoundStateResult, PotentialType } from "../model/PotentialFunction.js";
import QuantumConstants from "../model/QuantumConstants.js";
import type { ScreenModel } from "../model/ScreenModels.js";
import { SuperpositionType } from "../model/SuperpositionType.js";
import { PANEL_CHECKBOX_OPTIONS } from "../QPPWControlOptions.js";
import Logger from "../utils/Logger.js";
import { QPPWDescriber } from "./accessibility/QPPWDescriber.js";
import { AreaMeasurementTool } from "./chart-tools/AreaMeasurementTool.js";
import { ClassicalProbabilityOverlay } from "./chart-tools/ClassicalProbabilityOverlay.js";
import { CurvatureTool } from "./chart-tools/CurvatureTool.js";
import { DerivativeTool } from "./chart-tools/DerivativeTool.js";
import { PhaseColorVisualization } from "./chart-tools/PhaseColorVisualization.js";
import { ZerosVisualization } from "./chart-tools/ZerosVisualization.js";
import { calculateRMSStatistics, createDoubleArrowShape } from "./RMSIndicatorUtils.js";
import type { ScreenViewState } from "./ScreenViewStates.js";

// Chart axis range constant (shared with EnergyChartNode)
const X_AXIS_RANGE_NM = 4; // X-axis extends from -X_AXIS_RANGE_NM to +X_AXIS_RANGE_NM

const a11y = stringManager.getA11yStrings();

/**
 * Largest |value| among the finite entries (0 when there are none), so a stray NaN or ∞ in solver
 * output can never reach the chart's y range (NumberProperty rejects NaN).
 */
function maxFiniteAbs(values: readonly number[]): number {
  let max = 0;
  for (const value of values) {
    const abs = Math.abs(value);
    if (abs > max && Number.isFinite(abs)) {
      max = abs;
    }
  }
  return max;
}

export class WaveFunctionChartNode extends Node {
  private readonly model: ScreenModel;
  private readonly viewState: ScreenViewState;
  private readonly chartWidth: number;
  private readonly chartHeight: number;
  private readonly chartMargins = { left: 60, right: 20, top: 10, bottom: 40 };

  // Chart bounds in view coordinates
  private readonly plotWidth: number;
  private readonly plotHeight: number;

  // ChartTransform for model-to-view coordinate conversion
  private readonly chartTransform: ChartTransform;

  // View range properties (synchronized with EnergyChartNode X-axis)
  private readonly xMinProperty: NumberProperty;
  private readonly xMaxProperty: NumberProperty;
  private readonly yMinProperty: NumberProperty;
  private readonly yMaxProperty: NumberProperty;

  // Visual elements
  private readonly backgroundRect: ChartRectangle;
  private readonly plotContentNode: Node; // Clipped container for plot content
  private readonly realPartPath: Path;
  private readonly imaginaryPartPath: Path;
  private readonly magnitudePath: Path;
  private readonly probabilityDensityPath: Path;
  private readonly zeroLine: Line;
  private readonly avgPositionIndicator: Line; // Vertical line indicator for average position
  private readonly rmsPositionIndicator: Path; // Double arrow indicator for RMS position
  private readonly axesNode: Node;
  private yAxisLabel!: Text;
  private readonly stateLabelNode: Text; // Label showing which wavefunction is displayed
  private readonly avgPositionLabel: Text;
  private readonly rmsPositionLabel: Text;

  // Tool components
  private readonly areaMeasurementTool: AreaMeasurementTool;
  private readonly curvatureTool: CurvatureTool;
  private readonly derivativeTool: DerivativeTool;
  private readonly zerosVisualization: ZerosVisualization;
  private readonly phaseColorVisualization: PhaseColorVisualization;
  private readonly classicalProbabilityOverlay: ClassicalProbabilityOverlay;

  // Guard flag to prevent reentry during updates
  private isUpdating: boolean = false;
  // Flag to indicate if an update was requested while another update was in progress
  private updatePending: boolean = false;

  // Optional fixed display mode (overrides model's display mode)
  private readonly fixedDisplayMode: "probabilityDensity" | "waveFunction" | "phaseColor" | undefined;

  // Public getters for tool show properties (for control panels)
  public get showAreaToolProperty() {
    return this.areaMeasurementTool.showProperty;
  }

  public get showCurvatureToolProperty() {
    return this.curvatureTool.showProperty;
  }

  public get showDerivativeToolProperty() {
    return this.derivativeTool.showProperty;
  }

  public constructor(
    model: ScreenModel,
    viewState: ScreenViewState,
    options?: {
      width?: number;
      height?: number;
      fixedDisplayMode?: "probabilityDensity" | "waveFunction" | "phaseColor";
      showToolCheckboxes?: boolean; // Whether to show curvature/derivative checkboxes (intro screen only)
    },
  ) {
    super({
      // PDOM - make wavefunction chart accessible
      tagName: "div",
      labelTagName: "h3",
      labelContent: a11y.waveFunctionChart.headingStringProperty,
      descriptionTagName: "p",
    });

    this.model = model;
    this.viewState = viewState;

    // Set up accessible description after this.model is initialized
    this.descriptionContent = new DerivedProperty(
      [
        model.selectedEnergyLevelIndexProperty,
        model.potentialTypeProperty,
        model.superpositionTypeProperty,
        localeProperty, // rebuild the sentences on a language change
      ],
      (selectedIndex: number, potentialType: PotentialType, superpositionType: SuperpositionType) => {
        return this.createWavefunctionDescription(selectedIndex, potentialType, superpositionType);
      },
    );
    this.chartWidth = options?.width ?? 600;
    this.chartHeight = options?.height ?? 140;
    this.fixedDisplayMode = options?.fixedDisplayMode;

    this.plotWidth = this.chartWidth - this.chartMargins.left - this.chartMargins.right;
    this.plotHeight = this.chartHeight - this.chartMargins.top - this.chartMargins.bottom;

    // Initialize view range (x-axis is fixed, y-axis will be updated based on data)
    this.xMinProperty = new NumberProperty(-X_AXIS_RANGE_NM);
    this.xMaxProperty = new NumberProperty(X_AXIS_RANGE_NM);
    this.yMinProperty = new NumberProperty(-1);
    this.yMaxProperty = new NumberProperty(1);

    // Create ChartTransform for model-to-view coordinate conversion
    this.chartTransform = new ChartTransform({
      viewWidth: this.plotWidth,
      viewHeight: this.plotHeight,
      modelXRange: new Range(this.xMinProperty.value, this.xMaxProperty.value),
      modelYRange: new Range(this.yMinProperty.value, this.yMaxProperty.value),
    });

    // Create background using ChartRectangle
    this.backgroundRect = new ChartRectangle(this.chartTransform, {
      fill: QPPWColors.backgroundColorProperty,
      stroke: null, // Remove border to avoid line appearing below energy chart
      lineWidth: 1,
    });
    this.backgroundRect.x = this.chartMargins.left;
    this.backgroundRect.y = this.chartMargins.top;
    this.addChild(this.backgroundRect);

    // Create axes
    this.axesNode = this.createAxes();
    this.addChild(this.axesNode);

    // Create a clipped content node for all plot elements
    this.plotContentNode = new Node({
      clipArea: Shape.rectangle(this.chartMargins.left, this.chartMargins.top, this.plotWidth, this.plotHeight),
    });
    this.addChild(this.plotContentNode);

    // Create zero line
    this.zeroLine = new Line(0, 0, 0, 0, {
      stroke: QPPWColors.gridLineProperty,
      lineWidth: 1,
      lineDash: [5, 5],
    });
    this.plotContentNode.addChild(this.zeroLine);

    // Phase is a colored fill behind the magnitude and component curves, as in Quantum Bound States.
    this.phaseColorVisualization = new PhaseColorVisualization({
      dataToViewX: this.dataToViewX.bind(this),
      dataToViewY: this.dataToViewY.bind(this),
    });
    this.plotContentNode.addChild(this.phaseColorVisualization);

    // Create wave function paths
    this.realPartPath = new Path(null, {
      stroke: QPPWColors.wavefunctionRealProperty,
      lineWidth: 2,
      visible: false,
    });
    this.plotContentNode.addChild(this.realPartPath);

    this.imaginaryPartPath = new Path(null, {
      stroke: QPPWColors.wavefunctionImaginaryProperty,
      lineWidth: 2,
      visible: false,
    });
    this.plotContentNode.addChild(this.imaginaryPartPath);

    this.magnitudePath = new Path(null, {
      stroke: QPPWColors.wavefunctionMagnitudeProperty,
      lineWidth: 2,
      visible: false,
    });
    this.plotContentNode.addChild(this.magnitudePath);

    this.probabilityDensityPath = new Path(null, {
      stroke: QPPWColors.wavefunctionProbabilityProperty,
      lineWidth: 2,
      fill: QPPWColors.wavefunctionProbabilityFillProperty, // Semi-transparent fill
    });
    this.plotContentNode.addChild(this.probabilityDensityPath);

    // Create average position indicator (vertical line)
    this.avgPositionIndicator = new Line(0, 0, 0, 0, {
      stroke: QPPWColors.energyLevelSelectedProperty,
      lineWidth: 2,
      lineDash: [8, 4],
    });
    this.plotContentNode.addChild(this.avgPositionIndicator);

    // Create RMS position indicator (double arrow)
    this.rmsPositionIndicator = new Path(null, {
      stroke: QPPWColors.energyLevelSelectedProperty,
      lineWidth: 2,
      fill: QPPWColors.energyLevelSelectedProperty,
    });
    this.plotContentNode.addChild(this.rmsPositionIndicator);

    // Initialize tool components
    const toolOptions = {
      chartMargins: this.chartMargins,
      plotWidth: this.plotWidth,
      plotHeight: this.plotHeight,
      chartWidth: this.chartWidth,
      xMinProperty: this.xMinProperty,
      xMaxProperty: this.xMaxProperty,
      yMinProperty: this.yMinProperty,
      yMaxProperty: this.yMaxProperty,
      dataToViewX: this.dataToViewX.bind(this),
      dataToViewY: this.dataToViewY.bind(this),
      viewToDataX: this.viewToDataX.bind(this),
      parentNode: this,
    };

    // Create classical probability overlay
    this.classicalProbabilityOverlay = new ClassicalProbabilityOverlay(model, toolOptions);
    this.plotContentNode.addChild(this.classicalProbabilityOverlay);

    // Create zeros visualization
    this.zerosVisualization = new ZerosVisualization({
      dataToViewX: this.dataToViewX.bind(this),
      dataToViewY: this.dataToViewY.bind(this),
    });
    this.plotContentNode.addChild(this.zerosVisualization);

    // Create area measurement tool
    this.areaMeasurementTool = new AreaMeasurementTool(model, () => this.getEffectiveDisplayMode(), toolOptions);
    this.plotContentNode.addChild(this.areaMeasurementTool);

    // Create curvature tool
    this.curvatureTool = new CurvatureTool(model, () => this.getEffectiveDisplayMode(), toolOptions);
    this.plotContentNode.addChild(this.curvatureTool);

    // Create derivative tool
    this.derivativeTool = new DerivativeTool(model, () => this.getEffectiveDisplayMode(), toolOptions);
    this.plotContentNode.addChild(this.derivativeTool);

    // Create state label in upper right corner (outside clipped area)
    this.stateLabelNode = new Text("", {
      font: new PhetFont({ size: 16, style: "italic" }),
      fill: QPPWColors.labelFillProperty,
      right: this.chartWidth - this.chartMargins.right - 55,
      top: this.chartMargins.top + 5,
    });
    this.addChild(this.stateLabelNode);

    // Create labels for average and RMS position
    this.avgPositionLabel = new Text("", {
      font: new PhetFont(12),
      fill: QPPWColors.labelFillProperty,
      left: this.chartMargins.left + 10,
      top: this.chartMargins.top + 5,
    });
    this.addChild(this.avgPositionLabel);

    this.rmsPositionLabel = new Text("", {
      font: new PhetFont(12),
      fill: QPPWColors.labelFillProperty,
      left: this.chartMargins.left + 10,
      top: this.chartMargins.top + 25,
    });
    this.addChild(this.rmsPositionLabel);

    // Create checkboxes for derivative and curvature tools (only on intro screen)
    if (options?.showToolCheckboxes) {
      const curvatureCheckbox = new Checkbox(
        this.curvatureTool.showProperty,
        new Text(a11y.visible.showCurvatureStringProperty, {
          font: new PhetFont(12),
          fill: QPPWColors.textFillProperty,
        }),
        { ...PANEL_CHECKBOX_OPTIONS, boxWidth: 14 },
      );

      const derivativeCheckbox = new Checkbox(
        this.derivativeTool.showProperty,
        new Text(a11y.visible.showDerivativeStringProperty, {
          font: new PhetFont(12),
          fill: QPPWColors.textFillProperty,
        }),
        { ...PANEL_CHECKBOX_OPTIONS, boxWidth: 14 },
      );

      // Group checkboxes in a VBox
      const toolCheckboxes = new VBox({
        children: [curvatureCheckbox, derivativeCheckbox],
        spacing: 5,
        align: "left",
        right: this.chartWidth - this.chartMargins.right - 5,
        top: this.chartMargins.top + 5,
      });
      this.addChild(toolCheckboxes);

      // Only show checkboxes in wavefunction mode
      this.viewState.displayModeProperty.link((displayMode) => {
        const effectiveMode = this.fixedDisplayMode !== undefined ? this.fixedDisplayMode : displayMode;
        toolCheckboxes.visible = effectiveMode === "waveFunction";
      });
    }

    // Ensure axes are on top of the clipped plot content
    this.axesNode.moveToFront();

    // Link to model properties
    this.linkToModel();

    // Note: Initial update is now done asynchronously inside linkToModel()
    // to prevent blocking the page load
  }

  /**
   * Creates an accessible description of the wavefunction chart based on current state.
   * This provides screen reader users with meaningful information about the visualization.
   */
  private createWavefunctionDescription(
    selectedIndex: number,
    _potentialType: PotentialType,
    superpositionType: SuperpositionType,
  ): string {
    const strings = a11y.waveFunctionChart;
    const boundStates = this.model.getBoundStates();
    if (!boundStates || boundStates.energies.length === 0) {
      return strings.noDataStringProperty.value;
    }

    const displayMode = this.getEffectiveDisplayMode();
    const isSuperposition = superpositionType !== SuperpositionType.SINGLE;

    // What is being shown, and how
    const shown = [
      isSuperposition
        ? strings.superpositionStringProperty.value
        : StringUtils.fillIn(strings.eigenstatePatternStringProperty, { level: selectedIndex + 1 }),
      displayMode === "probabilityDensity"
        ? strings.probabilityDensityStringProperty.value
        : displayMode === "phaseColor"
          ? strings.phaseColorStringProperty.value
          : strings.waveFunctionStringProperty.value,
    ];
    const paragraphs = [shown.join(" ")];

    // Position statistics, when the distribution has a mean and spread
    const nmData = isSuperposition
      ? this.model.getTimeEvolvedSuperpositionInNmUnits(this.model.timeProperty.value * 1e-15)
      : this.model.getWavefunctionInNmUnits(selectedIndex + 1);
    const xGridNm = boundStates.xGrid.map((x) => x * 1e9); // Convert to nm
    const stats = nmData ? calculateRMSStatistics(xGridNm, nmData.probabilityDensity) : null;
    if (stats) {
      paragraphs.push(
        StringUtils.fillIn(strings.positionStatisticsPatternStringProperty, {
          average: stats.avg.toFixed(2),
          rms: stats.rms.toFixed(2),
        }),
      );
    }

    // Node count for single eigenstates (the n-th state, 0-indexed, has n nodes)
    if (!isSuperposition && selectedIndex >= 0 && selectedIndex < boundStates.energies.length) {
      paragraphs.push(QPPWDescriber.describeNodes(selectedIndex));
    }

    return paragraphs.join("\n\n");
  }

  /**
   * Creates the axes (X and Y) with labels - using bamboo components where possible.
   * Note: GridLineSet from bamboo causes infinite loops, so we use manual grid lines.
   */
  private createAxes(): Node {
    const axesNode = new Node();

    // Manual X-axis grid lines (GridLineSet causes hang)
    for (let pos = -X_AXIS_RANGE_NM; pos <= X_AXIS_RANGE_NM; pos += 2) {
      if (pos !== -X_AXIS_RANGE_NM) {
        const x = this.chartMargins.left + this.chartTransform.modelToViewX(pos);
        const gridLine = new Line(x, this.chartMargins.top, x, this.chartMargins.top + this.plotHeight, {
          stroke: QPPWColors.gridLineProperty,
          lineWidth: 1,
          lineDash: [5, 5],
        });
        axesNode.addChild(gridLine);
      }
    }

    // Horizontal axis follows y=0 as the displayed range changes.
    const xAxis = new AxisLine(this.chartTransform, Orientation.HORIZONTAL, {
      stroke: QPPWColors.axisProperty,
      value: 0,
    });
    xAxis.x = this.chartMargins.left;
    xAxis.y = this.chartMargins.top;
    axesNode.addChild(xAxis);

    // X-axis tick marks
    const xTickMarkSet = new TickMarkSet(
      this.chartTransform,
      Orientation.HORIZONTAL,
      2, // spacing
      {
        edge: "max",
        extent: 8,
        stroke: QPPWColors.labelFillProperty,
        lineWidth: 1,
      },
    );
    xTickMarkSet.x = this.chartMargins.left;
    xTickMarkSet.y = this.chartMargins.top + this.plotHeight;
    axesNode.addChild(xTickMarkSet);

    // X-axis tick labels
    const xTickLabelSet = new TickLabelSet(
      this.chartTransform,
      Orientation.HORIZONTAL,
      2, // spacing
      {
        edge: "max",
        createLabel: (value: number) =>
          new Text(value.toString(), {
            font: new PhetFont(14),
            fill: QPPWColors.labelFillProperty,
          }),
      },
    );
    xTickLabelSet.x = this.chartMargins.left;
    xTickLabelSet.y = this.chartMargins.top + this.plotHeight;
    axesNode.addChild(xTickLabelSet);

    // Vertical axis follows x=0, centered in the shared position range.
    const yAxis = new AxisLine(this.chartTransform, Orientation.VERTICAL, {
      stroke: QPPWColors.axisProperty,
      value: 0,
    });
    yAxis.x = this.chartMargins.left;
    yAxis.y = this.chartMargins.top;
    axesNode.addChild(yAxis);

    // Y-axis tick marks using bamboo TickMarkSet
    // Use fixed spacing of 0.5 (works well for typical nm^-1 and nm^-1/2 values)
    const yTickMarkSet = new TickMarkSet(
      this.chartTransform,
      Orientation.VERTICAL,
      0.5, // spacing in nm^-1 or nm^-1/2 units
      {
        edge: "min",
        extent: 8,
        stroke: QPPWColors.labelFillProperty,
        lineWidth: 1,
      },
    );
    yTickMarkSet.x = this.chartMargins.left;
    yTickMarkSet.y = this.chartMargins.top;
    axesNode.addChild(yTickMarkSet);

    // Y-axis tick labels using bamboo TickLabelSet
    const yTickLabelSet = new TickLabelSet(
      this.chartTransform,
      Orientation.VERTICAL,
      0.5, // spacing in nm^-1 or nm^-1/2 units
      {
        edge: "min",
        createLabel: (value: number) =>
          new Text(this.formatYTickLabel(value), {
            font: new PhetFont(12),
            fill: QPPWColors.labelFillProperty,
          }),
      },
    );
    yTickLabelSet.x = this.chartMargins.left;
    yTickLabelSet.y = this.chartMargins.top;
    axesNode.addChild(yTickLabelSet);

    // Position this after setting its text, since the rotated text changes its bounds.
    this.yAxisLabel = new Text("", {
      font: new PhetFont(14),
      fill: QPPWColors.labelFillProperty,
      centerX: 15,
      rotation: -Math.PI / 2,
    });
    axesNode.addChild(this.yAxisLabel);

    // X-axis label
    const xLabelText = new Text(stringManager.positionNmStringProperty, {
      font: new PhetFont(14),
      fill: QPPWColors.labelFillProperty,
      centerX: this.chartWidth / 2,
      centerY: this.chartHeight - 15,
    });
    axesNode.addChild(xLabelText);

    return axesNode;
  }

  /**
   * Links chart updates to model property changes.
   */
  private linkToModel(): void {
    // Update when any parameter changes
    this.model.potentialTypeProperty.lazyLink(() => this.update());
    this.model.wellWidthProperty.lazyLink(() => this.update());
    this.model.wellDepthProperty.lazyLink(() => this.update());
    if (hasWellOffset(this.model)) {
      this.model.wellOffsetProperty.lazyLink(() => this.update());
    }
    this.model.particleMassProperty.lazyLink(() => this.update());

    // Link to wellSeparationProperty if available (TwoWellsModel and ManyWellsModel)
    if (hasWellSeparation(this.model)) {
      this.model.wellSeparationProperty.lazyLink(() => this.update());
    }

    // Every other parameter that reshapes the potential
    if ("barrierHeightProperty" in this.model) {
      this.model.barrierHeightProperty.lazyLink(() => this.update());
    }
    if ("potentialOffsetProperty" in this.model) {
      this.model.potentialOffsetProperty.lazyLink(() => this.update());
    }
    if ("numberOfWellsProperty" in this.model) {
      this.model.numberOfWellsProperty.lazyLink(() => this.update());
    }
    if ("electricFieldProperty" in this.model) {
      this.model.electricFieldProperty.lazyLink(() => this.update());
    }

    this.model.selectedEnergyLevelIndexProperty.lazyLink(() => {
      this.updateStateLabel();
      this.update();
    });
    this.viewState.displayModeProperty.lazyLink(() => {
      this.updateYAxisLabel();
      this.updateStateLabel();
      this.update();
    });
    this.model.timeProperty.lazyLink(() => this.updateTimeEvolution());

    // Update when superposition configuration changes
    this.model.superpositionTypeProperty.lazyLink(() => {
      this.updateStateLabel();
      this.update();
    });
    this.model.superpositionConfigProperty.lazyLink(() => {
      this.update();
    });

    // Update visibility of wave function components
    this.viewState.showRealPartProperty.lazyLink((show: boolean) => {
      this.realPartPath.visible = show && this.getEffectiveDisplayMode() === "waveFunction";
    });
    this.viewState.showImaginaryPartProperty.lazyLink((show: boolean) => {
      this.imaginaryPartPath.visible = show && this.getEffectiveDisplayMode() === "waveFunction";
    });
    this.viewState.showMagnitudeProperty.lazyLink((show: boolean) => {
      this.magnitudePath.visible = show && this.getEffectiveDisplayMode() === "waveFunction";
      this.update();
    });
    this.viewState.showPhaseProperty.lazyLink(() => {
      this.update();
    });

    // Update visibility of classical probability
    this.viewState.showClassicalProbabilityProperty.lazyLink(() => {
      this.update();
    });

    // Update visibility of zeros
    this.viewState.showZerosProperty.lazyLink(() => {
      this.update();
    });

    // Update visibility of RMS indicators if the property exists (IntroViewState only)
    if ("showRMSIndicatorProperty" in this.viewState) {
      this.viewState.showRMSIndicatorProperty.lazyLink(() => {
        this.update();
      });
    }

    // Link tool updates to model changes
    const updateTools = () => {
      const displayMode = this.getEffectiveDisplayMode();
      if (this.areaMeasurementTool.showProperty.value) {
        this.areaMeasurementTool.update(displayMode);
      }
      if (this.curvatureTool.showProperty.value) {
        this.curvatureTool.update(displayMode);
      }
      if (this.derivativeTool.showProperty.value) {
        this.derivativeTool.update(displayMode);
      }
    };

    // Update tools when display mode changes
    this.viewState.displayModeProperty.lazyLink(() => {
      updateTools();
    });

    // Update tools when time changes (for superposition states)
    this.model.timeProperty.lazyLink(() => {
      if (this.model.isPlayingProperty.value) {
        updateTools();
      }
    });

    // Update tools when potential or well parameters change
    this.model.potentialTypeProperty.lazyLink(updateTools);
    this.model.wellWidthProperty.lazyLink(updateTools);
    this.model.wellDepthProperty.lazyLink(updateTools);

    if ("barrierHeightProperty" in this.model) {
      this.model.barrierHeightProperty.lazyLink(updateTools);
    }

    if ("potentialOffsetProperty" in this.model) {
      this.model.potentialOffsetProperty.lazyLink(updateTools);
    }

    // Update tools when selected energy level changes
    this.model.selectedEnergyLevelIndexProperty.lazyLink(updateTools);

    if ("wellSeparationProperty" in this.model) {
      this.model.wellSeparationProperty.lazyLink(updateTools);
    }

    if ("numberOfWellsProperty" in this.model) {
      this.model.numberOfWellsProperty.lazyLink(updateTools);
    }

    if ("electricFieldProperty" in this.model) {
      this.model.electricFieldProperty.lazyLink(updateTools);
    }

    // Initialize labels (important for fixed display mode charts)
    this.updateYAxisLabel();
    this.updateStateLabel();

    // Perform initial update and tool updates asynchronously (after construction completes)
    // This prevents blocking the page load with expensive calculations
    setTimeout(() => {
      this.update();
      updateTools();
    }, 0);
  }

  /**
   * Gets the effective display mode, using the fixed display mode if set,
   * otherwise falling back to the model's display mode.
   */
  private getEffectiveDisplayMode(): string {
    return this.fixedDisplayMode || this.viewState.displayModeProperty.value;
  }

  /**
   * Checks if RMS indicators should be shown based on viewState property.
   * Returns true if the property doesn't exist (for backwards compatibility with other screens).
   */
  private shouldShowRMSIndicators(): boolean {
    if ("showRMSIndicatorProperty" in this.viewState) {
      return this.viewState.showRMSIndicatorProperty.value;
    }
    return true; // Show by default if property doesn't exist
  }

  /**
   * Updates the Y-axis label based on display mode.
   */
  private updateYAxisLabel(): void {
    const displayMode = this.getEffectiveDisplayMode();
    if (displayMode === "probabilityDensity") {
      this.yAxisLabel.string = a11y.visible.probabilityDensityAxisStringProperty.value;
    } else if (displayMode === "phaseColor") {
      this.yAxisLabel.string = a11y.visible.waveFunctionMagnitudeAxisStringProperty.value;
    } else {
      this.yAxisLabel.string = a11y.visible.waveFunctionAxisStringProperty.value;
    }
    // Leave room for the state and indicator labels at the top of the plot.
    this.yAxisLabel.centerY = this.chartMargins.top + this.plotHeight / 2 + 30;
  }

  /**
   * Updates the state label showing which wavefunction is displayed.
   */
  private updateStateLabel(): void {
    const displayMode = this.getEffectiveDisplayMode();
    const superpositionType = this.model.superpositionTypeProperty.value;
    const isSuperposition = superpositionType !== SuperpositionType.SINGLE;

    if (isSuperposition) {
      // Display superposition label
      let label: string;
      switch (superpositionType) {
        case SuperpositionType.PSI_I_PSI_J:
          label = "ψ₀+ψ₁";
          break;
        case SuperpositionType.LOCALIZED_NARROW:
          label = "Localized";
          break;
        case SuperpositionType.LOCALIZED_WIDE:
          label = "Localized";
          break;
        case SuperpositionType.COHERENT:
          label = "Coherent";
          break;
        case SuperpositionType.CUSTOM:
          label = "Custom";
          break;
        default:
          label = "Superposition";
      }

      if (displayMode === "probabilityDensity") {
        this.stateLabelNode.string = stringManager.stateLabelProbabilityStringProperty.value.replace(
          "{{label}}",
          label,
        );
      } else if (displayMode === "phaseColor") {
        this.stateLabelNode.string = stringManager.stateLabelWavefunctionStringProperty.value.replace(
          "{{label}}",
          label,
        );
      } else {
        this.stateLabelNode.string = label;
      }
    } else {
      // Display single eigenstate label
      const selectedIndex = this.model.selectedEnergyLevelIndexProperty.value;
      const boundStates = this.model.getBoundStates();

      if (!boundStates || selectedIndex < 0) {
        this.stateLabelNode.string = "";
        return;
      }

      if (selectedIndex >= boundStates.wavefunctions.length) {
        this.stateLabelNode.string = "";
        return;
      }

      // Format: ψ₁, ψ₂, etc. (or |ψ₁|² for probability density)
      const stateNumber = selectedIndex + 1;
      const stateLabel = `ψ${this.toSubscript(stateNumber)}`;

      if (displayMode === "probabilityDensity") {
        this.stateLabelNode.string = stringManager.stateLabelProbabilityStringProperty.value.replace(
          "{{label}}",
          stateLabel,
        );
      } else if (displayMode === "phaseColor") {
        this.stateLabelNode.string = stringManager.stateLabelWavefunctionStringProperty.value.replace(
          "{{label}}",
          stateLabel,
        );
      } else {
        this.stateLabelNode.string = stateLabel;
      }
    }
  }

  /**
   * Converts a number to subscript Unicode characters.
   */
  private toSubscript(num: number): string {
    const subscriptDigits = ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"];
    return num
      .toString()
      .split("")
      .map((digit) => subscriptDigits[Number.parseInt(digit, 10)])
      .join("");
  }

  /**
   * Formats a y-axis tick label value for display.
   * Uses appropriate precision based on the magnitude of the value.
   */
  private formatYTickLabel(value: number): string {
    // For values close to zero, show as 0.00
    if (Math.abs(value) < 1e-10) {
      return "0.00";
    }

    // Use consistent 2 decimal places for all tick values
    return value.toFixed(2);
  }

  public update(): void {
    // Prevent reentry - if an update is in progress, mark that another update is pending
    if (this.isUpdating) {
      this.updatePending = true;
      return;
    }

    this.isUpdating = true;
    try {
      // Keep updating until no more updates are pending
      let loopCount = 0;
      do {
        this.updatePending = false;
        loopCount++;
        if (loopCount > 10) {
          Logger.warn("[WaveFunctionChartNode] Infinite loop detected! Breaking after", loopCount, "iterations");
          break;
        }

        const boundStates = this.model.getBoundStates();
        if (!boundStates) {
          return;
        }

        // Check if we're displaying a superposition or a single eigenstate
        const superpositionType = this.model.superpositionTypeProperty.value;
        const isSuperposition = superpositionType !== SuperpositionType.SINGLE;

        if (isSuperposition && "superpositionConfigProperty" in this.model) {
          // Display superposition wavefunction with proper time evolution
          this.updateViewRangeForSuperpositionFromModel();
          this.updateZeroLine();
          this.updateSuperpositionWavefunction();
          this.updateStateLabel();
          // Hide classical probability visualization for superpositions
          this.classicalProbabilityOverlay.hide();
        } else {
          // Display single eigenstate
          const selectedIndex = this.model.selectedEnergyLevelIndexProperty.value;
          if (selectedIndex < 0 || selectedIndex >= boundStates.wavefunctions.length) {
            return;
          }

          this.updateViewRange(boundStates, selectedIndex);
          this.updateZeroLine();
          this.updateWaveFunction(boundStates, selectedIndex);
          this.updateStateLabel();

          // Update classical probability visualization
          // Show forbidden regions on both wavefunction and probability density charts
          // But only show the classical probability curve on probability density chart
          const displayMode = this.getEffectiveDisplayMode();
          const showOverlay = this.viewState.showClassicalProbabilityProperty.value;
          const showCurve = displayMode === "probabilityDensity";
          this.classicalProbabilityOverlay.update(boundStates, selectedIndex, showOverlay, showCurve);
        }
      } while (this.updatePending);
    } finally {
      this.isUpdating = false;
      this.updatePending = false;
    }
  }

  /**
   * Updates the view range based on the data and updates the ChartTransform.
   * Note: X-axis range is fixed, only Y-axis is updated dynamically.
   * Uses nm units (nm^-1/2 for wavefunction, nm^-1 for probability density).
   */
  private updateViewRange(boundStates: BoundStateResult, selectedIndex: number): void {
    // Calculate Y range based on wave function values
    if (selectedIndex < 0 || selectedIndex >= boundStates.wavefunctions.length) {
      return;
    }

    // Get wavefunction and probability density in nm units
    const nmData = this.model.getWavefunctionInNmUnits(selectedIndex + 1);
    if (!nmData) {
      return;
    }

    const displayMode = this.getEffectiveDisplayMode();

    let yMin: number;
    let yMax: number;

    if (displayMode === "probabilityDensity" || displayMode === "phaseColor") {
      // For probability density, always start at 0 and find the max (in nm^-1)
      yMax = maxFiniteAbs(nmData.probabilityDensity);
      yMin = 0;
    } else {
      // For wave function, use symmetric range around zero (in nm^-1/2)
      const maxAbs = maxFiniteAbs(nmData.wavefunction);
      yMin = -maxAbs;
      yMax = maxAbs;
    }

    // Add some padding (10%)
    const padding = (yMax - yMin) * 0.1;
    yMin -= padding;
    yMax += padding;

    // Ensure non-zero range
    if (yMax - yMin < 0.01) {
      yMin = -0.01;
      yMax = 0.01;
    }

    // Safety check: if range values are too large (indicating a calculation error), use defaults
    if (Math.abs(yMin) > 1000 || Math.abs(yMax) > 1000) {
      Logger.warn("[WaveFunctionChartNode] Invalid range values detected!", yMin, yMax, "Using defaults");
      yMin = -1;
      yMax = 1;
    }

    // Update properties
    this.yMinProperty.value = yMin;
    this.yMaxProperty.value = yMax;

    // Update chart transform
    this.chartTransform.setModelYRange(new Range(yMin, yMax));
  }

  /**
   * Updates the view range for superposition wavefunctions.
   * Uses nm units (nm^-1/2 for wavefunction, nm^-1 for probability density).
   */
  private updateViewRangeForSuperpositionFromModel(): void {
    const boundStates = this.model.getBoundStates();
    if (!(boundStates && hasSuperpositionConfig(this.model))) {
      return;
    }

    const time = this.model.timeProperty.value * 1e-15; // Convert fs to seconds

    // Get time-evolved superposition in nm units
    const nmData = this.model.getTimeEvolvedSuperpositionInNmUnits(time);
    if (!nmData) {
      return;
    }

    // Calculate Y range based on display mode
    const displayMode = this.getEffectiveDisplayMode();
    let yMin: number;
    let yMax: number;

    if (displayMode === "probabilityDensity" || displayMode === "phaseColor") {
      // For probability density or phase color, find max of probability density (in nm^-1)
      yMax = maxFiniteAbs(nmData.probabilityDensity);
      yMin = 0;
    } else {
      // For wave function components, use symmetric range (in nm^-1/2)
      const maxAbs = maxFiniteAbs([...nmData.realPart, ...nmData.imagPart, nmData.maxMagnitude]);
      yMin = -maxAbs;
      yMax = maxAbs;
    }

    // Add some padding (10%)
    const padding = (yMax - yMin) * 0.1;
    yMin -= padding;
    yMax += padding;

    // Ensure non-zero range
    if (yMax - yMin < 0.01) {
      yMin = -0.01;
      yMax = 0.01;
    }

    // Safety check: if range values are too large (indicating a calculation error), use defaults
    if (Math.abs(yMin) > 1000 || Math.abs(yMax) > 1000) {
      Logger.warn("[WaveFunctionChartNode] Invalid range values detected!", yMin, yMax, "Using defaults");
      yMin = -1;
      yMax = 1;
    }

    // Update properties
    this.yMinProperty.value = yMin;
    this.yMaxProperty.value = yMax;

    // Update chart transform
    this.chartTransform.setModelYRange(new Range(yMin, yMax));
  }

  /**
   * Updates the superposition wavefunction visualization.
   * Uses nm units (nm^-1/2 for wavefunction, nm^-1 for probability density).
   */
  private updateSuperpositionWavefunction(): void {
    const boundStates = this.model.getBoundStates();
    if (!(boundStates && hasSuperpositionConfig(this.model))) {
      return;
    }

    const time = this.model.timeProperty.value * 1e-15; // Convert fs to seconds

    // Get time-evolved superposition in nm units
    const nmData = this.model.getTimeEvolvedSuperpositionInNmUnits(time);
    if (!nmData) {
      return;
    }

    const xGrid = boundStates.xGrid;
    const realPartNm = nmData.realPart;
    const imagPartNm = nmData.imagPart;
    const probabilityDensityNm = nmData.probabilityDensity;

    // Get SI units for zeros visualization (which still uses SI)
    const siData = this.model.getTimeEvolvedSuperposition(time);
    const realPartSI = siData ? siData.realPart : realPartNm;

    // Display based on mode
    const displayMode = this.getEffectiveDisplayMode();

    if (displayMode === "probabilityDensity") {
      // Plot probability density in nm^-1 units
      this.plotProbabilityDensityFromArray(xGrid, probabilityDensityNm);

      // Calculate and display average and RMS position
      // Convert xGrid from meters to nanometers for calculations
      const xGridNm = xGrid.map((x) => x * 1e9);
      const stats = calculateRMSStatistics(xGridNm, probabilityDensityNm);

      // Only show indicators if showRMSIndicatorProperty is true and the distribution has a mean and spread
      if (stats && this.shouldShowRMSIndicators()) {
        const { avg, rms } = stats;
        this.avgPositionLabel.string = stringManager.averagePositionLabelStringProperty.value.replace(
          "{{value}}",
          avg.toFixed(2),
        );
        this.rmsPositionLabel.string = stringManager.rmsPositionLabelStringProperty.value.replace(
          "{{value}}",
          rms.toFixed(2),
        );

        // Update average position indicator: vertical line at ⟨x⟩
        const avgX = this.dataToViewX(avg);
        const yTop = this.dataToViewY(this.yMaxProperty.value);
        const yBottom = this.dataToViewY(this.yMinProperty.value);
        this.avgPositionIndicator.setLine(avgX, yTop, avgX, yBottom);

        // Update RMS indicator: horizontal double arrow from (avg - rms) to (avg + rms)
        const leftX = avg - rms;
        const rightX = avg + rms;
        const x1 = this.dataToViewX(leftX);
        const x2 = this.dataToViewX(rightX);
        // Position the indicator at 80% of the visible range
        const indicatorY = this.dataToViewY(this.yMaxProperty.value * 0.8);
        this.rmsPositionIndicator.shape = createDoubleArrowShape(x1, x2, indicatorY);
      } else {
        // Hide indicators when checkbox is unchecked
        this.avgPositionLabel.string = "";
        this.rmsPositionLabel.string = "";
        this.avgPositionIndicator.setLine(0, 0, 0, 0);
        this.rmsPositionIndicator.shape = null;
      }

      // Hide wavefunction components and phase color
      this.realPartPath.visible = false;
      this.imaginaryPartPath.visible = false;
      this.magnitudePath.visible = false;
      this.phaseColorVisualization.hide();

      // Update zeros visualization if enabled (uses SI units)
      if (this.viewState.showZerosProperty.value) {
        // For superposition, show zeros of the real part
        this.zerosVisualization.showProperty.value = true;
        this.zerosVisualization.update(xGrid, realPartSI);
      } else {
        this.zerosVisualization.showProperty.value = false;
      }
    } else if (displayMode === "phaseColor") {
      // Plot phase-colored superposition (uses nm units)
      this.phaseColorVisualization.show();
      this.phaseColorVisualization.plotSuperposition(xGrid, realPartNm, imagPartNm);

      // Hide other paths
      this.probabilityDensityPath.shape = null;
      this.realPartPath.visible = false;
      this.imaginaryPartPath.visible = false;
      this.magnitudePath.visible = false;

      // Hide RMS position indicator and labels
      this.avgPositionIndicator.setLine(0, 0, 0, 0);
      this.rmsPositionIndicator.shape = null;
      this.avgPositionLabel.string = "";
      this.rmsPositionLabel.string = "";

      // Hide zeros for phase color mode
      this.zerosVisualization.showProperty.value = false;
    } else {
      // waveFunction mode - show real, imaginary, and magnitude (in nm units)
      this.plotSuperpositionComponents(xGrid, realPartNm, imagPartNm);

      // Phase is an optional color fill beneath the magnitude curve.
      this.probabilityDensityPath.shape = null;
      if (this.viewState.showMagnitudeProperty.value && this.viewState.showPhaseProperty.value) {
        this.phaseColorVisualization.show();
        this.phaseColorVisualization.plotSuperposition(xGrid, realPartNm, imagPartNm);
      } else {
        this.phaseColorVisualization.hide();
      }

      // Hide RMS position indicator and labels
      this.avgPositionIndicator.setLine(0, 0, 0, 0);
      this.rmsPositionIndicator.shape = null;
      this.avgPositionLabel.string = "";
      this.rmsPositionLabel.string = "";

      // Update zeros visualization if enabled (uses SI units)
      if (this.viewState.showZerosProperty.value) {
        this.zerosVisualization.showProperty.value = true;
        this.zerosVisualization.update(xGrid, realPartSI);
      } else {
        this.zerosVisualization.showProperty.value = false;
      }
    }
  }

  /**
   * Updates the zero line position.
   */
  private updateZeroLine(): void {
    const y = this.dataToViewY(0);
    this.zeroLine.setLine(this.chartMargins.left, y, this.chartMargins.left + this.plotWidth, y);
  }

  /**
   * Updates the wave function visualization for a single eigenstate.
   */
  private updateWaveFunction(boundStates: BoundStateResult, selectedIndex: number): void {
    if (selectedIndex < 0 || selectedIndex >= boundStates.wavefunctions.length) {
      return;
    }

    // Get wavefunction and probability density in nm units
    const nmData = this.model.getWavefunctionInNmUnits(selectedIndex + 1);
    if (!nmData) {
      return;
    }

    const xGrid = boundStates.xGrid;
    const wavefunctionNm = nmData.wavefunction;
    const probabilityDensityNm = nmData.probabilityDensity;
    const wavefunctionSI = boundStates.wavefunctions[selectedIndex]!;
    const displayMode = this.getEffectiveDisplayMode();

    if (displayMode === "probabilityDensity") {
      // Plot probability density in nm^-1 units
      this.plotProbabilityDensityFromArray(xGrid, probabilityDensityNm);

      // Calculate and display average and RMS position
      // Convert xGrid from meters to nanometers for calculations
      const xGridNm = xGrid.map((x) => x * 1e9);
      const stats = calculateRMSStatistics(xGridNm, probabilityDensityNm);

      // Only show indicators if showRMSIndicatorProperty is true and the distribution has a mean and spread
      if (stats && this.shouldShowRMSIndicators()) {
        const { avg, rms } = stats;
        this.avgPositionLabel.string = stringManager.averagePositionLabelStringProperty.value.replace(
          "{{value}}",
          avg.toFixed(2),
        );
        this.rmsPositionLabel.string = stringManager.rmsPositionLabelStringProperty.value.replace(
          "{{value}}",
          rms.toFixed(2),
        );

        // Update average position indicator: vertical line at ⟨x⟩
        const avgX = this.dataToViewX(avg);
        const yTop = this.dataToViewY(this.yMaxProperty.value);
        const yBottom = this.dataToViewY(this.yMinProperty.value);
        this.avgPositionIndicator.setLine(avgX, yTop, avgX, yBottom);

        // Update RMS indicator: horizontal double arrow from (avg - rms) to (avg + rms)
        const leftX = avg - rms;
        const rightX = avg + rms;
        const x1 = this.dataToViewX(leftX);
        const x2 = this.dataToViewX(rightX);
        // Position the indicator at 80% of the visible range
        const indicatorY = this.dataToViewY(this.yMaxProperty.value * 0.8);
        this.rmsPositionIndicator.shape = createDoubleArrowShape(x1, x2, indicatorY);
      } else {
        // Hide indicators when checkbox is unchecked
        this.avgPositionLabel.string = "";
        this.rmsPositionLabel.string = "";
        this.avgPositionIndicator.setLine(0, 0, 0, 0);
        this.rmsPositionIndicator.shape = null;
      }

      // Hide wavefunction component paths and phase color
      this.realPartPath.visible = false;
      this.imaginaryPartPath.visible = false;
      this.magnitudePath.visible = false;
      this.phaseColorVisualization.hide();

      // Update zeros visualization if enabled (uses SI units)
      if (this.viewState.showZerosProperty.value) {
        this.zerosVisualization.showProperty.value = true;
        this.zerosVisualization.update(xGrid, wavefunctionSI);
      } else {
        this.zerosVisualization.showProperty.value = false;
      }
    } else if (displayMode === "phaseColor") {
      // Calculate global time evolution phase
      // nmData above is only non-null for an in-range selection
      const energy = boundStates.energies[selectedIndex] ?? 0;
      const time = this.model.timeProperty.value * 1e-15; // Convert fs to seconds
      const globalPhase = -(energy * time) / QuantumConstants.HBAR;

      // Plot phase-colored wavefunction (uses nm units)
      this.phaseColorVisualization.show();
      this.phaseColorVisualization.plotWavefunction(xGrid, wavefunctionNm, globalPhase);

      // Hide other paths
      this.probabilityDensityPath.shape = null;
      this.realPartPath.visible = false;
      this.imaginaryPartPath.visible = false;
      this.magnitudePath.visible = false;

      // Hide RMS position indicator and labels
      this.avgPositionIndicator.setLine(0, 0, 0, 0);
      this.rmsPositionIndicator.shape = null;
      this.avgPositionLabel.string = "";
      this.rmsPositionLabel.string = "";

      // Hide zeros for phase color mode
      this.zerosVisualization.showProperty.value = false;
    } else {
      // waveFunction mode - show real part, imaginary part, and magnitude (in nm units)
      this.plotWaveFunctionComponents(xGrid, wavefunctionNm);

      // Phase is an optional color fill beneath the magnitude curve.
      this.probabilityDensityPath.shape = null;
      if (this.viewState.showMagnitudeProperty.value && this.viewState.showPhaseProperty.value) {
        const energy = boundStates.energies[selectedIndex] ?? 0;
        const time = this.model.timeProperty.value * 1e-15;
        const globalPhase = -(energy * time) / QuantumConstants.HBAR;
        this.phaseColorVisualization.show();
        this.phaseColorVisualization.plotWavefunction(xGrid, wavefunctionNm, globalPhase);
      } else {
        this.phaseColorVisualization.hide();
      }

      // Hide RMS position indicator and labels
      this.avgPositionIndicator.setLine(0, 0, 0, 0);
      this.rmsPositionIndicator.shape = null;
      this.avgPositionLabel.string = "";
      this.rmsPositionLabel.string = "";

      // Update zeros visualization if enabled (uses SI units)
      if (this.viewState.showZerosProperty.value) {
        this.zerosVisualization.showProperty.value = true;
        this.zerosVisualization.update(xGrid, wavefunctionSI);
      } else {
        this.zerosVisualization.showProperty.value = false;
      }
    }
  }

  /**
   * Plots the wave function components (real, imaginary, magnitude) for waveFunction display mode.
   */
  private plotWaveFunctionComponents(xGrid: number[], wavefunction: number[]): void {
    const energy = this.model.getBoundStates()?.energies[this.model.selectedEnergyLevelIndexProperty.value];
    if (energy === undefined) {
      return; // Selection not (yet) within the current states
    }
    const time = this.model.timeProperty.value * 1e-15; // Convert fs to seconds

    // Calculate time evolution phase for the eigenstate: -E_n*t/ℏ
    const globalPhase = -(energy * time) / QuantumConstants.HBAR;

    // Apply time evolution to get real and imaginary parts
    const realPart = wavefunction.map((psi) => psi * Math.cos(globalPhase));
    const imagPart = wavefunction.map((psi) => -psi * Math.sin(globalPhase));

    // Build points for each component
    const realPoints: { x: number; y: number }[] = [];
    const imagPoints: { x: number; y: number }[] = [];
    const magnitudePoints: { x: number; y: number }[] = [];

    for (let i = 0; i < xGrid.length; i++) {
      const x = this.dataToViewX(xGrid[i]! * QuantumConstants.M_TO_NM);

      realPoints.push({ x, y: this.dataToViewY(realPart[i]!) });
      imagPoints.push({ x, y: this.dataToViewY(imagPart[i]!) });
      magnitudePoints.push({ x, y: this.dataToViewY(Math.abs(wavefunction[i]!)) });
    }

    // Plot real part
    const realShape = new Shape();
    if (realPoints.length > 0) {
      realShape.moveTo(realPoints[0]!.x, realPoints[0]!.y);
      for (let i = 1; i < realPoints.length; i++) {
        realShape.lineTo(realPoints[i]!.x, realPoints[i]!.y);
      }
    }
    this.realPartPath.shape = realShape;
    this.realPartPath.visible = this.viewState.showRealPartProperty.value;

    // Plot imaginary part
    const imagShape = new Shape();
    if (imagPoints.length > 0) {
      imagShape.moveTo(imagPoints[0]!.x, imagPoints[0]!.y);
      for (let i = 1; i < imagPoints.length; i++) {
        imagShape.lineTo(imagPoints[i]!.x, imagPoints[i]!.y);
      }
    }
    this.imaginaryPartPath.shape = imagShape;
    this.imaginaryPartPath.visible = this.viewState.showImaginaryPartProperty.value;

    // Plot magnitude
    const magnitudeShape = new Shape();
    if (magnitudePoints.length > 0) {
      magnitudeShape.moveTo(magnitudePoints[0]!.x, magnitudePoints[0]!.y);
      for (let i = 1; i < magnitudePoints.length; i++) {
        magnitudeShape.lineTo(magnitudePoints[i]!.x, magnitudePoints[i]!.y);
      }
    }
    this.magnitudePath.shape = magnitudeShape;
    this.magnitudePath.visible = this.viewState.showMagnitudeProperty.value;
  }

  /**
   * Plots probability density from a pre-calculated array.
   */
  private plotProbabilityDensityFromArray(xGrid: number[], probabilityDensity: number[]): void {
    const shape = new Shape();

    // Build points array
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < xGrid.length; i++) {
      const x = this.dataToViewX(xGrid[i]! * QuantumConstants.M_TO_NM);
      const y = this.dataToViewY(probabilityDensity[i]!);
      points.push({ x, y });
    }

    if (points.length === 0) {
      this.probabilityDensityPath.shape = null;
      return;
    }

    // Create filled area under the curve
    const y0 = this.dataToViewY(0); // baseline

    // Start at bottom-left
    shape.moveTo(points[0]!.x, y0);
    shape.lineTo(points[0]!.x, points[0]!.y);

    // Trace the curve
    for (let i = 0; i < points.length - 1; i++) {
      shape.lineTo(points[i]!.x, points[i]!.y);
    }

    // Close the shape back to baseline
    shape.lineTo(points[points.length - 1]!.x, points[points.length - 1]!.y);
    shape.lineTo(points[points.length - 1]!.x, y0);
    shape.close();

    this.probabilityDensityPath.shape = shape;
  }

  /**
   * Plots superposition components (real, imaginary, magnitude).
   */
  private plotSuperpositionComponents(xGrid: number[], realPart: number[], imagPart: number[]): void {
    // Build points for each component
    const realPoints: { x: number; y: number }[] = [];
    const imagPoints: { x: number; y: number }[] = [];
    const magnitudePoints: { x: number; y: number }[] = [];

    for (let i = 0; i < xGrid.length; i++) {
      const x = this.dataToViewX(xGrid[i]! * QuantumConstants.M_TO_NM);
      const magnitude = Math.sqrt(realPart[i]! * realPart[i]! + imagPart[i]! * imagPart[i]!);

      realPoints.push({ x, y: this.dataToViewY(realPart[i]!) });
      imagPoints.push({ x, y: this.dataToViewY(imagPart[i]!) });
      magnitudePoints.push({ x, y: this.dataToViewY(magnitude) });
    }

    // Plot real part
    const realShape = new Shape();
    if (realPoints.length > 0) {
      realShape.moveTo(realPoints[0]!.x, realPoints[0]!.y);
      for (let i = 1; i < realPoints.length; i++) {
        realShape.lineTo(realPoints[i]!.x, realPoints[i]!.y);
      }
    }
    this.realPartPath.shape = realShape;
    this.realPartPath.visible = this.viewState.showRealPartProperty.value;

    // Plot imaginary part
    const imagShape = new Shape();
    if (imagPoints.length > 0) {
      imagShape.moveTo(imagPoints[0]!.x, imagPoints[0]!.y);
      for (let i = 1; i < imagPoints.length; i++) {
        imagShape.lineTo(imagPoints[i]!.x, imagPoints[i]!.y);
      }
    }
    this.imaginaryPartPath.shape = imagShape;
    this.imaginaryPartPath.visible = this.viewState.showImaginaryPartProperty.value;

    // Plot magnitude
    const magnitudeShape = new Shape();
    if (magnitudePoints.length > 0) {
      magnitudeShape.moveTo(magnitudePoints[0]!.x, magnitudePoints[0]!.y);
      for (let i = 1; i < magnitudePoints.length; i++) {
        magnitudeShape.lineTo(magnitudePoints[i]!.x, magnitudePoints[i]!.y);
      }
    }
    this.magnitudePath.shape = magnitudeShape;
    this.magnitudePath.visible = this.viewState.showMagnitudeProperty.value;
  }

  /**
   * Updates the wave function visualization during time evolution.
   * This is optimized to only update what changes with time.
   */
  private updateTimeEvolution(): void {
    // Only update if we're in a mode that shows time-dependent changes
    const displayMode = this.getEffectiveDisplayMode();
    const superpositionType = this.model.superpositionTypeProperty.value;
    const isSuperposition = superpositionType !== SuperpositionType.SINGLE;

    if (isSuperposition) {
      // Superposition wavefunctions evolve in time
      this.updateSuperpositionWavefunction();
    } else if (displayMode === "waveFunction" || displayMode === "phaseColor") {
      // Single eigenstates show time evolution in waveFunction and phaseColor modes
      const boundStates = this.model.getBoundStates();
      if (!boundStates) {
        return;
      }

      const selectedIndex = this.model.selectedEnergyLevelIndexProperty.value;
      if (selectedIndex < 0 || selectedIndex >= boundStates.wavefunctions.length) {
        return;
      }

      this.updateWaveFunction(boundStates, selectedIndex);
    }
    // For probability density mode with single eigenstates, nothing changes with time
  }

  /**
   * Coordinate transformation: data (nm) to view (pixels).
   */
  private dataToViewX(x: number): number {
    return this.chartMargins.left + this.chartTransform.modelToViewX(x);
  }

  /**
   * Coordinate transformation: data value to view (pixels).
   */
  private dataToViewY(y: number): number {
    return this.chartMargins.top + this.chartTransform.modelToViewY(y);
  }

  /**
   * Coordinate transformation: view (pixels) to data (nm).
   */
  private viewToDataX(x: number): number {
    return this.chartTransform.viewToModelX(x - this.chartMargins.left);
  }
}
