/**
 * CurvatureTool provides interactive visualization of the second derivative (curvature)
 * of the wavefunction at a specific point. Shows a parabola based on Taylor expansion.
 */

import { BooleanProperty, DerivedProperty, NumberProperty } from "scenerystack/axon";
import { Shape } from "scenerystack/kite";
import { StringUtils } from "scenerystack/phetcommon";
import { Circle, DragListener, KeyboardDragListener, Line, Node, Path, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { AriaLiveAnnouncer, Utterance, UtteranceQueue } from "scenerystack/utterance-queue";
import stringManager from "../../../i18n/StringManager.js";
import QPPWColors from "../../../QPPWColors.js";
import type { ScreenModel } from "../../model/ScreenModels.js";

// Create a global utteranceQueue instance for accessibility announcements
// Using AriaLiveAnnouncer for screen reader support via aria-live regions
const utteranceQueue = new UtteranceQueue(new AriaLiveAnnouncer());

export type CurvatureToolOptions = {
  chartMargins: { left: number; right: number; top: number; bottom: number };
  plotHeight: number;
  xMinProperty: NumberProperty;
  xMaxProperty: NumberProperty;
  dataToViewX: (x: number) => number;
  dataToViewY: (y: number) => number;
  viewToDataX: (x: number) => number;
  parentNode: Node; // Reference to parent chart node for coordinate conversions
};

const tools = stringManager.getA11yStrings().tools;

export class CurvatureTool extends Node {
  private readonly model: ScreenModel;
  private readonly options: CurvatureToolOptions;

  public readonly showProperty: BooleanProperty;
  private readonly markerXProperty: NumberProperty; // X position in nm

  private readonly container: Node;
  private readonly marker: Line;
  private readonly positionCircle: Circle; // Circle tracking wavefunction position
  private readonly parabola: Path;
  private readonly label: Text;

  // Cache for extrema positions to avoid recalculating on every drag event
  private extremaPositionsCache: number[] | null = null;
  private lastCachedEnergyLevel: number = -1;

  constructor(model: ScreenModel, getEffectiveDisplayMode: () => string, options: CurvatureToolOptions) {
    // Initialize properties first so they can be used in super()
    const showPropertyInternal = new BooleanProperty(false);

    super({
      // pdom - container for the curvature tool
      tagName: "div",
      labelTagName: "h3",
      labelContent: tools.curvatureHeadingStringProperty,
      descriptionTagName: "p",
      descriptionContent: new DerivedProperty(
        [showPropertyInternal, tools.curvatureDescriptionStringProperty, tools.curvatureDisabledStringProperty],
        (enabled, description, disabled) => (enabled ? description : disabled),
      ),
    });

    this.model = model;
    this.options = options;

    // Store properties
    this.showProperty = showPropertyInternal;
    this.markerXProperty = new NumberProperty(0);

    // Create container
    this.container = new Node({
      visible: false,
    });
    this.addChild(this.container);

    // Create marker line
    this.marker = new Line(0, 0, 0, 0, {
      stroke: QPPWColors.curvatureToolStrokeProperty,
      lineWidth: 2,
      lineDash: [4, 3],
      cursor: "ew-resize", // Make it clear the line is draggable

      // pdom - keyboard accessible marker
      tagName: "div",
      ariaRole: "slider",
      focusable: true,
      accessibleName: tools.curvatureMarkerStringProperty,
      labelContent: tools.curvatureMarkerLabelStringProperty,
      pdomAttributes: [
        { attribute: "aria-valuemin", value: -5 },
        { attribute: "aria-valuemax", value: 5 },
        {
          attribute: "aria-valuenow",
          value: this.markerXProperty.value.toFixed(2),
        },
        {
          attribute: "aria-valuetext",
          value: StringUtils.fillIn(tools.markerPositionPatternStringProperty, {
            position: this.markerXProperty.value.toFixed(2),
          }),
        },
      ],
      accessibleHelpText: new DerivedProperty(
        [tools.markerHelpStringProperty, tools.curvatureMarkerHelpStringProperty],
        (help, shows) => `${help} ${shows}`,
      ),
    });
    this.container.addChild(this.marker);

    // Update aria-valuetext when position changes
    this.markerXProperty.link((position) => {
      this.marker.setPDOMAttribute("aria-valuenow", position.toFixed(2));
      this.marker.setPDOMAttribute(
        "aria-valuetext",
        StringUtils.fillIn(tools.markerPositionPatternStringProperty, { position: position.toFixed(2) }),
      );
    });

    // Create position tracking circle (shows position on wavefunction)
    this.positionCircle = new Circle(5, {
      fill: QPPWColors.curvatureToolFillDarkProperty,
      stroke: QPPWColors.backgroundColorProperty,
      lineWidth: 2,
    });
    this.container.addChild(this.positionCircle);

    // Create parabola path
    this.parabola = new Path(null, {
      stroke: QPPWColors.curvatureToolFillLightProperty,
      lineWidth: 3,
      fill: null,
    });
    this.container.addChild(this.parabola);

    // Create curvature label
    this.label = new Text("", {
      font: new PhetFont({ size: 14, weight: "bold" }),
      fill: QPPWColors.curvatureToolFillDarkProperty,
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

    // Invalidate cache when model parameters change
    model.potentialTypeProperty.lazyLink(() => this.invalidateCache());
    model.wellWidthProperty.lazyLink(() => this.invalidateCache());
    model.wellDepthProperty.lazyLink(() => this.invalidateCache());
    model.particleMassProperty.lazyLink(() => this.invalidateCache());

    // Check for optional properties using type guards
    if ("wellOffsetProperty" in model) {
      (model as { wellOffsetProperty: NumberProperty }).wellOffsetProperty.lazyLink(() => this.invalidateCache());
    }
    if ("wellSeparationProperty" in model) {
      (model as { wellSeparationProperty: NumberProperty }).wellSeparationProperty.lazyLink(() =>
        this.invalidateCache(),
      );
    }
  }

  /**
   * Invalidates the extrema positions cache, forcing recalculation on next access.
   */
  private invalidateCache(): void {
    this.extremaPositionsCache = null;
    this.lastCachedEnergyLevel = -1;
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
        let dataX = viewToDataX(parentPoint.x);

        // Clamp to chart bounds
        dataX = Math.max(xMinProperty.value, Math.min(xMaxProperty.value, dataX));

        // Apply snapping to extrema (max/min values)
        const snappedX = this.snapToExtrema(dataX);
        this.markerXProperty.value = snappedX;
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
        // Announce position and curvature value on drag end
        const position = this.markerXProperty.value;
        const derivatives = this.calculateDerivatives(position, "waveFunction");

        if (derivatives !== null) {
          const message = StringUtils.fillIn(tools.curvatureReadoutPatternStringProperty, {
            position: position.toFixed(2),
            value: derivatives.secondDerivative.toFixed(3),
          });
          utteranceQueue.addToBack(new Utterance({ alert: message }));
        }
      },
    });

    this.marker.addInputListener(keyboardDragListener);
  }

  /**
   * Updates the curvature tool visualization.
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

    // Calculate and display derivatives
    const derivatives = this.calculateDerivatives(x, displayMode);

    if (derivatives !== null) {
      // Create parabola shape with first and second derivatives
      const parabolaShape = this.createCurvatureParabola(
        x,
        derivatives.firstDerivative,
        derivatives.secondDerivative,
        derivatives.wavefunctionValue,
      );
      this.parabola.shape = parabolaShape;

      // Update position tracking circle
      const { dataToViewY } = this.options;
      this.positionCircle.centerX = viewX;
      this.positionCircle.centerY = dataToViewY(derivatives.wavefunctionValue);

      // Update label with proper units (nm^-5/2)
      this.label.string = stringManager.secondDerivativeLabelStringProperty.value.replace(
        "{{value}}",
        derivatives.secondDerivative.toFixed(3),
      );
      this.label.centerX = viewX;
      this.label.top = yTop + 5; // Position just inside the chart area
    } else {
      this.parabola.shape = null;
      this.label.string = stringManager.notAvailableStringProperty.value;
    }
  }

  /**
   * Finds extrema (maxima and minima) positions in the wavefunction.
   * Returns an array of x-positions where the wavefunction has local extrema.
   * Uses caching to avoid recalculating on every drag event.
   */
  private findExtremaPositions(): number[] {
    const selectedIndex = this.model.selectedEnergyLevelIndexProperty.value;

    // Return cached result if energy level hasn't changed
    if (this.extremaPositionsCache !== null && this.lastCachedEnergyLevel === selectedIndex) {
      return this.extremaPositionsCache;
    }

    const { xMinProperty, xMaxProperty } = this.options;
    const xMin = xMinProperty.value;
    const xMax = xMaxProperty.value;

    // Use model's method to get extrema positions
    // selectedIndex is 0-based, but getWavefunctionMinMax expects quantum number (1-based)
    const result = this.model.getWavefunctionMinMax(
      selectedIndex + 1,
      xMin,
      xMax,
      200, // numPoints for sampling
    );

    const extremaPositions = result ? result.extremaPositions : [];

    // Cache the results
    this.extremaPositionsCache = extremaPositions;
    this.lastCachedEnergyLevel = selectedIndex;

    return extremaPositions;
  }

  /**
   * Snaps the x-position to nearby extrema if close enough.
   * @param x - The current x-position
   * @returns The snapped x-position or the original if no nearby extrema
   */
  private snapToExtrema(x: number): number {
    const extremaPositions = this.findExtremaPositions();
    const snapThreshold = 0.15; // Snap within 0.15 nm

    // Find the closest extremum
    let closestExtremum: number | null = null;
    let minDistance = Infinity;

    for (const extremumX of extremaPositions) {
      const distance = Math.abs(x - extremumX);
      if (distance < minDistance) {
        minDistance = distance;
        closestExtremum = extremumX;
      }
    }

    // Snap if within threshold
    if (closestExtremum !== null && minDistance < snapThreshold) {
      return closestExtremum;
    }

    return x;
  }

  /**
   * Calculates the first and second derivatives of the wavefunction at a given x position.
   */
  private calculateDerivatives(
    xData: number,
    displayMode: string,
  ): {
    firstDerivative: number;
    secondDerivative: number;
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
      secondDerivative: result.secondDerivative,
      wavefunctionValue: result.value,
    };
  }

  /**
   * Creates a parabola shape that matches the curvature at a point.
   * Uses Taylor expansion: y = y₀ + y'₀(x - x₀) + (1/2)y''₀(x - x₀)²
   */
  private createCurvatureParabola(
    xData: number,
    firstDerivative: number,
    secondDerivative: number,
    wavefunctionValue: number,
  ): Shape {
    const shape = new Shape();
    const { dataToViewX, dataToViewY } = this.options;

    // Create a small parabola centered at (xData, wavefunctionValue)
    const centerX = xData;
    const centerY = wavefunctionValue;

    // Width of parabola in nm (±0.3 nm from center)
    const parabolaHalfWidth = 0.3;

    const points: { x: number; y: number }[] = [];

    // Generate parabola points
    for (let dx = -parabolaHalfWidth; dx <= parabolaHalfWidth; dx += parabolaHalfWidth / 10) {
      const x = centerX + dx;
      // Taylor expansion with first and second derivative terms
      const y = centerY + firstDerivative * dx + 0.5 * secondDerivative * dx * dx;

      const viewX = dataToViewX(x);
      const viewY = dataToViewY(y);

      points.push({ x: viewX, y: viewY });
    }

    if (points.length > 0) {
      shape.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 1; i < points.length; i++) {
        shape.lineTo(points[i]!.x, points[i]!.y);
      }
    }

    return shape;
  }
}
