/**
 * DerivativeTool provides interactive visualization of the first derivative (slope)
 * of the wavefunction at a specific point. Shows a tangent line.
 */

import { BooleanProperty, DerivedProperty, NumberProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { Circle, DragListener, KeyboardDragListener, Line, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { AriaLiveAnnouncer, Utterance, UtteranceQueue } from "scenerystack/utterance-queue";
import stringManager from "../../../i18n/StringManager.js";
import QPPWColors from "../../../QPPWColors.js";
import type { ScreenModel } from "../../model/ScreenModels.js";

// Create a global utteranceQueue instance for accessibility announcements
// Using AriaLiveAnnouncer for screen reader support via aria-live regions
const utteranceQueue = new UtteranceQueue(new AriaLiveAnnouncer());

export type DerivativeToolOptions = {
  chartMargins: { left: number; right: number; top: number; bottom: number };
  plotHeight: number;
  xMinProperty: NumberProperty;
  xMaxProperty: NumberProperty;
  dataToViewX: (x: number) => number;
  dataToViewY: (y: number) => number;
  viewToDataX: (x: number) => number;
  parentNode: Node; // Reference to parent chart node for coordinate conversions
};

export class DerivativeTool extends Node {
  private readonly model: ScreenModel;
  private readonly options: DerivativeToolOptions;

  public readonly showProperty: BooleanProperty;
  private readonly markerXProperty: NumberProperty; // X position in nm

  private readonly container: Node;
  private readonly marker: Line;
  private readonly positionCircle: Circle; // Circle tracking wavefunction position
  private readonly tangentLine: Path;
  private readonly label: Text;

  constructor(model: ScreenModel, getEffectiveDisplayMode: () => string, options: DerivativeToolOptions) {
    // Initialize properties first so they can be used in super()
    const showPropertyInternal = new BooleanProperty(false);

    super({
      // pdom - container for the derivative tool
      tagName: "div",
      labelTagName: "h3",
      labelContent: "Derivative Visualization",
      descriptionTagName: "p",
      descriptionContent: new DerivedProperty([showPropertyInternal], (enabled) =>
        enabled
          ? "Showing first derivative dψ/dx (slope) of the wavefunction. " +
            "The tangent line shows the rate of change at the selected position."
          : "Derivative visualization disabled.",
      ),
    });

    this.model = model;
    this.options = options;

    // Store properties
    this.showProperty = showPropertyInternal;
    this.markerXProperty = new NumberProperty(1);

    // Create container
    this.container = new Node({
      visible: false,
    });
    this.addChild(this.container);

    // Create marker line
    this.marker = new Line(0, 0, 0, 0, {
      stroke: QPPWColors.derivativeToolStrokeProperty,
      lineWidth: 2,
      lineDash: [4, 3],
      cursor: "ew-resize", // Make it clear the line is draggable

      // pdom - keyboard accessible marker
      tagName: "div",
      ariaRole: "slider",
      focusable: true,
      accessibleName: "Derivative Measurement Position",
      labelContent: "Position for derivative and slope display",
      pdomAttributes: [
        { attribute: "aria-valuemin", value: -5 },
        { attribute: "aria-valuemax", value: 5 },
        {
          attribute: "aria-valuenow",
          value: this.markerXProperty.value.toFixed(2),
        },
        {
          attribute: "aria-valuetext",
          value: `Position: ${this.markerXProperty.value.toFixed(2)} nanometers`,
        },
      ],
      accessibleHelpText:
        "Use Left/Right arrow keys to move marker. " +
        "Shift+Arrow for fine control. " +
        "Page Up/Down for large steps. " +
        "Shows first derivative (slope) at selected position.",
    });
    this.container.addChild(this.marker);

    // Update aria-valuetext when position changes
    this.markerXProperty.link((position) => {
      this.marker.setPDOMAttribute("aria-valuenow", position.toFixed(2));
      this.marker.setPDOMAttribute("aria-valuetext", `Position: ${position.toFixed(2)} nanometers`);
    });

    // Create position tracking circle (shows position on wavefunction)
    this.positionCircle = new Circle(5, {
      fill: QPPWColors.derivativeToolFillDarkProperty,
      stroke: QPPWColors.backgroundColorProperty,
      lineWidth: 2,
    });
    this.container.addChild(this.positionCircle);

    // Create tangent line path
    this.tangentLine = new Path(null, {
      stroke: QPPWColors.derivativeToolFillLightProperty,
      lineWidth: 3,
      fill: null,
    });
    this.container.addChild(this.tangentLine);

    // Create derivative label
    this.label = new Text("", {
      font: new PhetFont({ size: 14, weight: "bold" }),
      fill: QPPWColors.derivativeToolFillDarkProperty,
    });
    this.container.addChild(this.label);

    // Setup drag listener for marker
    this.setupDragListener();

    // Store display mode getter
    const getDisplayMode = getEffectiveDisplayMode;

    // Link visibility to property
    this.showProperty.link((show: boolean) => {
      this.container.visible = show;
      if (show) {
        this.update(getDisplayMode());
      }
    });

    // Update when marker position changes
    this.markerXProperty.link(() => {
      if (this.showProperty.value) {
        this.update(getDisplayMode());
      }
    });
  }

  /**
   * Setup drag listeners for marker handle (both mouse and keyboard)
   */
  private setupDragListener(): void {
    const { parentNode, viewToDataX, xMinProperty, xMaxProperty } = this.options;

    // Mouse drag listener
    const dragListener = new DragListener({
      drag: (event) => {
        // Convert to parent coordinate system (where dataToView/viewToData transforms are defined)
        const parentPoint = parentNode.globalToLocalPoint(event.pointer.point);
        const dataX = viewToDataX(parentPoint.x);

        // Clamp to chart bounds
        const clampedX = Math.max(xMinProperty.value, Math.min(xMaxProperty.value, dataX));
        this.markerXProperty.value = clampedX;
      },
    });

    this.marker.addInputListener(dragListener);

    // Keyboard drag listener
    const keyboardDragListener = new KeyboardDragListener({
      drag: (_event, listener) => {
        let newX = this.markerXProperty.value + listener.modelDelta.x * 0.1;

        // Clamp to chart bounds
        newX = Math.max(xMinProperty.value, Math.min(xMaxProperty.value, newX));

        this.markerXProperty.value = newX;
      },
      dragDelta: 1, // Regular arrow key step
      shiftDragDelta: 0.1, // Fine control with shift
      end: () => {
        // Announce position and derivative value on drag end
        const position = this.markerXProperty.value;
        const derivativeData = this.calculateFirstDerivative(position, "waveFunction");

        if (derivativeData !== null) {
          const message =
            `Marker at ${position.toFixed(2)} nanometers. ` +
            `First derivative: ${derivativeData.firstDerivative.toFixed(3)}.`;
          utteranceQueue.addToBack(new Utterance({ alert: message }));
        }
      },
    });

    this.marker.addInputListener(keyboardDragListener);
  }

  /**
   * Updates the derivative tool visualization.
   */
  public update(displayMode: string): void {
    if (!this.showProperty.value) {
      return;
    }

    const { chartMargins, plotHeight, dataToViewX } = this.options;
    const x = this.markerXProperty.value;
    const viewX = dataToViewX(x);
    const yTop = chartMargins.top;
    const yBottom = chartMargins.top + plotHeight;

    // Update marker line
    this.marker.setLine(viewX, yTop, viewX, yBottom);

    // Calculate and display first derivative
    const derivativeData = this.calculateFirstDerivative(x, displayMode);

    if (derivativeData !== null) {
      // Create tangent line shape with first derivative
      const tangentLineShape = this.createTangentLine(
        x,
        derivativeData.firstDerivative,
        derivativeData.wavefunctionValue,
      );
      this.tangentLine.shape = tangentLineShape;

      // Update position tracking circle
      const { dataToViewY } = this.options;
      this.positionCircle.centerX = viewX;
      this.positionCircle.centerY = dataToViewY(derivativeData.wavefunctionValue);

      // Update label with proper units (nm^-3/2)
      this.label.string = stringManager.firstDerivativeLabelStringProperty.value.replace(
        "{{value}}",
        derivativeData.firstDerivative.toFixed(3),
      );
      this.label.centerX = viewX;
      this.label.top = yTop + 5; // Position just inside the chart area
    } else {
      this.tangentLine.shape = null;
      this.label.string = stringManager.notAvailableStringProperty.value;
    }
  }

  /**
   * Calculates the first derivative of the wavefunction at a given x position.
   */
  private calculateFirstDerivative(
    xData: number,
    displayMode: string,
  ): {
    firstDerivative: number;
    wavefunctionValue: number;
  } | null {
    // Only calculate for wavefunction mode
    if (displayMode !== "waveFunction") {
      return null;
    }

    const selectedIndex = this.model.selectedEnergyLevelIndexProperty.value;

    // Use model's calculation method
    const result = this.model.getWavefunctionAtPosition(selectedIndex, xData);
    if (!result) {
      return null;
    }

    return {
      firstDerivative: result.firstDerivative,
      wavefunctionValue: result.value,
    };
  }

  /**
   * Creates a tangent line shape that shows the slope at a point.
   * Uses the linear approximation: y = y₀ + y'₀(x - x₀)
   */
  private createTangentLine(xData: number, firstDerivative: number, wavefunctionValue: number): Shape {
    const shape = new Shape();
    const { dataToViewX, dataToViewY } = this.options;

    // Create a tangent line centered at (xData, wavefunctionValue)
    const centerX = xData;
    const centerY = wavefunctionValue;

    // Width of tangent line in nm (±0.5 nm from center)
    const tangentHalfWidth = 0.5;

    // Calculate endpoints of the tangent line
    const x1 = centerX - tangentHalfWidth;
    const y1 = centerY + firstDerivative * -tangentHalfWidth;
    const x2 = centerX + tangentHalfWidth;
    const y2 = centerY + firstDerivative * tangentHalfWidth;

    // Convert to view coordinates
    const viewX1 = dataToViewX(x1);
    const viewY1 = dataToViewY(y1);
    const viewX2 = dataToViewX(x2);
    const viewY2 = dataToViewY(y2);

    // Draw the tangent line
    shape.moveTo(viewX1, viewY1);
    shape.lineTo(viewX2, viewY2);

    return shape;
  }
}
