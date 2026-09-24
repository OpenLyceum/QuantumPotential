/**
 * WavenumberChartNode displays the square magnitude of the Fourier transform
 * of the wavefunction in wavenumber space |φ(k)|².
 *
 * This chart shows the momentum distribution of the quantum state and displays
 * the average wavenumber <k> and RMS wavenumber k_rms.
 */

import { DerivedProperty, NumberProperty } from "scenerystack/axon";
import { AxisLine, ChartRectangle, ChartTransform, TickLabelSet, TickMarkSet } from "scenerystack/bamboo";
import { Range } from "scenerystack/dot";
import { localeProperty } from "scenerystack/joist";
import { Shape } from "scenerystack/kite";
import { Orientation } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { Line, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import stringManager from "../../i18n/StringManager.js";
import QPPWColors from "../../QPPWColors.js";
import type { PotentialType } from "../model/PotentialFunction.js";
import type { ScreenModel } from "../model/ScreenModels.js";
import { CoalescedUpdate } from "./CoalescedUpdate.js";
import { createDoubleArrowShape } from "./RMSIndicatorUtils.js";
import type { ScreenViewState } from "./ScreenViewStates.js";

const a11y = stringManager.getA11yStrings();

export class WavenumberChartNode extends Node {
  private readonly model: ScreenModel;
  private readonly viewState: ScreenViewState | undefined;
  private readonly chartWidth: number;
  private readonly chartHeight: number;
  private readonly chartMargins = { left: 60, right: 20, top: 40, bottom: 40 };

  // Chart bounds in view coordinates
  private readonly plotWidth: number;
  private readonly plotHeight: number;

  // ChartTransform for model-to-view coordinate conversion
  private readonly chartTransform: ChartTransform;

  // View range properties
  private readonly kMinProperty: NumberProperty;
  private readonly kMaxProperty: NumberProperty;
  private readonly yMinProperty: NumberProperty;
  private readonly yMaxProperty: NumberProperty;

  // Visual elements
  private readonly backgroundRect: ChartRectangle;
  private readonly plotContentNode: Node; // Clipped container for plot content
  private readonly wavenumberPath: Path;
  private readonly zeroLine: Line;
  private readonly rmsIndicator: Path; // Double arrow indicator for RMS wavenumber
  private readonly axesNode: Node;
  private readonly titleLabel: Text;
  private readonly avgWavenumberLabel: Text;
  private readonly rmsWavenumberLabel: Text;

  // Guard flag to prevent reentry during updates
  private isUpdating: boolean = false;

  public constructor(
    model: ScreenModel,
    options?: {
      width?: number;
      height?: number;
      viewState?: ScreenViewState;
    },
  ) {
    super({
      // PDOM - make wavenumber chart accessible
      tagName: "div",
      labelTagName: "h3",
      labelContent: a11y.wavenumberChart.headingStringProperty,
      descriptionTagName: "p",
    });

    this.model = model;
    this.viewState = options?.viewState;

    // Set up accessible description after this.model is initialized
    this.descriptionContent = new DerivedProperty(
      [
        model.selectedEnergyLevelIndexProperty,
        model.potentialTypeProperty,
        model.wellWidthProperty,
        localeProperty, // rebuild the sentences on a language change
      ],
      (selectedIndex: number, potentialType: PotentialType, width: number) => {
        return this.createWavenumberDescription(selectedIndex, potentialType, width);
      },
    );
    this.chartWidth = options?.width ?? 600;
    this.chartHeight = options?.height ?? 140;

    this.plotWidth = this.chartWidth - this.chartMargins.left - this.chartMargins.right;
    this.plotHeight = this.chartHeight - this.chartMargins.top - this.chartMargins.bottom;

    // Initialize view range (will be updated based on data)
    this.kMinProperty = new NumberProperty(-5);
    this.kMaxProperty = new NumberProperty(5);
    this.yMinProperty = new NumberProperty(0);
    this.yMaxProperty = new NumberProperty(1);

    // Create ChartTransform for model-to-view coordinate conversion
    this.chartTransform = new ChartTransform({
      viewWidth: this.plotWidth,
      viewHeight: this.plotHeight,
      modelXRange: new Range(this.kMinProperty.value, this.kMaxProperty.value),
      modelYRange: new Range(this.yMinProperty.value, this.yMaxProperty.value),
    });

    // Create background using ChartRectangle
    this.backgroundRect = new ChartRectangle(this.chartTransform, {
      fill: QPPWColors.backgroundColorProperty,
      stroke: null,
      lineWidth: 1,
    });
    this.backgroundRect.x = this.chartMargins.left;
    this.backgroundRect.y = this.chartMargins.top;
    this.addChild(this.backgroundRect);

    // Create title label
    this.titleLabel = new Text(a11y.visible.wavenumberDistributionStringProperty, {
      font: new PhetFont({ size: 16, weight: "bold" }),
      fill: QPPWColors.labelFillProperty,
      centerX: this.chartWidth / 2,
      top: 5,
    });
    this.addChild(this.titleLabel);

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

    // Create wavenumber distribution path
    this.wavenumberPath = new Path(null, {
      stroke: QPPWColors.wavefunctionProbabilityProperty,
      lineWidth: 2,
      fill: QPPWColors.wavefunctionProbabilityFillProperty,
    });
    this.plotContentNode.addChild(this.wavenumberPath);

    // Create RMS wavenumber indicator (double arrow)
    this.rmsIndicator = new Path(null, {
      stroke: QPPWColors.energyLevelSelectedProperty,
      lineWidth: 2,
      fill: QPPWColors.energyLevelSelectedProperty,
    });
    this.plotContentNode.addChild(this.rmsIndicator);

    // Create labels for average and RMS wavenumber
    this.avgWavenumberLabel = new Text("", {
      font: new PhetFont(12),
      fill: QPPWColors.labelFillProperty,
      left: this.chartMargins.left + 10,
      top: this.chartMargins.top + 5,
    });
    this.addChild(this.avgWavenumberLabel);

    this.rmsWavenumberLabel = new Text("", {
      font: new PhetFont(12),
      fill: QPPWColors.labelFillProperty,
      left: this.chartMargins.left + 10,
      top: this.chartMargins.top + 25,
    });
    this.addChild(this.rmsWavenumberLabel);

    // Ensure axes are on top of the clipped plot content
    this.axesNode.moveToFront();

    // Link to model properties
    this.linkToModel();

    // Note: Initial update is now done asynchronously inside linkToModel()
    // to prevent blocking the page load
  }

  /**
   * Creates an accessible description of the wavenumber chart based on current state.
   * This provides screen reader users with meaningful information about the momentum distribution.
   */
  private createWavenumberDescription(selectedIndex: number, _potentialType: PotentialType, _width: number): string {
    const strings = a11y.wavenumberChart;
    const distribution = this.model.getWavenumberDistribution(selectedIndex);
    if (!distribution) {
      return strings.noDataStringProperty.value;
    }
    const paragraphs = [
      strings.introductionStringProperty.value,
      StringUtils.fillIn(strings.statisticsPatternStringProperty, {
        average: distribution.average.toFixed(3),
        rms: distribution.spread.toFixed(3),
      }),
      StringUtils.fillIn(strings.momentumPatternStringProperty, {
        momentum: distribution.averageMomentum.toExponential(2),
      }),
    ];

    if (distribution.uncertaintyProduct !== null) {
      paragraphs.push(
        StringUtils.fillIn(strings.uncertaintyPatternStringProperty, {
          product: distribution.uncertaintyProduct.toFixed(2),
        }),
      );
    }

    return paragraphs.join("\n\n");
  }

  /**
   * Creates the axes (X and Y) with labels.
   */
  private createAxes(): Node {
    const axesNode = new Node();

    // Y-axis at left edge using bamboo AxisLine
    const yAxisLeftNode = new AxisLine(this.chartTransform, Orientation.VERTICAL, {
      stroke: QPPWColors.axisProperty,
      lineWidth: 2,
      value: this.kMinProperty.value,
    });
    yAxisLeftNode.x = this.chartMargins.left;
    yAxisLeftNode.y = this.chartMargins.top;
    axesNode.addChild(yAxisLeftNode);

    // Y-axis at origin using bamboo AxisLine (at k=0)
    const yAxisNode = new AxisLine(this.chartTransform, Orientation.VERTICAL, {
      stroke: QPPWColors.axisProperty,
      lineWidth: 2,
      value: 0,
      opacity: 0.3,
    });
    yAxisNode.x = this.chartMargins.left;
    yAxisNode.y = this.chartMargins.top;
    axesNode.addChild(yAxisNode);

    // X-axis using bamboo AxisLine (at y=0)
    const xAxisNode = new AxisLine(this.chartTransform, Orientation.HORIZONTAL, {
      stroke: QPPWColors.axisProperty,
      lineWidth: 2,
      value: 0,
    });
    xAxisNode.x = this.chartMargins.left;
    xAxisNode.y = this.chartMargins.top;
    axesNode.addChild(xAxisNode);

    // X-axis tick marks
    const xTickMarksNode = new TickMarkSet(this.chartTransform, Orientation.HORIZONTAL, 2, {
      edge: "max",
      extent: 8,
      stroke: QPPWColors.axisProperty,
      lineWidth: 1,
    });
    xTickMarksNode.x = this.chartMargins.left;
    xTickMarksNode.y = this.chartMargins.top + this.plotHeight;
    axesNode.addChild(xTickMarksNode);

    // X-axis tick labels
    const xTickLabelsNode = new TickLabelSet(this.chartTransform, Orientation.HORIZONTAL, 2, {
      edge: "max",
      createLabel: (value: number) =>
        new Text(value.toFixed(0), {
          font: new PhetFont(12),
          fill: QPPWColors.labelFillProperty,
        }),
    });
    xTickLabelsNode.x = this.chartMargins.left;
    xTickLabelsNode.y = this.chartMargins.top + this.plotHeight;
    axesNode.addChild(xTickLabelsNode);

    // Y-axis label
    const yAxisLabel = new Text("|φ(k)|² (nm)", {
      font: new PhetFont(14),
      fill: QPPWColors.labelFillProperty,
      rotation: -Math.PI / 2,
      centerX: this.chartMargins.left - 40,
      centerY: this.chartHeight / 2,
    });
    axesNode.addChild(yAxisLabel);

    // X-axis label
    const xLabelText = new Text(a11y.visible.wavenumberAxisStringProperty, {
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
    const potentialUpdate = new CoalescedUpdate(() => this.update());
    this.model.potentialRevisionProperty.lazyLink(() => potentialUpdate.schedule());
    this.model.selectedEnergyLevelIndexProperty.lazyLink(() => this.update());

    // Update visibility of RMS indicators
    this.viewState?.showRMSIndicatorProperty.lazyLink(() => {
      this.update();
    });

    // Perform initial update asynchronously (after construction completes)
    // This prevents blocking the page load with expensive calculations
    setTimeout(() => {
      this.update();
    }, 0);
  }

  /**
   * Checks if RMS indicators should be shown based on viewState property.
   * Returns true when the chart has no view state.
   */
  private shouldShowRMSIndicators(): boolean {
    return this.viewState?.showRMSIndicatorProperty.value ?? true;
  }

  /**
   * Main update method - recalculates and redraws everything.
   */
  public update(): void {
    // Prevent reentry
    if (this.isUpdating) {
      return;
    }

    this.isUpdating = true;
    try {
      const distribution = this.model.getWavenumberDistribution(this.model.selectedEnergyLevelIndexProperty.value);
      if (!distribution) {
        // Clear the chart if no data available
        this.wavenumberPath.shape = null;
        this.rmsIndicator.shape = null;
        this.avgWavenumberLabel.string = "";
        this.rmsWavenumberLabel.string = "";
        return;
      }

      const kGridNm = distribution.gridNm;
      const phiKSquared = distribution.density;

      // Update view range based on data
      this.updateViewRange(kGridNm, phiKSquared);
      this.updateZeroLine();

      // Plot the distribution
      this.plotWavenumberDistribution(kGridNm, phiKSquared);

      // Calculate and display average and RMS wavenumber
      // Only show indicators if showRMSIndicatorProperty is true and the distribution has a mean and spread
      if (this.shouldShowRMSIndicators()) {
        const { average: avg, spread: rms } = distribution;
        this.avgWavenumberLabel.string = stringManager.averageWavenumberLabelStringProperty.value.replace(
          "{{value}}",
          avg.toFixed(2),
        );
        this.rmsWavenumberLabel.string = stringManager.rmsWavenumberLabelStringProperty.value.replace(
          "{{value}}",
          rms.toFixed(2),
        );

        // Update RMS indicator: horizontal double arrow from (avg - rms) to (avg + rms)
        const leftK = avg - rms;
        const rightK = avg + rms;
        const x1 = this.dataToViewX(leftK);
        const x2 = this.dataToViewX(rightK);
        // Position the indicator at 20% from the top of the visible range
        const indicatorY = this.dataToViewY(this.yMaxProperty.value * 0.8);
        this.rmsIndicator.shape = createDoubleArrowShape(x1, x2, indicatorY);
      } else {
        // Hide indicators when checkbox is unchecked
        this.avgWavenumberLabel.string = "";
        this.rmsWavenumberLabel.string = "";
        this.rmsIndicator.shape = null;
      }
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Updates the view range based on the wavenumber data.
   */
  private updateViewRange(kGrid: number[], phiKSquared: number[]): void {
    // Find the range where |φ(k)|² is significant (> 1% of max)
    const maxValue = phiKSquared.reduce((max, value) => (value > max ? value : max), 0);
    if (kGrid.length < 2 || !(maxValue > 0) || !Number.isFinite(maxValue)) {
      return; // Nothing to show; keep the previous view range
    }
    const threshold = maxValue * 0.01;

    let minK = kGrid[0]!;
    let maxK = kGrid[kGrid.length - 1]!;

    // Find first significant point
    for (let i = 0; i < kGrid.length; i++) {
      if (phiKSquared[i]! > threshold) {
        minK = kGrid[i]!;
        break;
      }
    }

    // Find last significant point
    for (let i = kGrid.length - 1; i >= 0; i--) {
      if (phiKSquared[i]! > threshold) {
        maxK = kGrid[i]!;
        break;
      }
    }

    // Add 20% margin (a single significant point still gets a non-degenerate range)
    const range = maxK - minK;
    const margin = range > 0 ? range * 0.2 : Math.abs(kGrid[1]! - kGrid[0]!) || 1;
    this.kMinProperty.value = minK - margin;
    this.kMaxProperty.value = maxK + margin;

    this.yMinProperty.value = 0;
    this.yMaxProperty.value = maxValue * 1.2; // 20% margin

    // Update ChartTransform
    this.chartTransform.setModelXRange(new Range(this.kMinProperty.value, this.kMaxProperty.value));
    this.chartTransform.setModelYRange(new Range(this.yMinProperty.value, this.yMaxProperty.value));
  }

  /**
   * Updates the zero-line reference.
   */
  private updateZeroLine(): void {
    const y = this.dataToViewY(0);
    this.zeroLine.x1 = this.chartMargins.left;
    this.zeroLine.y1 = y;
    this.zeroLine.x2 = this.chartWidth - this.chartMargins.right;
    this.zeroLine.y2 = y;
  }

  /**
   * Plots the wavenumber distribution |φ(k)|² with smooth curves.
   */
  private plotWavenumberDistribution(kGrid: number[], phiKSquared: number[]): void {
    const shape = new Shape();

    // Start at zero on the left
    const x0 = this.dataToViewX(kGrid[0]!);
    const y0 = this.dataToViewY(0);
    shape.moveTo(x0, y0);

    // Build points array
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < kGrid.length; i++) {
      const x = this.dataToViewX(kGrid[i]!);
      const y = this.dataToViewY(phiKSquared[i]!);
      points.push({ x, y });
    }

    // Draw smooth curve using quadratic bezier curves
    if (points.length > 0) {
      shape.lineTo(points[0]!.x, points[0]!.y);

      for (let i = 0; i < points.length - 1; i++) {
        const p0 = points[i]!;
        const p1 = points[i + 1]!;

        // Control point is midpoint for simple smoothing
        const cpX = (p0.x + p1.x) / 2;
        const cpY = (p0.y + p1.y) / 2;

        shape.quadraticCurveTo(cpX, cpY, p1.x, p1.y);
      }
    }

    // Close at zero on the right
    const xEnd = this.dataToViewX(kGrid[kGrid.length - 1]!);
    shape.lineTo(xEnd, y0);
    shape.close();

    this.wavenumberPath.shape = shape;
  }

  /**
   * Converts data X coordinate to view X coordinate using ChartTransform.
   */
  private dataToViewX(x: number): number {
    return this.chartMargins.left + this.chartTransform.modelToViewX(x);
  }

  /**
   * Converts data Y coordinate to view Y coordinate using ChartTransform.
   */
  private dataToViewY(y: number): number {
    return this.chartMargins.top + this.chartTransform.modelToViewY(y);
  }

  /**
   * Resets the chart to initial state.
   */
  public reset(): void {
    this.update();
  }
}
