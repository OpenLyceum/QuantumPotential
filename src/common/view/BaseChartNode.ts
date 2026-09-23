/**
 * BaseChartNode provides common functionality for chart components.
 * Handles chart setup, coordinate transformations, and shared visual elements.
 */

import { NumberProperty } from "scenerystack/axon";
import { ChartRectangle, ChartTransform } from "scenerystack/bamboo";
import { Range } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import { Line, Node } from "scenerystack/scenery";
import QPPWColors from "../../QPPWColors.js";
import type { ScreenModel } from "../model/ScreenModels.js";
import type { ScreenViewState } from "./ScreenViewStates.js";

export type ChartMargins = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export type ChartOptions = {
  width?: number;
  height?: number;
  margins?: ChartMargins;
  xRange?: { min: number; max: number };
  yRange?: { min: number; max: number };
  showZeroLine?: boolean;
};

export abstract class BaseChartNode extends Node {
  protected readonly model: ScreenModel;
  protected readonly viewState: ScreenViewState;
  protected readonly chartWidth: number;
  protected readonly chartHeight: number;
  protected readonly chartMargins: ChartMargins;

  // Chart bounds in view coordinates
  protected readonly plotWidth: number;
  protected readonly plotHeight: number;

  // ChartTransform for model-to-view coordinate conversion
  protected readonly chartTransform: ChartTransform;

  // View range properties
  protected readonly xMinProperty: NumberProperty;
  protected readonly xMaxProperty: NumberProperty;
  protected readonly yMinProperty: NumberProperty;
  protected readonly yMaxProperty: NumberProperty;

  // Visual elements
  protected readonly backgroundRect: ChartRectangle;
  protected readonly plotContentNode: Node; // Clipped container for plot content
  protected readonly zeroLine: Line;
  protected axesNode!: Node;

  protected constructor(model: ScreenModel, viewState: ScreenViewState, options: ChartOptions = {}) {
    super();

    this.model = model;
    this.viewState = viewState;
    this.chartWidth = options.width ?? 600;
    this.chartHeight = options.height ?? 300;
    this.chartMargins = options.margins ?? {
      left: 60,
      right: 20,
      top: 40,
      bottom: 50,
    };

    this.plotWidth = this.chartWidth - this.chartMargins.left - this.chartMargins.right;
    this.plotHeight = this.chartHeight - this.chartMargins.top - this.chartMargins.bottom;

    // Initialize view range properties
    const xRange = options.xRange ?? { min: -4, max: 4 };
    const yRange = options.yRange ?? { min: -1, max: 1 };

    this.xMinProperty = new NumberProperty(xRange.min);
    this.xMaxProperty = new NumberProperty(xRange.max);
    this.yMinProperty = new NumberProperty(yRange.min);
    this.yMaxProperty = new NumberProperty(yRange.max);

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
      stroke: null,
      lineWidth: 1,
    });
    this.backgroundRect.x = this.chartMargins.left;
    this.backgroundRect.y = this.chartMargins.top;
    this.addChild(this.backgroundRect);

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

    if (options.showZeroLine !== false) {
      this.plotContentNode.addChild(this.zeroLine);
    }
  }

  /**
   * Update the ChartTransform when view ranges change
   */
  protected updateChartTransform(): void {
    this.chartTransform.setModelXRange(new Range(this.xMinProperty.value, this.xMaxProperty.value));
    this.chartTransform.setModelYRange(new Range(this.yMinProperty.value, this.yMaxProperty.value));
  }

  /**
   * Update the zero line position
   */
  protected updateZeroLine(): void {
    const y = this.yMinProperty.value;
    const yMax = this.yMaxProperty.value;

    // Only show zero line if zero is within the visible range
    if (y <= 0 && yMax >= 0) {
      const zeroY = this.dataToViewY(0);
      this.zeroLine.setLine(this.chartMargins.left, zeroY, this.chartMargins.left + this.plotWidth, zeroY);
      this.zeroLine.visible = true;
    } else {
      this.zeroLine.visible = false;
    }
  }

  /**
   * Convert model x-coordinate to view x-coordinate
   */
  protected dataToViewX(x: number): number {
    return (
      this.chartMargins.left +
      ((x - this.xMinProperty.value) / (this.xMaxProperty.value - this.xMinProperty.value)) * this.plotWidth
    );
  }

  /**
   * Convert model y-coordinate to view y-coordinate
   */
  protected dataToViewY(y: number): number {
    return (
      this.chartMargins.top +
      this.plotHeight -
      ((y - this.yMinProperty.value) / (this.yMaxProperty.value - this.yMinProperty.value)) * this.plotHeight
    );
  }

  /**
   * Convert view x-coordinate to model x-coordinate
   */
  protected viewToDataX(viewX: number): number {
    return (
      this.xMinProperty.value +
      ((viewX - this.chartMargins.left) / this.plotWidth) * (this.xMaxProperty.value - this.xMinProperty.value)
    );
  }

  /**
   * Convert view y-coordinate to model y-coordinate
   */
  protected viewToDataY(viewY: number): number {
    return (
      this.yMinProperty.value +
      ((this.chartMargins.top + this.plotHeight - viewY) / this.plotHeight) *
        (this.yMaxProperty.value - this.yMinProperty.value)
    );
  }

  /**
   * Clamp x-coordinate to the chart's x-axis range
   */
  protected clampX(x: number): number {
    return Math.max(this.xMinProperty.value, Math.min(this.xMaxProperty.value, x));
  }

  /**
   * Clamp y-coordinate to the chart's y-axis range
   */
  protected clampY(y: number): number {
    return Math.max(this.yMinProperty.value, Math.min(this.yMaxProperty.value, y));
  }

  /**
   * Abstract method to create axes - must be implemented by subclasses
   */
  protected abstract createAxes(): Node;

  /**
   * Abstract method to link to model properties - must be implemented by subclasses
   */
  protected abstract linkToModel(): void;

  /**
   * Abstract method to update the chart - must be implemented by subclasses
   */
  protected abstract update(): void;
}
