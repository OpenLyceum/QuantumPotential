/**
 * AreaMeasurementTool provides interactive area measurement functionality for charts.
 * Displays two draggable markers and calculates the probability between them.
 */

import { BooleanProperty, DerivedProperty, NumberProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Circle, DragListener, KeyboardDragListener, Line, Node, Path, Rectangle, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { AriaLiveAnnouncer, Utterance, UtteranceQueue } from "scenerystack/utterance-queue";
import stringManager from "../../../i18n/StringManager.js";
import QPPWColors from "../../../QPPWColors.js";
import { hasSuperpositionConfig } from "../../model/ModelTypeGuards.js";
import QuantumConstants from "../../model/QuantumConstants.js";
import type { ScreenModel } from "../../model/ScreenModels.js";
import { SuperpositionType } from "../../model/SuperpositionType.js";

// Create a global utteranceQueue instance for accessibility announcements
// Using AriaLiveAnnouncer for screen reader support via aria-live regions
const utteranceQueue = new UtteranceQueue(new AriaLiveAnnouncer());

export type AreaMeasurementToolOptions = {
  chartMargins: { left: number; right: number; top: number; bottom: number };
  plotWidth: number;
  plotHeight: number;
  xMinProperty: NumberProperty;
  xMaxProperty: NumberProperty;
  yMinProperty: NumberProperty;
  yMaxProperty: NumberProperty;
  dataToViewX: (x: number) => number;
  dataToViewY: (y: number) => number;
  viewToDataX: (x: number) => number;
  parentNode: Node; // Reference to parent chart node for coordinate conversions
};

export class AreaMeasurementTool extends Node {
  private readonly model: ScreenModel;
  private readonly options: AreaMeasurementToolOptions;

  public readonly showProperty: BooleanProperty;
  private readonly leftMarkerXProperty: NumberProperty; // X position in nm
  private readonly rightMarkerXProperty: NumberProperty; // X position in nm

  private readonly container: Node;
  private readonly areaBackgroundRegion: Rectangle;
  private readonly areaRegion: Path;
  private readonly leftMarker: Line;
  private readonly rightMarker: Line;
  private readonly leftMarkerHandle: Circle;
  private readonly rightMarkerHandle: Circle;
  private readonly areaLabel: Text;
  private readonly probabilityReadout: Node;
  private alertTimeout: number | null = null;

  constructor(model: ScreenModel, getEffectiveDisplayMode: () => string, options: AreaMeasurementToolOptions) {
    super({
      // pdom - container for the entire measurement tool
      tagName: "div",
      labelTagName: "h3",
      labelContent: "Area Measurement Tool",
      descriptionTagName: "p",
      descriptionContent:
        "Drag markers to measure probability between two positions. Use keyboard to fine-tune marker positions.",
    });

    this.model = model;
    this.options = options;

    // Initialize properties
    this.showProperty = new BooleanProperty(false);
    this.leftMarkerXProperty = new NumberProperty(-1);
    this.rightMarkerXProperty = new NumberProperty(1);

    // Create container
    this.container = new Node({
      visible: false,
    });
    this.addChild(this.container);

    // Create faint background rectangle showing the measurement region
    this.areaBackgroundRegion = new Rectangle(0, 0, 1, 1, {
      fill: QPPWColors.areaMeasurementLightProperty,
      stroke: null,
    });
    this.container.addChild(this.areaBackgroundRegion);

    // Create shaded region between markers (follows the curve)
    this.areaRegion = new Path(null, {
      fill: QPPWColors.areaMeasurementDarkProperty,
      stroke: null,
    });
    this.container.addChild(this.areaRegion);

    // Create left marker line
    this.leftMarker = new Line(0, 0, 0, 0, {
      stroke: QPPWColors.energyLevelSelectedProperty,
      lineWidth: 2,
      lineDash: [6, 4],
    });
    this.container.addChild(this.leftMarker);

    // Create right marker line
    this.rightMarker = new Line(0, 0, 0, 0, {
      stroke: QPPWColors.energyLevelSelectedProperty,
      lineWidth: 2,
      lineDash: [6, 4],
    });
    this.container.addChild(this.rightMarker);

    // Create left marker handle (draggable circle at top)
    this.leftMarkerHandle = new Circle(8, {
      fill: QPPWColors.energyLevelSelectedProperty,
      stroke: QPPWColors.backgroundColorProperty,
      lineWidth: 2,
      cursor: "ew-resize",

      // pdom - keyboard accessible marker
      tagName: "div",
      ariaRole: "slider",
      focusable: true,
      accessibleName: "Left Measurement Marker",
      labelContent: "Left boundary for probability integration",
      pdomAttributes: [
        { attribute: "aria-valuemin", value: -5 },
        { attribute: "aria-valuemax", value: 5 },
        {
          attribute: "aria-valuenow",
          value: this.leftMarkerXProperty.value.toFixed(2),
        },
        {
          attribute: "aria-valuetext",
          value: `Position: ${this.leftMarkerXProperty.value.toFixed(2)} nanometers`,
        },
      ],
      accessibleHelpText:
        "Use Left/Right arrow keys to move marker. " +
        "Shift+Arrow for fine control (0.01 nm steps). " +
        "Page Up/Down for large steps (0.5 nm). " +
        "Home/End for range limits.",
    });
    this.container.addChild(this.leftMarkerHandle);

    // Update aria-valuetext when left marker position changes
    this.leftMarkerXProperty.link((position) => {
      this.leftMarkerHandle.setPDOMAttribute("aria-valuenow", position.toFixed(2));
      this.leftMarkerHandle.setPDOMAttribute("aria-valuetext", `Position: ${position.toFixed(2)} nanometers`);
    });

    // Create right marker handle (draggable circle at top)
    this.rightMarkerHandle = new Circle(8, {
      fill: QPPWColors.energyLevelSelectedProperty,
      stroke: QPPWColors.backgroundColorProperty,
      lineWidth: 2,
      cursor: "ew-resize",

      // pdom - keyboard accessible marker
      tagName: "div",
      ariaRole: "slider",
      focusable: true,
      accessibleName: "Right Measurement Marker",
      labelContent: "Right boundary for probability integration",
      pdomAttributes: [
        { attribute: "aria-valuemin", value: -5 },
        { attribute: "aria-valuemax", value: 5 },
        {
          attribute: "aria-valuenow",
          value: this.rightMarkerXProperty.value.toFixed(2),
        },
        {
          attribute: "aria-valuetext",
          value: `Position: ${this.rightMarkerXProperty.value.toFixed(2)} nanometers`,
        },
      ],
      accessibleHelpText:
        "Use Left/Right arrow keys to move marker. " +
        "Shift+Arrow for fine control (0.01 nm steps). " +
        "Page Up/Down for large steps (0.5 nm). " +
        "Home/End for range limits.",
    });
    this.container.addChild(this.rightMarkerHandle);

    // Update aria-valuetext when right marker position changes
    this.rightMarkerXProperty.link((position) => {
      this.rightMarkerHandle.setPDOMAttribute("aria-valuenow", position.toFixed(2));
      this.rightMarkerHandle.setPDOMAttribute("aria-valuetext", `Position: ${position.toFixed(2)} nanometers`);
    });

    // Create area percentage label
    this.areaLabel = new Text("", {
      font: new PhetFont({ size: 16, weight: "bold" }),
      fill: QPPWColors.labelFillProperty,
      visible: false,
    });
    this.addChild(this.areaLabel);

    // Create accessible probability readout (live region)
    this.probabilityReadout = new Node({
      tagName: "div",
      ariaRole: "status",
      pdomAttributes: [{ attribute: "aria-live", value: "polite" }],
      innerContent: new DerivedProperty(
        [this.leftMarkerXProperty, this.rightMarkerXProperty, this.showProperty],
        (left, right, show) => {
          if (!show) {
            return "";
          }
          const displayMode = getEffectiveDisplayMode();
          const probability = this.calculateProbabilityInRegion(left, right, displayMode);
          if (probability !== null) {
            return `Measuring from ${left.toFixed(2)} to ${right.toFixed(2)} nanometers. Integrated probability: ${probability.toFixed(1)} percent.`;
          }
          return "";
        },
      ),
    });
    this.addChild(this.probabilityReadout);

    // Store display mode getter for use in keyboard drag listeners
    this.getDisplayMode = getEffectiveDisplayMode;

    // Setup drag listeners for markers
    this.setupDragListeners();

    // Link visibility to property
    this.showProperty.link((show: boolean) => {
      this.container.visible = show;
      this.areaLabel.visible = show;
      if (show) {
        this.update(this.getDisplayMode());
      }
    });

    // Update when marker positions change
    this.leftMarkerXProperty.link(() => {
      if (this.showProperty.value) {
        this.update(this.getDisplayMode());
      }
    });

    this.rightMarkerXProperty.link(() => {
      if (this.showProperty.value) {
        this.update(this.getDisplayMode());
      }
    });
  }

  /**
   * Setup drag listeners for marker handles (both mouse and keyboard)
   */
  private setupDragListeners(): void {
    const { parentNode, viewToDataX, xMinProperty, xMaxProperty } = this.options;

    // Left marker - mouse drag listener
    this.leftMarkerHandle.addInputListener(
      new DragListener({
        drag: (event) => {
          const parentPoint = parentNode.globalToLocalPoint(event.pointer.point);
          let newX = viewToDataX(parentPoint.x);

          // Constrain to chart bounds and ensure left marker stays left of right marker
          newX = Math.max(xMinProperty.value, newX);
          newX = Math.min(this.rightMarkerXProperty.value - 0.1, newX);

          this.leftMarkerXProperty.value = newX;
        },
      }),
    );

    // Left marker - keyboard drag listener
    this.leftMarkerHandle.addInputListener(
      new KeyboardDragListener({
        drag: (_event, listener) => {
          let newX = this.leftMarkerXProperty.value + listener.modelDelta.x * 0.1;

          // Constrain to chart bounds and ensure left marker stays left of right marker
          newX = Math.max(xMinProperty.value, newX);
          newX = Math.min(this.rightMarkerXProperty.value - 0.1, newX);

          this.leftMarkerXProperty.value = newX;
        },
        dragDelta: 1, // Regular arrow key step
        shiftDragDelta: 0.1, // Fine control with shift
        end: () => {
          // Announce position on drag end
          const position = this.leftMarkerXProperty.value;
          const displayMode = this.getDisplayMode();
          const probability = this.calculateProbabilityInRegion(
            this.leftMarkerXProperty.value,
            this.rightMarkerXProperty.value,
            displayMode,
          );

          if (this.alertTimeout) {
            clearTimeout(this.alertTimeout);
          }

          this.alertTimeout = setTimeout(() => {
            let message = `Left marker at ${position.toFixed(2)} nanometers.`;
            if (probability !== null) {
              message += ` Integrated probability: ${(probability * 100).toFixed(1)} percent.`;
            }
            utteranceQueue.addToBack(new Utterance({ alert: message }));
            this.alertTimeout = null;
          }, 500) as unknown as number;
        },
      }),
    );

    // Right marker - mouse drag listener
    this.rightMarkerHandle.addInputListener(
      new DragListener({
        drag: (event) => {
          const parentPoint = parentNode.globalToLocalPoint(event.pointer.point);
          let newX = viewToDataX(parentPoint.x);

          // Constrain to chart bounds and ensure right marker stays right of left marker
          newX = Math.min(xMaxProperty.value, newX);
          newX = Math.max(this.leftMarkerXProperty.value + 0.1, newX);

          this.rightMarkerXProperty.value = newX;
        },
      }),
    );

    // Right marker - keyboard drag listener
    this.rightMarkerHandle.addInputListener(
      new KeyboardDragListener({
        drag: (_event, listener) => {
          let newX = this.rightMarkerXProperty.value + listener.modelDelta.x * 0.1;

          // Constrain to chart bounds and ensure right marker stays right of left marker
          newX = Math.min(xMaxProperty.value, newX);
          newX = Math.max(this.leftMarkerXProperty.value + 0.1, newX);

          this.rightMarkerXProperty.value = newX;
        },
        dragDelta: 1, // Regular arrow key step
        shiftDragDelta: 0.1, // Fine control with shift
        end: () => {
          // Announce position on drag end
          const position = this.rightMarkerXProperty.value;
          const displayMode = this.getDisplayMode();
          const probability = this.calculateProbabilityInRegion(
            this.leftMarkerXProperty.value,
            this.rightMarkerXProperty.value,
            displayMode,
          );

          if (this.alertTimeout) {
            clearTimeout(this.alertTimeout);
          }

          this.alertTimeout = setTimeout(() => {
            let message = `Right marker at ${position.toFixed(2)} nanometers.`;
            if (probability !== null) {
              message += ` Integrated probability: ${(probability * 100).toFixed(1)} percent.`;
            }
            utteranceQueue.addToBack(new Utterance({ alert: message }));
            this.alertTimeout = null;
          }, 500) as unknown as number;
        },
      }),
    );
  }

  private getDisplayMode: () => string = () => "probabilityDensity";

  /**
   * Updates the area measurement tool visualization and calculates the probability.
   */
  public update(displayMode: string): void {
    if (!this.showProperty.value) {
      return;
    }

    const { chartMargins, plotHeight, dataToViewX, dataToViewY } = this.options;
    const leftX = this.leftMarkerXProperty.value;
    const rightX = this.rightMarkerXProperty.value;

    // Convert to view coordinates
    const leftViewX = dataToViewX(leftX);
    const rightViewX = dataToViewX(rightX);
    const yTop = chartMargins.top;
    const yBottom = chartMargins.top + plotHeight;

    // Update marker lines
    this.leftMarker.setLine(leftViewX, yTop, leftViewX, yBottom);
    this.rightMarker.setLine(rightViewX, yTop, rightViewX, yBottom);

    // Update marker handles (circles at top)
    this.leftMarkerHandle.centerX = leftViewX;
    this.leftMarkerHandle.centerY = yTop + 15;

    this.rightMarkerHandle.centerX = rightViewX;
    this.rightMarkerHandle.centerY = yTop + 15;

    // Update faint background rectangle (shows full measurement region)
    this.areaBackgroundRegion.setRect(leftViewX, yTop, rightViewX - leftViewX, plotHeight);

    // Create shape that follows the probability density curve
    const shape = this.createAreaShape(leftX, rightX, displayMode, dataToViewX, dataToViewY);
    this.areaRegion.shape = shape;

    // Calculate probability in the selected region
    const probability = this.calculateProbabilityInRegion(leftX, rightX, displayMode);

    // Update label
    if (probability !== null) {
      this.areaLabel.string = stringManager.percentageValueStringProperty.value.replace(
        "{{value}}",
        probability.toFixed(1),
      );
      // Position label at the center between markers, near the top
      this.areaLabel.centerX = (leftViewX + rightViewX) / 2;
      this.areaLabel.top = chartMargins.top + 35;
    } else {
      this.areaLabel.string = stringManager.notAvailableStringProperty.value;
    }
  }

  /**
   * Creates a shape that highlights the area under the probability density curve
   * between the two markers.
   */
  private createAreaShape(
    xStart: number,
    xEnd: number,
    displayMode: string,
    dataToViewX: (x: number) => number,
    dataToViewY: (y: number) => number,
  ): Shape {
    const shape = new Shape();

    const boundStates = this.model.getBoundStates();
    if (!boundStates) {
      return shape; // Return empty shape
    }

    // Only show area for probability density mode
    if (displayMode !== "probabilityDensity") {
      return shape; // Return empty shape
    }

    // Get probability density data (in nm^-1 units)
    const superpositionType = this.model.superpositionTypeProperty.value;
    const isSuperposition = superpositionType !== SuperpositionType.SINGLE;

    let probabilityDensity: number[];

    if (isSuperposition && hasSuperpositionConfig(this.model)) {
      // Get superposition probability density in nm units
      const time = this.model.timeProperty.value * 1e-15; // Convert fs to seconds
      const nmData = this.model.getTimeEvolvedSuperpositionInNmUnits(time);
      if (!nmData) {
        return shape; // Return empty shape
      }
      probabilityDensity = nmData.probabilityDensity;
    } else {
      // Single eigenstate - get probability density in nm units
      const selectedIndex = this.model.selectedEnergyLevelIndexProperty.value;
      if (selectedIndex < 0 || selectedIndex >= boundStates.wavefunctions.length) {
        return shape; // Return empty shape
      }

      const nmData = this.model.getWavefunctionInNmUnits(selectedIndex + 1);
      if (!nmData) {
        return shape; // Return empty shape
      }
      probabilityDensity = nmData.probabilityDensity;
    }

    // Build points array for the region
    const xGrid = boundStates.xGrid;
    const points: { x: number; y: number }[] = [];

    // Get the y-coordinate for y=0 (baseline)
    const y0 = dataToViewY(0);

    // Add points within the region
    for (let i = 0; i < xGrid.length; i++) {
      const xData = xGrid[i]! * QuantumConstants.M_TO_NM; // Convert to nm

      if (xData >= xStart && xData <= xEnd) {
        const x = dataToViewX(xData);
        const y = dataToViewY(probabilityDensity[i]!);
        points.push({ x, y });
      }
    }

    if (points.length === 0) {
      return shape; // Return empty shape if no points in region
    }

    // Create the shape: start at baseline on left, trace curve, return to baseline on right
    const leftViewX = dataToViewX(xStart);
    const rightViewX = dataToViewX(xEnd);

    // Start at bottom-left (baseline at left marker)
    shape.moveTo(leftViewX, y0);

    // Draw line up to the first point's y-coordinate
    shape.lineTo(leftViewX, points[0]!.y);

    // Trace along the curve
    for (let i = 0; i < points.length; i++) {
      shape.lineTo(points[i]!.x, points[i]!.y);
    }

    // Draw line down from last point to baseline
    shape.lineTo(rightViewX, points[points.length - 1]!.y);
    shape.lineTo(rightViewX, y0);

    // Close the shape back to starting point
    shape.close();

    return shape;
  }

  /**
   * Calculates the probability (area under the curve) in the specified region.
   * Uses trapezoidal integration of the probability density.
   */
  private calculateProbabilityInRegion(xStart: number, xEnd: number, displayMode: string): number | null {
    // Only calculate for probability density mode
    if (displayMode !== "probabilityDensity") {
      return null;
    }

    // Check if we're displaying a superposition or a single eigenstate
    const superpositionType = this.model.superpositionTypeProperty.value;
    const isSuperposition = superpositionType !== SuperpositionType.SINGLE;

    const selectedIndex = this.model.selectedEnergyLevelIndexProperty.value;
    const time = this.model.timeProperty.value * 1e-15; // Convert fs to seconds

    // Use model's calculation method
    return this.model.getProbabilityInRegion(xStart, xEnd, selectedIndex, time, isSuperposition);
  }
}
