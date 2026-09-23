/**
 * EnergyChartNode displays the potential energy landscape and energy levels.
 * This is the top chart in the One Well screen.
 */

import { DerivedProperty } from "scenerystack/axon";
import { AxisLine, TickLabelSet, TickMarkSet } from "scenerystack/bamboo";
import { Range, Vector2 } from "scenerystack/dot";
import { localeProperty } from "scenerystack/joist";
import { Shape } from "scenerystack/kite";
import { Orientation } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { HBox, Line, Node, Path, Rectangle, RichText, type SceneryEvent, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox, Panel } from "scenerystack/sun";
import stringManager from "../../i18n/StringManager.js";
import QPPWColors from "../../QPPWColors.js";
import {
  hasBarrierHeight,
  hasClassicalTurningPoints,
  hasElectricField,
  hasPotentialOffset,
  hasWellSeparation,
  isManyWellsModel,
} from "../model/ModelTypeGuards.js";
import { type BoundStateResult, PotentialType } from "../model/PotentialFunction.js";
import QuantumConstants from "../model/QuantumConstants.js";
import type { ScreenModel } from "../model/ScreenModels.js";
import { PANEL_CHECKBOX_OPTIONS } from "../QPPWControlOptions.js";
import isDevMode from "../utils/isDevMode.js";
import { QPPWDescriber } from "./accessibility/QPPWDescriber.js";
import { BaseChartNode, type ChartOptions } from "./BaseChartNode.js";
import { createConfigurePotentialButton } from "./ConfigurePotentialDialog.js";
import { getEnergyLevelDecimalPlaces } from "./EnergyLevelPrecision.js";
import { PotentialHandlesLayer } from "./handles/PotentialHandlesLayer.js";
import type { ScreenViewState } from "./ScreenViewStates.js";

// Chart axis range constants
const X_AXIS_RANGE_NM = 4; // X-axis extends from -X_AXIS_RANGE_NM to +X_AXIS_RANGE_NM

// Energy axis ranges depend on potential type
// For potentials with V=0 at center (e.g., Harmonic Oscillator, Infinite Well): -5 to 15 eV
// For potentials with V=0 at infinity (e.g., Finite Well, Coulomb): -15 to 5 eV
// For Asymmetric Triangle: -5 to 15 eV (special case with shifted potential)
function getEnergyAxisRange(potentialType: PotentialType): {
  min: number;
  max: number;
} {
  switch (potentialType) {
    case PotentialType.HARMONIC_OSCILLATOR:
      // V=0 at center, grows outward
      return { min: -5, max: 15 };
    case PotentialType.ASYMMETRIC_TRIANGLE:
      // Special case: V=10eV at infinity, V=0 at x=0
      return { min: -5, max: 15 };
    case PotentialType.TRIANGULAR:
      // Triangular well: offset can be -5 to 15 eV, height adds to that
      return { min: -5, max: 15 };
    case PotentialType.INFINITE_WELL:
      // V=0 inside well (centered at x=0), V=∞ outside (displayed as 15 eV)
      return { min: -5, max: 15 };
    case PotentialType.DOUBLE_SQUARE_WELL:
      // Double square well with barrier between wells
      // Energy reference: V=0 in wells, V=wellDepth in barrier
      // Bound states have positive energies (between 0 and wellDepth)
      return { min: 0, max: 20 };
    case PotentialType.MULTI_SQUARE_WELL:
      // Multi-square well (generalization of double square well)
      // Energy reference: V=0 in wells, V=wellDepth in barrier
      return { min: -5, max: 15 };
    case PotentialType.MULTI_COULOMB_1D:
      // Multi-Coulomb 1D potential with V=0 at infinity
      return { min: -15, max: 5 };
    case PotentialType.DOUBLE_POSCHL_TELLER:
    case PotentialType.MULTI_POSCHL_TELLER:
      return { min: -20, max: 5 };
    case PotentialType.MORSE:
      // Morse potential: V=0 at dissociation limit (infinity), V=-De at bottom
      return { min: -15, max: 5 };
    case PotentialType.ECKART:
      // The shallow Eckart dip and its higher left plateau fit this smaller window.
      return { min: -5, max: 5 };
    case PotentialType.FINITE_WELL:
    case PotentialType.POSCHL_TELLER:
    case PotentialType.ROSEN_MORSE:
    case PotentialType.COULOMB_1D:
    case PotentialType.CUSTOM:
    default:
      // V=0 at infinity (wells with negative energy states)
      return { min: -15, max: 5 };
  }
}

const a11y = stringManager.getA11yStrings();

/** Samples used to draw the potential; enough that step potentials have near-vertical walls. */
const POTENTIAL_CURVE_SAMPLES = 1200;

/** Farthest (view px) the pointer can be from a level and still hover or select it. */
const LEVEL_PICK_DISTANCE = 12;

export class EnergyChartNode extends BaseChartNode {
  // Visual elements specific to energy chart
  private readonly potentialPath: Path;
  private readonly energyLevelNodes: Map<number, Line>;
  // "Eₙ = … eV" readouts for the selected and the hovered level, drawn inside the plot above their lines
  private readonly selectedLevelLabel: RichText;
  private readonly hoveredLevelLabel: RichText;
  private readonly selectedLevelPanel: Panel;
  private readonly hoveredLevelPanel: Panel;

  // Transparent layer over the plot that picks the level nearest the pointer (as in Quantum Bound States),
  // so closely spaced levels in a band can still be hovered and selected one by one
  private readonly levelPickerRectangle: Rectangle;

  // View y of each drawn level, for picking
  private levelViewYs: number[] = [];
  // Selectable hit areas over each level, with the aria-checked listener each one links to the model
  private readonly energyLevelHitAreas: Array<{ hitArea: Rectangle; listener: () => void }> = [];
  private readonly totalEnergyLine: Line;
  private readonly legendNode: Node;
  public readonly potentialHandlesLayer: PotentialHandlesLayer;

  // Classical turning point lines
  private readonly leftTurningPointLine: Line;
  private readonly rightTurningPointLine: Line;

  // Hover state
  private hoveredEnergyLevelIndex: number | null = null;

  // Whether the chart below supplies the position axis (QBS-style layout): no x labels here, legend on top
  private readonly sharedXAxis: boolean;

  public constructor(
    model: ScreenModel,
    viewState: ScreenViewState,
    options?: { width?: number; height?: number; sharedXAxis?: boolean },
  ) {
    // Initialize view range with values based on initial potential type
    const initialEnergyRange = getEnergyAxisRange(model.potentialTypeProperty.value);
    const sharedXAxis = options?.sharedXAxis ?? false;

    // Call super constructor with chart options
    const chartOptions: ChartOptions = {
      width: options?.width ?? 600,
      height: options?.height ?? 300,
      margins: { left: 60, right: 20, top: sharedXAxis ? 30 : 40, bottom: sharedXAxis ? 6 : 50 },
      xRange: { min: -X_AXIS_RANGE_NM, max: X_AXIS_RANGE_NM },
      yRange: { min: initialEnergyRange.min, max: initialEnergyRange.max },
      showZeroLine: true,
    };

    super(model, viewState, chartOptions);
    this.sharedXAxis = sharedXAxis;

    // PDOM - make energy chart accessible with dynamic description
    this.tagName = "div";
    this.labelTagName = "h3";
    this.labelContent = a11y.energyChart.headingStringProperty;
    this.descriptionTagName = "p";
    this.descriptionContent = new DerivedProperty(
      [
        model.potentialTypeProperty,
        model.wellWidthProperty,
        model.wellDepthProperty,
        model.selectedEnergyLevelIndexProperty,
        localeProperty, // rebuild the sentences on a language change
      ],
      (potentialType: PotentialType, width: number, depth: number, selectedIndex: number) => {
        return this.createEnergyChartDescription(potentialType, width, depth, selectedIndex);
      },
    );

    // Reconfigure zero line with energy chart specific styling
    this.zeroLine.stroke = QPPWColors.potentialBarrierProperty;
    this.zeroLine.lineWidth = 1;
    this.zeroLine.lineDash = [5, 5];

    // Create axes
    this.axesNode = this.createAxes();
    this.addChild(this.axesNode);

    // Create potential energy path
    this.potentialPath = new Path(null, {
      stroke: QPPWColors.potentialWellProperty,
      lineWidth: 3,
    });
    this.plotContentNode.addChild(this.potentialPath);

    // Create energy level lines and labels containers
    this.energyLevelNodes = new Map();
    const levelLabelOptions = { font: new PhetFont({ size: 12, weight: "bold" }), maxWidth: 200 };
    this.selectedLevelLabel = new RichText("", { ...levelLabelOptions, fill: QPPWColors.energyLevelSelectedProperty });
    this.hoveredLevelLabel = new RichText("", { ...levelLabelOptions, fill: QPPWColors.labelFillProperty });
    const levelPanelOptions = {
      fill: QPPWColors.controlPanelBackgroundColorProperty,
      stroke: QPPWColors.controlPanelStrokeColorProperty,
      cornerRadius: 3,
      xMargin: 6,
      yMargin: 2,
      pickable: false,
    };
    this.selectedLevelPanel = new Panel(this.selectedLevelLabel, levelPanelOptions);
    this.hoveredLevelPanel = new Panel(this.hoveredLevelLabel, levelPanelOptions);

    this.levelPickerRectangle = new Rectangle(
      this.chartMargins.left,
      this.chartMargins.top,
      this.plotWidth,
      this.plotHeight,
      { fill: "transparent" },
    );
    this.levelPickerRectangle.addInputListener({
      move: (event) => this.setHoveredLevel(this.getNearestLevelIndex(event)),
      enter: (event) => this.setHoveredLevel(this.getNearestLevelIndex(event)),
      exit: () => this.setHoveredLevel(null),
      down: (event) => {
        const index = this.getNearestLevelIndex(event);
        if (index !== null) {
          this.model.selectedEnergyLevelIndexProperty.value = index;
        }
      },
    });
    // Keep the picker above plotted lines and axes, as QBS does with its chart rectangle.
    this.addChild(this.levelPickerRectangle);

    // Create total energy line
    this.totalEnergyLine = new Line(0, 0, 0, 0, {
      stroke: QPPWColors.energyLevelProperty,
      lineWidth: 2,
      lineDash: [10, 5],
    });
    this.plotContentNode.addChild(this.totalEnergyLine);

    // Create classical turning point lines
    this.leftTurningPointLine = new Line(0, 0, 0, 0, {
      stroke: QPPWColors.energyLevelSelectedProperty,
      lineWidth: 2,
      lineDash: [8, 4],
      visible: false,
    });
    this.plotContentNode.addChild(this.leftTurningPointLine);

    this.rightTurningPointLine = new Line(0, 0, 0, 0, {
      stroke: QPPWColors.energyLevelSelectedProperty,
      lineWidth: 2,
      lineDash: [8, 4],
      visible: false,
    });
    this.plotContentNode.addChild(this.rightTurningPointLine);

    // Create legend (outside clipped area)
    this.legendNode = this.createLegend();
    this.addChild(this.legendNode);

    // Handles on the potential curve for reshaping the well; unclipped so they can be grabbed at the chart edge
    this.potentialHandlesLayer = new PotentialHandlesLayer(
      model,
      {
        toView: (point) => new Vector2(this.dataToViewX(point.x), this.dataToViewY(point.y)),
        toModel: (viewPoint) => ({ x: this.viewToDataX(viewPoint.x), y: this.viewToDataY(viewPoint.y) }),
      },
      (x, y) =>
        x >= this.xMinProperty.value &&
        x <= this.xMaxProperty.value &&
        y >= this.yMinProperty.value &&
        y <= this.yMaxProperty.value,
      viewState.showEnergyValuesProperty,
    );
    this.addChild(this.potentialHandlesLayer);

    if (isDevMode()) {
      const configureButton = createConfigurePotentialButton(model);
      configureButton.right = this.chartWidth - 5;
      configureButton.top = 2;
      this.addChild(configureButton);
    }

    // Keyboard order: the handles that reshape the potential come before the (many) energy-level buttons
    this.pdomOrder = [this.potentialHandlesLayer, null];

    // Link to model properties
    this.linkToModel();

    // Set up keyboard navigation for energy levels
    this.setupKeyboardNavigation();

    // Note: Initial update is now done asynchronously inside linkToModel()
    // to prevent blocking the page load
  }

  /**
   * Creates an accessible description of the energy chart based on current state.
   * This provides screen reader users with meaningful information about the visualization.
   */
  private createEnergyChartDescription(
    potentialType: PotentialType,
    width: number,
    depth: number,
    selectedIndex: number,
  ): string {
    const strings = a11y.energyChart;
    const boundStates = this.model.getBoundStates();
    if (!boundStates || boundStates.energies.length === 0) {
      return strings.noBoundStatesStringProperty.value;
    }

    const numLevels = boundStates.energies.length;
    const energies = boundStates.energies.map((e) => e * QuantumConstants.JOULES_TO_EV);
    const groundEnergy = energies[0]!;

    const well = [
      StringUtils.fillIn(strings.wellPatternStringProperty, {
        potential: QPPWDescriber.getPotentialTypeName(potentialType),
        width: width.toFixed(2),
      }),
    ];
    // Depth only means something for potentials that have one
    if (potentialType !== PotentialType.INFINITE_WELL && potentialType !== PotentialType.HARMONIC_OSCILLATOR) {
      well.push(StringUtils.fillIn(strings.depthPatternStringProperty, { depth: depth.toFixed(2) }));
    }

    const levels = [
      QPPWDescriber.describeBoundStateCount(numLevels),
      StringUtils.fillIn(strings.groundStatePatternStringProperty, { energy: groundEnergy.toFixed(3) }),
    ];
    if (numLevels > 1) {
      const firstExcited = energies[1]!;
      levels.push(
        StringUtils.fillIn(strings.firstExcitedPatternStringProperty, {
          energy: firstExcited.toFixed(3),
          spacing: (firstExcited - groundEnergy).toFixed(3),
        }),
      );
    }

    const paragraphs = [well.join(" "), levels.join(" ")];

    // Selected level information
    const selectedEnergy = energies[selectedIndex];
    if (selectedEnergy !== undefined) {
      const selected = [
        StringUtils.fillIn(strings.viewingLevelPatternStringProperty, {
          level: selectedIndex + 1,
          energy: selectedEnergy.toFixed(3),
        }),
      ];
      if (hasClassicalTurningPoints(this.model)) {
        const turningPoints = this.model.getClassicalTurningPoints(selectedIndex);
        if (turningPoints) {
          selected.push(
            StringUtils.fillIn(strings.turningPointsPatternStringProperty, {
              left: turningPoints.left.toFixed(2),
              right: turningPoints.right.toFixed(2),
            }),
          );
        }
      }
      paragraphs.push(selected.join(" "));
    }

    return paragraphs.join("\n\n");
  }

  /**
   * Sets up keyboard navigation for energy level selection.
   * Arrow keys navigate between levels, Home/End jump to first/last.
   */
  private setupKeyboardNavigation(): void {
    // Add keyboard listener to the entire chart node
    this.addInputListener({
      keydown: (event: SceneryEvent<KeyboardEvent>) => {
        if (!event.domEvent) {
          return;
        }

        const boundStates = this.model.getBoundStates();
        if (!boundStates || boundStates.energies.length === 0) {
          return;
        }

        const currentLevel = this.model.selectedEnergyLevelIndexProperty.value;
        const maxLevel = boundStates.energies.length - 1;
        let newLevel = currentLevel;

        switch (event.domEvent.key) {
          case "ArrowUp":
          case "ArrowRight":
            // Move to higher energy level (higher index)
            if (currentLevel < maxLevel) {
              newLevel = currentLevel + 1;
              event.domEvent.preventDefault();
            }
            break;

          case "ArrowDown":
          case "ArrowLeft":
            // Move to lower energy level (lower index)
            if (currentLevel > 0) {
              newLevel = currentLevel - 1;
              event.domEvent.preventDefault();
            }
            break;

          case "Home":
            // Jump to ground state (level 0)
            newLevel = 0;
            event.domEvent.preventDefault();
            break;

          case "End":
            // Jump to highest energy level
            newLevel = maxLevel;
            event.domEvent.preventDefault();
            break;
        }

        // Update selection if changed
        if (newLevel !== currentLevel) {
          this.model.selectedEnergyLevelIndexProperty.value = newLevel;
        }
      },
    });
  }

  /**
   * Creates the axes (X and Y) with labels - using bamboo components where possible.
   * Note: GridLineSet from bamboo causes infinite loops, so we use manual grid lines.
   */
  protected createAxes(): Node {
    const axesNode = new Node();

    // Manual Y-axis grid lines (GridLineSet causes hang)
    const yMin = this.yMinProperty.value;
    const yMax = this.yMaxProperty.value;
    for (let energy = yMin; energy <= yMax; energy += 5) {
      if (energy !== yMin) {
        const y = this.chartMargins.top + this.chartTransform.modelToViewY(energy);
        const gridLine = new Line(this.chartMargins.left, y, this.chartMargins.left + this.plotWidth, y, {
          stroke: QPPWColors.gridLineProperty,
          lineWidth: 1,
        });
        axesNode.addChild(gridLine);
      }
    }

    // Manual X-axis grid lines (GridLineSet causes hang)
    for (let pos = -X_AXIS_RANGE_NM; pos <= X_AXIS_RANGE_NM; pos += 2) {
      if (pos !== -X_AXIS_RANGE_NM) {
        const x = this.chartMargins.left + this.chartTransform.modelToViewX(pos);
        const gridLine = new Line(x, this.chartMargins.top, x, this.chartMargins.top + this.plotHeight, {
          stroke: QPPWColors.gridLineProperty,
          lineWidth: 1,
        });
        axesNode.addChild(gridLine);
      }
    }

    // Y-axis at left edge using bamboo AxisLine (at model x=-4nm)
    const yAxisLeftNode = new AxisLine(this.chartTransform, Orientation.VERTICAL, {
      stroke: QPPWColors.axisProperty,
      lineWidth: 2,
      value: this.xMinProperty.value,
    });
    yAxisLeftNode.x = this.chartMargins.left;
    yAxisLeftNode.y = this.chartMargins.top;
    axesNode.addChild(yAxisLeftNode);

    // Y-axis at origin using bamboo AxisLine (at model x=0)
    const yAxisNode = new AxisLine(this.chartTransform, Orientation.VERTICAL, {
      stroke: QPPWColors.axisProperty,
      lineWidth: 2,
      value: 0,
      opacity: 0.3,
    });
    yAxisNode.x = this.chartMargins.left;
    yAxisNode.y = this.chartMargins.top;
    axesNode.addChild(yAxisNode);

    // X-axis using bamboo AxisLine (at model y=0)
    const xAxisNode = new AxisLine(this.chartTransform, Orientation.HORIZONTAL, {
      stroke: QPPWColors.axisProperty,
      lineWidth: 2,
      value: 0,
    });
    xAxisNode.x = this.chartMargins.left;
    xAxisNode.y = this.chartMargins.top;
    axesNode.addChild(xAxisNode);

    // X-axis at bottom using bamboo AxisLine (at model y=yMin)
    const xAxisBottomNode = new AxisLine(this.chartTransform, Orientation.HORIZONTAL, {
      stroke: QPPWColors.axisProperty,
      lineWidth: 2,
      value: this.yMinProperty.value,
    });
    xAxisBottomNode.x = this.chartMargins.left;
    xAxisBottomNode.y = this.chartMargins.top;
    axesNode.addChild(xAxisBottomNode);

    // Y-axis tick marks using bamboo TickMarkSet
    const yTickMarksNode = new TickMarkSet(this.chartTransform, Orientation.VERTICAL, 5, {
      edge: "min",
      extent: 8,
      stroke: QPPWColors.axisProperty,
      lineWidth: 1,
    });
    yTickMarksNode.x = this.chartMargins.left;
    yTickMarksNode.y = this.chartMargins.top;
    axesNode.addChild(yTickMarksNode);

    // X-axis tick marks using bamboo TickMarkSet
    const xTickMarksNode = new TickMarkSet(this.chartTransform, Orientation.HORIZONTAL, 2, {
      edge: "max",
      extent: 8,
      stroke: QPPWColors.axisProperty,
      lineWidth: 1,
    });
    xTickMarksNode.x = this.chartMargins.left;
    xTickMarksNode.y = this.chartMargins.top + this.plotHeight;
    axesNode.addChild(xTickMarksNode);

    // Y-axis tick labels using bamboo TickLabelSet
    const yTickLabelsNode = new TickLabelSet(this.chartTransform, Orientation.VERTICAL, 5, {
      edge: "min",
      createLabel: (value: number) =>
        new Text(value.toFixed(0), {
          font: new PhetFont(12),
          fill: QPPWColors.labelFillProperty,
        }),
    });
    yTickLabelsNode.x = this.chartMargins.left;
    yTickLabelsNode.y = this.chartMargins.top;
    axesNode.addChild(yTickLabelsNode);

    // X-axis tick labels, unless the chart below carries the shared position axis
    if (!this.sharedXAxis) {
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
    }

    // Axis labels
    const yLabelText = new Text(stringManager.energyEvStringProperty, {
      font: new PhetFont(14),
      fill: QPPWColors.labelFillProperty,
      rotation: -Math.PI / 2,
      centerX: this.chartMargins.left - 40,
      centerY: this.chartHeight / 2,
    });
    axesNode.addChild(yLabelText);

    if (!this.sharedXAxis) {
      const xLabelText = new Text(stringManager.positionNmStringProperty, {
        font: new PhetFont(14),
        fill: QPPWColors.labelFillProperty,
        centerX: this.chartWidth / 2,
        centerY: this.chartHeight - 15,
      });
      axesNode.addChild(xLabelText);
    }

    return axesNode;
  }

  /**
   * Creates the legend for toggling visibility of elements.
   */
  private createLegend(): Node {
    const legendContentVBox = new (this.sharedXAxis ? HBox : VBox)({
      spacing: this.sharedXAxis ? 20 : 5,
      align: this.sharedXAxis ? "center" : "left",
      children: [
        new Checkbox(
          this.viewState.showTotalEnergyProperty,
          new Text(stringManager.totalEnergyStringProperty, {
            font: "12px sans-serif",
            fill: QPPWColors.textFillProperty,
          }),
          {
            ...PANEL_CHECKBOX_OPTIONS,
            boxWidth: 15,
          },
        ),
        new Checkbox(
          this.viewState.showPotentialEnergyProperty,
          new Text(stringManager.potentialEnergyStringProperty, {
            font: "12px sans-serif",
            fill: QPPWColors.textFillProperty,
          }),
          {
            ...PANEL_CHECKBOX_OPTIONS,
            boxWidth: 15,
          },
        ),
      ],
    });

    const legendPanelRectangle = new Rectangle(
      0,
      0,
      legendContentVBox.width + 20,
      legendContentVBox.height + 15,
      5,
      5,
      {
        fill: QPPWColors.panelFillProperty,
        stroke: QPPWColors.gridLineProperty,
        lineWidth: 1,
      },
    );

    const legendNode = new Node({
      children: [legendPanelRectangle, legendContentVBox],
      left: this.chartMargins.left + 10,
      top: this.chartMargins.top + 10,
    });

    legendContentVBox.left = 10;
    legendContentVBox.top = 8;

    // In the shared-axis layout the legend is a borderless row in the top margin, above the plot
    if (this.sharedXAxis) {
      legendPanelRectangle.visible = false;
      legendContentVBox.left = 0;
      legendContentVBox.top = 0;
      legendNode.right = this.chartWidth - this.chartMargins.right;
      legendNode.centerY = this.chartMargins.top / 2;
    } else {
      legendNode.right = this.chartWidth - this.chartMargins.right - 10;
    }

    return legendNode;
  }

  /**
   * Links chart updates to model property changes.
   */
  protected linkToModel(): void {
    this.viewState.showEnergyValuesProperty.lazyLink(() => this.updateLevelLabels());
    // Update when any parameter changes
    this.model.potentialTypeProperty.lazyLink(() => {
      this.updateEnergyAxisRange();
      this.update();
    });
    this.model.wellWidthProperty.lazyLink(() => this.update());
    this.model.wellDepthProperty.lazyLink(() => this.update());
    if ("wellOffsetProperty" in this.model) {
      this.model.wellOffsetProperty.lazyLink(() => this.update());
    }
    this.model.particleMassProperty.lazyLink(() => this.update());
    this.model.selectedEnergyLevelIndexProperty.lazyLink(() => this.updateSelection());
    this.viewState.showTotalEnergyProperty.lazyLink((show: boolean) => {
      this.totalEnergyLine.visible = show;
    });
    this.viewState.showPotentialEnergyProperty.lazyLink((show: boolean) => {
      this.potentialPath.visible = show;
    });

    // Link to wellSeparationProperty if available (TwoWellsModel and ManyWellsModel)
    if (hasWellSeparation(this.model)) {
      this.model.wellSeparationProperty.lazyLink(() => this.update());
    }

    // Link to numberOfWellsProperty and electricFieldProperty if available (ManyWellsModel only)
    if (isManyWellsModel(this.model)) {
      this.model.numberOfWellsProperty.lazyLink(() => this.update());
      if (hasElectricField(this.model)) {
        this.model.electricFieldProperty.lazyLink(() => this.update());
      }
    }

    // Link to barrierHeightProperty and potentialOffsetProperty if available (OneWellModel only)
    if (hasBarrierHeight(this.model)) {
      this.model.barrierHeightProperty.lazyLink(() => this.update());
    }
    if (hasPotentialOffset(this.model)) {
      this.model.potentialOffsetProperty.lazyLink(() => this.update());
    }

    // Update classical probability visualization when property changes
    this.viewState.showClassicalProbabilityProperty.lazyLink(() => this.update());

    // Perform initial updates asynchronously (after construction completes)
    // This prevents blocking the page load with expensive calculations
    setTimeout(() => {
      this.updateEnergyAxisRange();
      this.update();
      this.updateSelection();
    }, 0);
  }

  /**
   * Updates the energy axis range based on the current potential type.
   */
  private updateEnergyAxisRange(): void {
    const energyRange = getEnergyAxisRange(this.model.potentialTypeProperty.value);
    this.yMinProperty.value = energyRange.min;
    this.yMaxProperty.value = energyRange.max;

    // Update the chart transform with new Y range
    this.chartTransform.setModelYRange(new Range(energyRange.min, energyRange.max));

    // Recreate axes with new range
    this.removeChild(this.axesNode);
    this.axesNode = this.createAxes();
    this.addChild(this.axesNode);
    this.axesNode.moveToBack();
    this.potentialHandlesLayer.update();
    this.backgroundRect.moveToBack();
  }

  /**
   * Main update method - recalculates and redraws everything.
   * Called automatically when model properties change, but can also be called explicitly (e.g., during reset).
   */
  public update(): void {
    const boundStates = this.model.getBoundStates();
    if (!boundStates) {
      // Clear the chart if bound states cannot be calculated
      this.clearChart();
      return;
    }

    this.updatePotentialCurve();
    this.updateEnergyLevels(boundStates);
    this.updateZeroLine();
    this.updateTotalEnergyLine(boundStates);
    this.updateClassicalTurningPoints(boundStates);
  }

  /**
   * Updates the classical turning point lines.
   */
  private updateClassicalTurningPoints(boundStates: BoundStateResult): void {
    const selectedIndex = this.model.selectedEnergyLevelIndexProperty.value;

    // Early return if conditions aren't met
    if (
      !(this.viewState.showClassicalProbabilityProperty.value && hasClassicalTurningPoints(this.model)) ||
      selectedIndex < 0 ||
      selectedIndex >= boundStates.energies.length
    ) {
      this.leftTurningPointLine.visible = false;
      this.rightTurningPointLine.visible = false;
      return;
    }

    // TypeScript now knows this.model has getClassicalTurningPoints
    const turningPoints = this.model.getClassicalTurningPoints(selectedIndex);

    if (!turningPoints) {
      this.leftTurningPointLine.visible = false;
      this.rightTurningPointLine.visible = false;
      return;
    }

    // Draw vertical lines at turning points
    const xLeft = this.dataToViewX(turningPoints.left);
    const xRight = this.dataToViewX(turningPoints.right);
    const yTop = this.chartMargins.top;
    const yBottom = this.chartMargins.top + this.plotHeight;

    this.leftTurningPointLine.setLine(xLeft, yTop, xLeft, yBottom);
    this.leftTurningPointLine.visible = true;

    this.rightTurningPointLine.setLine(xRight, yTop, xRight, yBottom);
    this.rightTurningPointLine.visible = true;
  }

  /**
   * Clears all chart elements (potential curve, energy levels, etc.)
   * Called when bound states cannot be calculated.
   */
  private clearChart(): void {
    // Clear potential curve
    this.potentialPath.shape = null;

    // Clear energy level lines
    for (const line of this.energyLevelNodes.values()) {
      this.plotContentNode.removeChild(line);
    }
    this.energyLevelNodes.clear();

    this.levelViewYs = [];
    this.hoveredEnergyLevelIndex = null;
    this.selectedLevelPanel.visible = false;
    this.hoveredLevelPanel.visible = false;

    this.removeEnergyLevelHitAreas();

    // Hide total energy line
    this.totalEnergyLine.visible = false;
  }

  /**
   * Updates the potential energy curve.
   */
  private updatePotentialCurve(): void {
    // Clear the old shape explicitly
    this.potentialPath.shape = null;

    const shape = new Shape();

    // Draw exactly the potential the model solves, sampled across the chart and clamped to the energy axis
    // (infinite walls and Coulomb singularities are drawn to the chart edge)
    const numPoints = POTENTIAL_CURVE_SAMPLES;
    const xMin = this.xMinProperty.value;
    const xMax = this.xMaxProperty.value;
    const xGridM: number[] = [];
    for (let i = 0; i < numPoints; i++) {
      xGridM.push((xMin + ((xMax - xMin) * i) / (numPoints - 1)) * QuantumConstants.NM_TO_M);
    }
    const potentialJ = this.model.getPotentialEnergy(xGridM);
    const yMin = this.yMinProperty.value;
    const yMax = this.yMaxProperty.value;
    for (let i = 0; i < numPoints; i++) {
      const energyEv = potentialJ[i]! * QuantumConstants.JOULES_TO_EV;
      const V = Number.isNaN(energyEv) ? yMax : Math.min(yMax, Math.max(yMin, energyEv));
      const viewX = this.dataToViewX(xGridM[i]! * QuantumConstants.M_TO_NM);
      const viewY = this.dataToViewY(V);
      if (i === 0) {
        shape.moveTo(viewX, viewY);
      } else {
        shape.lineTo(viewX, viewY);
      }
    }

    this.potentialPath.shape = shape;
  }

  /**
   * Updates just the styling (hover/selection state) of existing energy levels without recalculating positions.
   */
  private updateEnergyLevelStyling(): void {
    this.energyLevelNodes.forEach((line, index) => {
      const isSelected = index === this.model.selectedEnergyLevelIndexProperty.value;
      const isHovered = index === this.hoveredEnergyLevelIndex;

      line.stroke = isSelected ? QPPWColors.energyLevelSelectedProperty : QPPWColors.energyLevelProperty;
      line.lineWidth = isSelected ? 4 : isHovered ? 3 : 2;
      line.opacity = isHovered ? 1 : 0.7;
    });

    this.updateLevelLabels();
  }

  /** Position selected and hovered level panels above their energy lines. */
  private updateLevelLabels(): void {
    const energies = this.model.getEnergyLevels();
    const left = this.chartMargins.left + 12;
    const place = (panel: Panel, label: RichText, index: number | null): void => {
      const y = index === null ? undefined : this.levelViewYs[index];
      const energy = index === null ? undefined : energies[index];
      panel.visible = y !== undefined && energy !== undefined;
      if (panel.visible && index !== null && energy !== undefined && y !== undefined) {
        const level = `E<sub>${index + 1}</sub>`;
        label.string = this.viewState.showEnergyValuesProperty.value
          ? `${level} = ${energy.toFixed(getEnergyLevelDecimalPlaces(energies, index))} ${stringManager.electronVoltsStringProperty.value}`
          : level;
        panel.left = left;
        panel.bottom = y - 3;
      }
    };

    const selectedIndex = this.model.selectedEnergyLevelIndexProperty.value;
    place(this.selectedLevelPanel, this.selectedLevelLabel, selectedIndex);
    place(
      this.hoveredLevelPanel,
      this.hoveredLevelLabel,
      this.hoveredEnergyLevelIndex === selectedIndex ? null : this.hoveredEnergyLevelIndex,
    );

    // Keep the two readouts from overlapping when the hovered level is next to the selected one
    if (this.selectedLevelPanel.visible && this.hoveredLevelPanel.visible) {
      if (this.hoveredLevelPanel.bounds.intersectsBounds(this.selectedLevelPanel.bounds)) {
        this.hoveredLevelPanel.left = this.selectedLevelPanel.right + 6;
      }
    }
  }

  /**
   * Index of the level nearest the pointer, or null when none is within LEVEL_PICK_DISTANCE.
   */
  private getNearestLevelIndex(event: SceneryEvent): number | null {
    const y = this.levelPickerRectangle.globalToParentPoint(event.pointer.point).y;
    let nearest: number | null = null;
    let nearestDistance = LEVEL_PICK_DISTANCE;
    this.levelViewYs.forEach((levelY, index) => {
      const distance = Math.abs(levelY - y);
      if (distance <= nearestDistance) {
        nearest = index;
        nearestDistance = distance;
      }
    });
    return nearest;
  }

  private setHoveredLevel(index: number | null): void {
    if (index !== this.hoveredEnergyLevelIndex) {
      this.hoveredEnergyLevelIndex = index;
      this.levelPickerRectangle.cursor = index === null ? null : "pointer";
      this.updateEnergyLevelStyling();
    }
  }

  /**
   * Removes and disposes the per-level hit areas and unlinks their selection listeners, so stale
   * hit areas (with out-of-range indices) never outlive the levels they were drawn for.
   */
  private removeEnergyLevelHitAreas(): void {
    for (const { hitArea, listener } of this.energyLevelHitAreas) {
      this.model.selectedEnergyLevelIndexProperty.unlink(listener);
      this.plotContentNode.removeChild(hitArea);
      hitArea.dispose();
    }
    this.energyLevelHitAreas.length = 0;
  }

  /**
   * Updates the energy level lines.
   */
  private updateEnergyLevels(boundStates: BoundStateResult): void {
    // Remove old energy level nodes
    for (const line of this.energyLevelNodes.values()) {
      this.plotContentNode.removeChild(line);
    }
    this.energyLevelNodes.clear();

    this.removeEnergyLevelHitAreas();

    // Create new energy level lines
    const energies = boundStates.energies.map((e) => e * QuantumConstants.JOULES_TO_EV);
    const x1 = this.chartMargins.left;
    const x2 = this.chartWidth - this.chartMargins.right;
    this.levelViewYs = energies.map((energy) => this.dataToViewY(energy));
    if (this.hoveredEnergyLevelIndex !== null && this.hoveredEnergyLevelIndex >= energies.length) {
      this.hoveredEnergyLevelIndex = null;
    }

    energies.forEach((energy, index) => {
      const y = this.dataToViewY(energy);
      const isSelected = index === this.model.selectedEnergyLevelIndexProperty.value;
      const isHovered = index === this.hoveredEnergyLevelIndex;

      const line = new Line(x1, y, x2, y, {
        stroke: isSelected ? QPPWColors.energyLevelSelectedProperty : QPPWColors.energyLevelProperty,
        lineWidth: isSelected ? 4 : isHovered ? 3 : 2,
        cursor: "pointer",
        opacity: isHovered ? 1 : 0.7,
      });

      // Create a wider invisible hit area to make the line easier to grab
      const hitAreaHeight = 5; // pixels above and below the line
      const hitArea = new Rectangle(x1, y - hitAreaHeight, x2 - x1, hitAreaHeight * 2, {
        fill: "transparent",
        cursor: "pointer",

        // PDOM - make energy level selection keyboard accessible
        tagName: "button",
        ariaRole: "radio",
        innerContent: StringUtils.fillIn(a11y.energyChart.levelButtonPatternStringProperty, { level: index + 1 }),
        accessibleName: StringUtils.fillIn(a11y.energyChart.levelNamePatternStringProperty, { level: index + 1 }),
        descriptionContent: StringUtils.fillIn(a11y.energyChart.levelDescriptionPatternStringProperty, {
          energy: energy.toFixed(3),
          nodes: QPPWDescriber.describeNodes(index),
        }),
        focusable: true,
      });

      // Update aria-checked when selection changes
      const updateAriaChecked = () => {
        const selected = index === this.model.selectedEnergyLevelIndexProperty.value;
        hitArea.setPDOMAttribute("aria-checked", selected.toString());
      };

      // Set initial state
      updateAriaChecked();

      // Update when selection changes (unlinked in removeEnergyLevelHitAreas when the levels are redrawn)
      this.model.selectedEnergyLevelIndexProperty.link(updateAriaChecked);
      this.energyLevelHitAreas.push({ hitArea, listener: updateAriaChecked });

      // Keyboard/screen-reader activation of this level's button. Pointer input goes to levelPickerRectangle,
      // which lies on top and picks the nearest level.
      hitArea.addInputListener({
        click: () => {
          if (index >= 0 && index < boundStates.energies.length) {
            this.model.selectedEnergyLevelIndexProperty.value = index;
          }
        },
      });

      this.energyLevelNodes.set(index, line);
      this.plotContentNode.addChild(line); // Add to clipped content
      this.plotContentNode.addChild(hitArea); // Add hit area on top
    });

    // Keep readouts outside the clipped plot so high levels can use the top margin.
    for (const node of [this.selectedLevelPanel, this.hoveredLevelPanel]) {
      if (this.hasChild(node)) {
        node.moveToFront();
      } else {
        this.addChild(node);
      }
    }
    this.updateLevelLabels();
    this.totalEnergyLine.moveToFront();
    this.legendNode.moveToFront();
    this.potentialHandlesLayer.moveToFront();
  }

  /**
   * Updates the zero-line reference.
   */
  protected override updateZeroLine(): void {
    const y = this.dataToViewY(0);
    this.zeroLine.x1 = this.chartMargins.left;
    this.zeroLine.y1 = y;
    this.zeroLine.x2 = this.chartWidth - this.chartMargins.right;
    this.zeroLine.y2 = y;

    // Hide zero line for Coulomb potentials to reduce clutter
    const potentialType = this.model.potentialTypeProperty.value;
    this.zeroLine.visible = potentialType !== PotentialType.COULOMB_1D;
  }

  /**
   * Updates the total energy line for the selected state.
   */
  private updateTotalEnergyLine(boundStates: BoundStateResult): void {
    const selectedIndex = this.model.selectedEnergyLevelIndexProperty.value;
    if (selectedIndex >= 0 && selectedIndex < boundStates.energies.length) {
      const energy = boundStates.energies[selectedIndex]! * QuantumConstants.JOULES_TO_EV;
      const y = this.dataToViewY(energy);
      this.totalEnergyLine.x1 = this.chartMargins.left;
      this.totalEnergyLine.y1 = y;
      this.totalEnergyLine.x2 = this.chartWidth - this.chartMargins.right;
      this.totalEnergyLine.y2 = y;
      this.totalEnergyLine.visible = this.viewState.showTotalEnergyProperty.value;
    } else {
      this.totalEnergyLine.visible = false;
    }
  }

  /**
   * Updates the selection highlighting.
   */
  private updateSelection(): void {
    const boundStates = this.model.getBoundStates();
    if (boundStates) {
      this.updateEnergyLevelStyling();
      this.updateTotalEnergyLine(boundStates);
      this.updateClassicalTurningPoints(boundStates);
    }
  }
}
