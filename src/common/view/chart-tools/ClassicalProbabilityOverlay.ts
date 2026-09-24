/**
 * ClassicalProbabilityOverlay displays the classical probability distribution
 * and highlights the classically forbidden regions where quantum tunneling occurs.
 */

import { Shape } from "scenerystack/kite";
import { Line, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import stringManager from "../../../i18n/StringManager.js";
import QPPWColors from "../../../QPPWColors.js";
import { isSingleWellModel } from "../../model/ModelTypeGuards.js";
import type { BoundStateResult } from "../../model/PotentialFunction.js";
import QuantumConstants from "../../model/QuantumConstants.js";
import type { ScreenModel } from "../../model/ScreenModels.js";

export type ClassicalProbabilityOverlayOptions = {
  chartMargins: { left: number; right: number; top: number; bottom: number };
  plotWidth: number;
  plotHeight: number;
  chartWidth: number;
  dataToViewX: (x: number) => number;
  dataToViewY: (y: number) => number;
};

export class ClassicalProbabilityOverlay extends Node {
  private readonly model: ScreenModel;
  private readonly options: ClassicalProbabilityOverlayOptions;

  private readonly leftTurningPointLine: Line;
  private readonly rightTurningPointLine: Line;
  private readonly leftForbiddenBackground: Rectangle;
  private readonly rightForbiddenBackground: Rectangle;
  private readonly leftForbiddenRegion: Path;
  private readonly rightForbiddenRegion: Path;
  private readonly forbiddenProbabilityLabel: Text;
  private readonly classicalProbabilityPath: Path;

  constructor(model: ScreenModel, options: ClassicalProbabilityOverlayOptions) {
    super();

    this.model = model;
    this.options = options;

    // Create classical turning point lines
    this.leftTurningPointLine = new Line(0, 0, 0, 0, {
      stroke: QPPWColors.energyLevelSelectedProperty,
      lineWidth: 2,
      lineDash: [8, 4],
      visible: false,
    });
    this.addChild(this.leftTurningPointLine);

    this.rightTurningPointLine = new Line(0, 0, 0, 0, {
      stroke: QPPWColors.energyLevelSelectedProperty,
      lineWidth: 2,
      lineDash: [8, 4],
      visible: false,
    });
    this.addChild(this.rightTurningPointLine);

    // Create faint rectangular backgrounds for classically forbidden regions
    this.leftForbiddenBackground = new Rectangle(0, 0, 1, 1, {
      fill: QPPWColors.forbiddenRegionLightProperty,
      stroke: null,
      visible: false,
    });
    this.addChild(this.leftForbiddenBackground);

    this.rightForbiddenBackground = new Rectangle(0, 0, 1, 1, {
      fill: QPPWColors.forbiddenRegionLightProperty,
      stroke: null,
      visible: false,
    });
    this.addChild(this.rightForbiddenBackground);

    // Create classically forbidden regions (shaded areas that follow the classical probability curve)
    this.leftForbiddenRegion = new Path(null, {
      fill: QPPWColors.forbiddenRegionDarkProperty,
      stroke: null,
      visible: false,
    });
    this.addChild(this.leftForbiddenRegion);

    this.rightForbiddenRegion = new Path(null, {
      fill: QPPWColors.forbiddenRegionDarkProperty,
      stroke: null,
      visible: false,
    });
    this.addChild(this.rightForbiddenRegion);

    // Create forbidden probability label (appears on hover)
    this.forbiddenProbabilityLabel = new Text("", {
      font: new PhetFont(14),
      fill: QPPWColors.labelFillProperty,
      visible: false,
      centerX: options.chartWidth / 2,
      top: options.chartMargins.top + 30,
    });
    this.addChild(this.forbiddenProbabilityLabel);

    // Create classical probability path
    this.classicalProbabilityPath = new Path(null, {
      stroke: QPPWColors.classicalProbabilityProperty,
      lineWidth: 3,
      lineDash: [8, 4],
      visible: false,
    });
    this.addChild(this.classicalProbabilityPath);

    // Add hover listeners to forbidden regions to show probability percentage
    const showForbiddenProbability = () => {
      const selectedIndex = this.model.selectedEnergyLevelIndexProperty.value;
      if (isSingleWellModel(this.model) && selectedIndex >= 0) {
        const percentage = this.model.getClassicallyForbiddenProbability(selectedIndex);
        this.forbiddenProbabilityLabel.string = stringManager.classicallyForbiddenLabelStringProperty.value.replace(
          "{{percentage}}",
          percentage.toFixed(1),
        );
        this.forbiddenProbabilityLabel.visible = true;
      }
    };

    const hideForbiddenProbability = () => {
      this.forbiddenProbabilityLabel.visible = false;
    };

    // Add listeners to background rectangles
    this.leftForbiddenBackground.addInputListener({
      enter: showForbiddenProbability,
      exit: hideForbiddenProbability,
    });

    this.rightForbiddenBackground.addInputListener({
      enter: showForbiddenProbability,
      exit: hideForbiddenProbability,
    });

    // Add listeners to highlighted regions
    this.leftForbiddenRegion.addInputListener({
      enter: showForbiddenProbability,
      exit: hideForbiddenProbability,
    });

    this.rightForbiddenRegion.addInputListener({
      enter: showForbiddenProbability,
      exit: hideForbiddenProbability,
    });
  }

  /**
   * Hide all classical probability visualization elements
   */
  public hide(): void {
    this.leftTurningPointLine.visible = false;
    this.rightTurningPointLine.visible = false;
    this.leftForbiddenBackground.visible = false;
    this.rightForbiddenBackground.visible = false;
    this.leftForbiddenRegion.visible = false;
    this.rightForbiddenRegion.visible = false;
    this.classicalProbabilityPath.visible = false;
  }

  /**
   * Update the classical probability visualization
   */
  public update(
    boundStates: BoundStateResult,
    selectedIndex: number,
    showClassicalProbability: boolean,
    showClassicalProbabilityCurve: boolean = true, // Whether to show the curve (optional, defaults to true)
  ): void {
    const { chartMargins, plotWidth, plotHeight, dataToViewX, dataToViewY } = this.options;

    // Early return if conditions aren't met
    if (
      !(showClassicalProbability && isSingleWellModel(this.model)) ||
      selectedIndex < 0 ||
      selectedIndex >= boundStates.energies.length
    ) {
      this.hide();
      return;
    }

    // Get turning points
    const turningPoints = this.model.getClassicalTurningPoints(selectedIndex);
    if (!turningPoints) {
      this.hide();
      return;
    }

    // Draw vertical lines at turning points
    const xLeft = dataToViewX(turningPoints.left);
    const xRight = dataToViewX(turningPoints.right);
    const yTop = chartMargins.top;
    const yBottom = chartMargins.top + plotHeight;

    this.leftTurningPointLine.setLine(xLeft, yTop, xLeft, yBottom);
    this.leftTurningPointLine.visible = true;

    this.rightTurningPointLine.setLine(xRight, yTop, xRight, yBottom);
    this.rightTurningPointLine.visible = true;

    // Draw faint rectangular backgrounds for forbidden regions
    const leftRegionX = chartMargins.left;
    const leftRegionWidth = xLeft - leftRegionX;
    this.leftForbiddenBackground.setRect(leftRegionX, yTop, leftRegionWidth, plotHeight);
    this.leftForbiddenBackground.visible = true;

    const rightRegionX = xRight;
    const rightRegionWidth = chartMargins.left + plotWidth - xRight;
    this.rightForbiddenBackground.setRect(rightRegionX, yTop, rightRegionWidth, plotHeight);
    this.rightForbiddenBackground.visible = true;

    // Create and draw highlighted forbidden regions that follow the classical probability curve
    const shapes = this.createForbiddenRegionShapes(
      boundStates,
      turningPoints,
      selectedIndex,
      dataToViewX,
      dataToViewY,
    );

    this.leftForbiddenRegion.shape = shapes.leftShape;
    this.leftForbiddenRegion.visible = true;

    this.rightForbiddenRegion.shape = shapes.rightShape;
    this.rightForbiddenRegion.visible = true;

    // Update classical probability path (in nm^-1 units) - only if requested
    if (showClassicalProbabilityCurve) {
      const classicalProbability = this.model.getClassicalProbabilityDensityInNmUnits(selectedIndex);
      if (classicalProbability) {
        this.plotClassicalProbabilityDensity(boundStates.xGrid, classicalProbability, dataToViewX, dataToViewY);
        this.classicalProbabilityPath.visible = true;
      } else {
        this.classicalProbabilityPath.visible = false;
      }
    } else {
      this.classicalProbabilityPath.visible = false;
    }
  }

  /**
   * Plot classical probability density
   */
  private plotClassicalProbabilityDensity(
    xGrid: number[],
    classicalProbability: number[],
    dataToViewX: (x: number) => number,
    dataToViewY: (y: number) => number,
  ): void {
    const shape = new Shape();

    // Build points array, filtering out zero probability points
    const points: { x: number; y: number }[] = [];
    for (let i = 0; i < xGrid.length; i++) {
      const dataValue = classicalProbability[i]!;
      // Only include non-zero probability points
      if (dataValue > 0) {
        const x = dataToViewX(xGrid[i]! * QuantumConstants.M_TO_NM);
        const y = dataToViewY(dataValue);
        points.push({ x, y });
      }
    }

    // Draw curve - only connect consecutive non-zero points
    if (points.length > 0) {
      shape.moveTo(points[0]!.x, points[0]!.y);

      for (let i = 1; i < points.length; i++) {
        shape.lineTo(points[i]!.x, points[i]!.y);
      }
    }

    this.classicalProbabilityPath.shape = shape;
  }

  /**
   * Creates shapes that highlight the area under the classical probability curve
   * in the forbidden regions (left and right of turning points).
   */
  private createForbiddenRegionShapes(
    boundStates: BoundStateResult,
    turningPoints: { left: number; right: number },
    selectedIndex: number,
    dataToViewX: (x: number) => number,
    dataToViewY: (y: number) => number,
  ): { leftShape: Shape; rightShape: Shape } {
    const leftShape = new Shape();
    const rightShape = new Shape();
    const { chartMargins, plotWidth } = this.options;

    if (!boundStates) {
      return { leftShape, rightShape };
    }

    // Get classical probability density data (in nm^-1 units)
    const classicalProbability = this.model.getClassicalProbabilityDensityInNmUnits(selectedIndex);
    if (!classicalProbability) {
      return { leftShape, rightShape };
    }

    const xGrid = boundStates.xGrid;
    const y0 = dataToViewY(0); // Baseline

    // Build left forbidden region (from left edge to left turning point)
    const leftPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < xGrid.length; i++) {
      const xData = xGrid[i]! * QuantumConstants.M_TO_NM;

      if (xData <= turningPoints.left) {
        const x = dataToViewX(xData);
        const y = dataToViewY(classicalProbability[i]!);
        leftPoints.push({ x, y });
      }
    }

    if (leftPoints.length > 0) {
      const leftEdgeX = chartMargins.left;
      leftShape.moveTo(leftEdgeX, y0);
      leftShape.lineTo(leftEdgeX, leftPoints[0]!.y);

      for (const point of leftPoints) {
        leftShape.lineTo(point.x, point.y);
      }

      const lastPoint = leftPoints[leftPoints.length - 1]!;
      leftShape.lineTo(lastPoint.x, y0);
      leftShape.close();
    }

    // Build right forbidden region (from right turning point to right edge)
    const rightPoints: { x: number; y: number }[] = [];
    for (let i = 0; i < xGrid.length; i++) {
      const xData = xGrid[i]! * QuantumConstants.M_TO_NM;

      if (xData >= turningPoints.right) {
        const x = dataToViewX(xData);
        const y = dataToViewY(classicalProbability[i]!);
        rightPoints.push({ x, y });
      }
    }

    if (rightPoints.length > 0) {
      const firstPoint = rightPoints[0]!;
      rightShape.moveTo(firstPoint.x, y0);
      rightShape.lineTo(firstPoint.x, firstPoint.y);

      for (const point of rightPoints) {
        rightShape.lineTo(point.x, point.y);
      }

      const lastPoint = rightPoints[rightPoints.length - 1]!;
      const rightEdgeX = chartMargins.left + plotWidth;
      rightShape.lineTo(rightEdgeX, lastPoint.y);
      rightShape.lineTo(rightEdgeX, y0);
      rightShape.close();
    }

    return { leftShape, rightShape };
  }
}
