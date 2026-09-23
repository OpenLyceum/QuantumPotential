/**
 * EnergyChartNode displays the potential energy landscape and energy levels.
 * This is the top chart in the One Well screen.
 */

import { DerivedProperty } from "scenerystack/axon";
import { AxisLine, TickLabelSet, TickMarkSet } from "scenerystack/bamboo";
import { Range } from "scenerystack/dot";
import { localeProperty } from "scenerystack/joist";
import { Shape } from "scenerystack/kite";
import { Orientation } from "scenerystack/phet-core";
import { StringUtils } from "scenerystack/phetcommon";
import { Line, Node, Path, Rectangle, type SceneryEvent, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox } from "scenerystack/sun";
import stringManager from "../../i18n/StringManager.js";
import QPPWColors from "../../QPPWColors.js";
import {
  hasBarrierHeight,
  hasClassicalTurningPoints,
  hasElectricField,
  hasPotentialOffset,
  hasWellSeparation,
  isManyWellsModel,
  isTwoWellsModel,
} from "../model/ModelTypeGuards.js";
import { type BoundStateResult, PotentialType } from "../model/PotentialFunction.js";
import QuantumConstants from "../model/QuantumConstants.js";
import type { ScreenModel } from "../model/ScreenModels.js";
import { PANEL_CHECKBOX_OPTIONS } from "../QPPWControlOptions.js";
import { QPPWDescriber } from "./accessibility/QPPWDescriber.js";
import { BaseChartNode, type ChartOptions } from "./BaseChartNode.js";
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
    case PotentialType.MORSE:
      // Morse potential: V=0 at dissociation limit (infinity), V=-De at bottom
      return { min: -15, max: 5 };
    case PotentialType.FINITE_WELL:
    case PotentialType.POSCHL_TELLER:
    case PotentialType.ROSEN_MORSE:
    case PotentialType.ECKART:
    case PotentialType.COULOMB_1D:
    case PotentialType.COULOMB_3D:
    case PotentialType.CUSTOM:
    default:
      // V=0 at infinity (wells with negative energy states)
      return { min: -15, max: 5 };
  }
}

const a11y = stringManager.getA11yStrings();

export class EnergyChartNode extends BaseChartNode {
  // Visual elements specific to energy chart
  private readonly potentialPath: Path;
  private readonly energyLevelNodes: Map<number, Line>;
  private readonly energyLabelNodes: Map<number, Text>;
  // Selectable hit areas over each level, with the aria-checked listener each one links to the model
  private readonly energyLevelHitAreas: Array<{ hitArea: Rectangle; listener: () => void }> = [];
  private readonly totalEnergyLine: Line;
  private readonly legendNode: Node;

  // Classical turning point lines
  private readonly leftTurningPointLine: Line;
  private readonly rightTurningPointLine: Line;

  // Hover state
  private hoveredEnergyLevelIndex: number | null = null;

  public constructor(model: ScreenModel, viewState: ScreenViewState, options?: { width?: number; height?: number }) {
    // Initialize view range with values based on initial potential type
    const initialEnergyRange = getEnergyAxisRange(model.potentialTypeProperty.value);

    // Call super constructor with chart options
    const chartOptions: ChartOptions = {
      width: options?.width ?? 600,
      height: options?.height ?? 300,
      margins: { left: 60, right: 20, top: 40, bottom: 50 },
      xRange: { min: -X_AXIS_RANGE_NM, max: X_AXIS_RANGE_NM },
      yRange: { min: initialEnergyRange.min, max: initialEnergyRange.max },
      showZeroLine: true,
    };

    super(model, viewState, chartOptions);

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
    this.energyLabelNodes = new Map();

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

    // X-axis tick labels using bamboo TickLabelSet
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

    // Axis labels
    const yLabelText = new Text(stringManager.energyEvStringProperty, {
      font: new PhetFont(14),
      fill: QPPWColors.labelFillProperty,
      rotation: -Math.PI / 2,
      centerX: this.chartMargins.left - 40,
      centerY: this.chartHeight / 2,
    });
    axesNode.addChild(yLabelText);

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
   * Creates the legend for toggling visibility of elements.
   */
  private createLegend(): Node {
    const legendContentVBox = new VBox({
      spacing: 5,
      align: "left",
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

    return legendNode;
  }

  /**
   * Links chart updates to model property changes.
   */
  protected linkToModel(): void {
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

    this.updatePotentialCurve(boundStates);
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

    // Clear energy labels
    for (const label of this.energyLabelNodes.values()) {
      this.removeChild(label);
    }
    this.energyLabelNodes.clear();

    this.removeEnergyLevelHitAreas();

    // Hide total energy line
    this.totalEnergyLine.visible = false;
  }

  /**
   * Updates the potential energy curve.
   */
  private updatePotentialCurve(boundStates: BoundStateResult): void {
    // Clear the old shape explicitly
    this.potentialPath.shape = null;

    const shape = new Shape();
    const xGrid = boundStates.xGrid;

    // For simplicity, draw the potential based on the type
    const potentialType = this.model.potentialTypeProperty.value;
    const wellWidth = this.model.wellWidthProperty.value;
    const wellDepth = this.model.wellDepthProperty.value;

    // Calculate the center of the xGrid for alignment
    const xCenter = ((xGrid[0]! + xGrid[xGrid.length - 1]!) / 2) * QuantumConstants.M_TO_NM;

    if (potentialType === PotentialType.INFINITE_WELL) {
      // Draw square well centered at x=0 (xCenter should be 0)
      // Well extends from -wellWidth/2 to +wellWidth/2
      // V=0 inside, V=15 eV outside (representing infinity)
      const x1 = this.dataToViewX(-wellWidth / 2);
      const x2 = this.dataToViewX(wellWidth / 2);
      const y0 = this.dataToViewY(0);
      const y15 = this.dataToViewY(15); // Display infinity as 15 eV

      // Left region (x < -wellWidth/2): horizontal line at 15 eV
      shape.moveTo(this.chartMargins.left, y15);
      shape.lineTo(x1, y15);

      // Left wall: vertical line from 15 eV down to 0 eV
      shape.lineTo(x1, y0);

      // Bottom (inside well): horizontal line at 0 eV
      shape.lineTo(x2, y0);

      // Right wall: vertical line from 0 eV up to 15 eV
      shape.lineTo(x2, y15);

      // Right region (x > wellWidth/2): horizontal line at 15 eV
      shape.lineTo(this.chartWidth - this.chartMargins.right, y15);
    } else if (potentialType === PotentialType.FINITE_WELL) {
      // Draw finite square well centered at xCenter
      // V=0 at infinity, V=-wellDepth inside the well
      const x1 = this.dataToViewX(xCenter - wellWidth / 2);
      const x2 = this.dataToViewX(xCenter + wellWidth / 2);
      const y0 = this.dataToViewY(0);
      const yDepth = this.dataToViewY(-wellDepth);

      shape.moveTo(this.chartMargins.left, y0);
      shape.lineTo(x1, y0);
      shape.lineTo(x1, yDepth);
      shape.lineTo(x2, yDepth);
      shape.lineTo(x2, y0);
      shape.lineTo(this.chartWidth - this.chartMargins.right, y0);
    } else if (potentialType === PotentialType.HARMONIC_OSCILLATOR) {
      // Draw parabola centered at xCenter
      const centerX = xCenter;
      const numPoints = 100;
      let firstPoint = true;

      for (let i = 0; i < numPoints; i++) {
        const x =
          (xGrid[0]! + ((xGrid[xGrid.length - 1]! - xGrid[0]!) * i) / (numPoints - 1)) * QuantumConstants.M_TO_NM;
        const dx = x - centerX;
        const k = (2 * wellDepth) / ((wellWidth * wellWidth) / 4); // Spring constant
        const V = 0.5 * k * dx * dx;
        const viewX = this.dataToViewX(x);
        const viewY = this.dataToViewY(V);

        if (firstPoint) {
          shape.moveTo(viewX, viewY);
          firstPoint = false;
        } else {
          shape.lineTo(viewX, viewY);
        }
      }
    } else if (potentialType === PotentialType.ASYMMETRIC_TRIANGLE) {
      // Draw asymmetric triangle potential (infinite wall version):
      // V(x) = ∞ for x < 0 (displayed as 15 eV)
      // V(x) = F·x for x ≥ 0 (linear increasing)
      // where F = wellDepth/wellWidth (slope)

      const FEVPerNm = wellDepth / wellWidth; // slope in eV/nm
      const y15eV = this.dataToViewY(15); // Display infinity as 15 eV
      const y0eV = this.dataToViewY(0);

      // Left region (x < 0): vertical line at x=0 representing infinite wall
      shape.moveTo(this.chartMargins.left, y15eV);
      shape.lineTo(this.dataToViewX(0), y15eV);
      shape.lineTo(this.dataToViewX(0), y0eV);

      // Right region (x ≥ 0): linear increasing potential V = F·x
      const numPoints = 100;
      for (let i = 0; i <= numPoints; i++) {
        const x = ((xGrid[xGrid.length - 1]! * i) / numPoints) * QuantumConstants.M_TO_NM;
        if (x >= 0) {
          const V = FEVPerNm * x;
          const viewX = this.dataToViewX(x);
          const viewY = this.dataToViewY(Math.min(V, 15)); // Clamp to chart range
          shape.lineTo(viewX, viewY);
        }
      }
    } else if (potentialType === PotentialType.TRIANGULAR) {
      // Draw triangular potential (finite well version):
      // V(x) = height + offset for x < 0
      // V(x) = offset at x = 0
      // V(x) = offset + (height/width) * x for 0 < x < width
      // V(x) = height + offset for x > width

      // Get the offset from potentialOffsetProperty (OneWellModel or IntroModel only)
      const offset = hasPotentialOffset(this.model) ? this.model.potentialOffsetProperty.value : 0;
      const height = wellDepth;
      const barrierTop = height + offset;
      const slope = height / wellWidth; // eV/nm

      const yBarrier = this.dataToViewY(barrierTop);
      const yOffset = this.dataToViewY(offset);

      // Left region (x < 0): horizontal line at height + offset
      shape.moveTo(this.chartMargins.left, yBarrier);
      shape.lineTo(this.dataToViewX(0), yBarrier);

      // Drop to offset at x = 0
      shape.lineTo(this.dataToViewX(0), yOffset);

      // Linear region (0 < x < width): V = offset + slope * x
      const numPoints = 50;
      for (let i = 1; i <= numPoints; i++) {
        const x = (wellWidth * i) / numPoints;
        const V = offset + slope * x;
        const viewX = this.dataToViewX(x);
        const viewY = this.dataToViewY(V);
        shape.lineTo(viewX, viewY);
      }

      // At x = width, we should be back at height + offset
      // Then continue as horizontal line to the right
      shape.lineTo(this.chartWidth - this.chartMargins.right, yBarrier);
    } else if (potentialType === PotentialType.COULOMB_1D || potentialType === PotentialType.COULOMB_3D) {
      // Draw Coulomb potential: V(x) = -k/|x| where k is determined by wellDepth
      // V→0 as x→∞, V→-wellDepth at some characteristic distance
      const centerX = xCenter;
      const numPoints = 200;
      let firstPoint = true;

      // Scale factor: at distance wellWidth/2, V = -wellDepth
      const k = wellDepth * (wellWidth / 2);

      for (let i = 0; i < numPoints; i++) {
        const x =
          (xGrid[0]! + ((xGrid[xGrid.length - 1]! - xGrid[0]!) * i) / (numPoints - 1)) * QuantumConstants.M_TO_NM;
        const dx = x - centerX;

        // Avoid singularity at x=0
        const distance = Math.max(Math.abs(dx), 0.01);
        const V = -k / distance;

        // Clamp V to reasonable range for display
        const VClamped = Math.max(V, this.yMinProperty.value);

        const viewX = this.dataToViewX(x);
        const viewY = this.dataToViewY(VClamped);

        if (firstPoint) {
          shape.moveTo(viewX, viewY);
          firstPoint = false;
        } else {
          shape.lineTo(viewX, viewY);
        }
      }
    } else if (potentialType === PotentialType.DOUBLE_SQUARE_WELL) {
      // Draw double square well
      // Convention: V=0 in wells, V=wellDepth in barrier
      // This matches the analytical solution convention
      // Wells are centered at ±(separation/2 + wellWidth/2)

      if (!isTwoWellsModel(this.model)) {
        return; // DOUBLE_SQUARE_WELL requires TwoWellsModel
      }

      const separation = this.model.wellSeparationProperty.value;

      const leftWellCenter = -(separation / 2 + wellWidth / 2);
      const rightWellCenter = separation / 2 + wellWidth / 2;
      const halfWidth = wellWidth / 2;

      // Well boundaries
      const leftWellLeft = leftWellCenter - halfWidth;
      const leftWellRight = leftWellCenter + halfWidth;
      const rightWellLeft = rightWellCenter - halfWidth;
      const rightWellRight = rightWellCenter + halfWidth;

      const y0 = this.dataToViewY(0); // Well energy
      const yBarrier = this.dataToViewY(wellDepth); // Barrier energy

      // Draw from left to right
      // Left outside region (at barrier height)
      shape.moveTo(this.chartMargins.left, yBarrier);
      shape.lineTo(this.dataToViewX(leftWellLeft), yBarrier);

      // Left well (drop down to V=0)
      shape.lineTo(this.dataToViewX(leftWellLeft), y0);
      shape.lineTo(this.dataToViewX(leftWellRight), y0);
      shape.lineTo(this.dataToViewX(leftWellRight), yBarrier);

      // Barrier between wells
      shape.lineTo(this.dataToViewX(rightWellLeft), yBarrier);

      // Right well (drop down to V=0)
      shape.lineTo(this.dataToViewX(rightWellLeft), y0);
      shape.lineTo(this.dataToViewX(rightWellRight), y0);
      shape.lineTo(this.dataToViewX(rightWellRight), yBarrier);

      // Right outside region (at barrier height)
      shape.lineTo(this.chartWidth - this.chartMargins.right, yBarrier);
    } else if (potentialType === PotentialType.MORSE) {
      // Draw Morse potential: V(x) = D_e * (1 - exp(-(x-x_e)/a))^2 - D_e
      // With x_e = 0 (centered), D_e = wellDepth, a = wellWidth
      // V=0 at dissociation (x→∞), V=-D_e at bottom of well (x=x_e)
      const centerX = xCenter;
      const numPoints = 200;
      let firstPoint = true;

      for (let i = 0; i < numPoints; i++) {
        const x =
          (xGrid[0]! + ((xGrid[xGrid.length - 1]! - xGrid[0]!) * i) / (numPoints - 1)) * QuantumConstants.M_TO_NM;
        const dx = x - centerX;
        const exponent = Math.exp(-dx / wellWidth);
        // V(x) = D_e * (1 - e^(-dx/a))^2 - D_e
        // At x=x_e (dx=0): V = D_e * (1-1)^2 - D_e = -D_e (bottom of well)
        // At x→∞: V = D_e * (1-0)^2 - D_e = 0 (dissociation limit)
        const V = wellDepth * (1 - exponent) ** 2 - wellDepth;

        const viewX = this.dataToViewX(x);
        const viewY = this.dataToViewY(V);

        if (firstPoint) {
          shape.moveTo(viewX, viewY);
          firstPoint = false;
        } else {
          shape.lineTo(viewX, viewY);
        }
      }
    } else if (potentialType === PotentialType.POSCHL_TELLER) {
      // Draw Pöschl-Teller potential: V(x) = -V_0 / cosh²(x/a)
      const centerX = xCenter;
      const numPoints = 200;
      let firstPoint = true;

      for (let i = 0; i < numPoints; i++) {
        const x =
          (xGrid[0]! + ((xGrid[xGrid.length - 1]! - xGrid[0]!) * i) / (numPoints - 1)) * QuantumConstants.M_TO_NM;
        const dx = x - centerX;
        const coshVal = Math.cosh(dx / wellWidth);
        const V = -wellDepth / (coshVal * coshVal);

        const viewX = this.dataToViewX(x);
        const viewY = this.dataToViewY(V);

        if (firstPoint) {
          shape.moveTo(viewX, viewY);
          firstPoint = false;
        } else {
          shape.lineTo(viewX, viewY);
        }
      }
    } else if (potentialType === PotentialType.ROSEN_MORSE) {
      // Draw Rosen-Morse potential: V(x) = -V_0 / cosh²(x/a) + V_1 * tanh(x/a)
      const centerX = xCenter;
      const barrierHeight = hasBarrierHeight(this.model) ? this.model.barrierHeightProperty.value : 0;
      const numPoints = 200;
      let firstPoint = true;

      for (let i = 0; i < numPoints; i++) {
        const x =
          (xGrid[0]! + ((xGrid[xGrid.length - 1]! - xGrid[0]!) * i) / (numPoints - 1)) * QuantumConstants.M_TO_NM;
        const dx = x - centerX;
        const coshVal = Math.cosh(dx / wellWidth);
        const tanhVal = Math.tanh(dx / wellWidth);
        const V = -wellDepth / (coshVal * coshVal) + barrierHeight * tanhVal;

        const viewX = this.dataToViewX(x);
        const viewY = this.dataToViewY(V);

        if (firstPoint) {
          shape.moveTo(viewX, viewY);
          firstPoint = false;
        } else {
          shape.lineTo(viewX, viewY);
        }
      }
    } else if (potentialType === PotentialType.ECKART) {
      // Draw Eckart potential: V(x) = V_0 / (1 + exp(x/a))² - V_1 / (1 + exp(x/a))
      const centerX = xCenter;
      const barrierHeight = hasBarrierHeight(this.model) ? this.model.barrierHeightProperty.value : 0;
      const numPoints = 200;
      let firstPoint = true;

      for (let i = 0; i < numPoints; i++) {
        const x =
          (xGrid[0]! + ((xGrid[xGrid.length - 1]! - xGrid[0]!) * i) / (numPoints - 1)) * QuantumConstants.M_TO_NM;
        const dx = x - centerX;
        const expVal = Math.exp(dx / wellWidth);
        const denom = 1 + expVal;
        const V = wellDepth / (denom * denom) - barrierHeight / denom;

        const viewX = this.dataToViewX(x);
        const viewY = this.dataToViewY(V);

        if (firstPoint) {
          shape.moveTo(viewX, viewY);
          firstPoint = false;
        } else {
          shape.lineTo(viewX, viewY);
        }
      }
    } else if (potentialType === PotentialType.MULTI_SQUARE_WELL) {
      // Draw multi-square well (generalization of double square well)
      // Convention: V=0 in wells, V=wellDepth in barrier
      // Import ManyWellsModel to access numberOfWellsProperty
      const manyWellsModel = this.model as import("../../many-wells/model/ManyWellsModel.js").ManyWellsModel;
      const numberOfWells = "numberOfWellsProperty" in manyWellsModel ? manyWellsModel.numberOfWellsProperty.value : 3;
      const separationParam =
        "wellSeparationProperty" in manyWellsModel ? manyWellsModel.wellSeparationProperty.value : 0.2;
      const electricField =
        "electricFieldProperty" in manyWellsModel ? manyWellsModel.electricFieldProperty.value : 0.0;

      // Calculate the natural total span needed
      const maxVisibleRange = 7.5; // Use 7.5nm of the 8nm available range (leave small margins)

      // Start with a base scaling for separation
      let effectiveSeparation = separationParam * 10;
      let effectiveWellWidth = wellWidth;

      // Calculate what the total span would be
      const naturalSpan = numberOfWells * effectiveWellWidth + (numberOfWells - 1) * effectiveSeparation;

      // If it exceeds the visible range, scale everything down proportionally
      if (naturalSpan > maxVisibleRange) {
        const scaleFactor = maxVisibleRange / naturalSpan;
        effectiveSeparation *= scaleFactor;
        effectiveWellWidth *= scaleFactor;
      }

      // Calculate total span and center the wells
      const totalSpan = numberOfWells * effectiveWellWidth + (numberOfWells - 1) * effectiveSeparation;
      const startX = -totalSpan / 2;

      // Helper function to get potential with electric field tilt
      const getV = (x: number, baseV: number) => baseV - electricField * x;

      // Start from left at barrier height (with field tilt)
      const leftmostX = this.xMinProperty.value;
      shape.moveTo(this.chartMargins.left, this.dataToViewY(getV(leftmostX, wellDepth)));

      // Draw each well
      for (let i = 0; i < numberOfWells; i++) {
        const wellLeft = startX + i * (effectiveWellWidth + effectiveSeparation);
        const wellRight = wellLeft + effectiveWellWidth;

        // Drop into well (with field tilt)
        shape.lineTo(this.dataToViewX(wellLeft), this.dataToViewY(getV(wellLeft, wellDepth)));
        shape.lineTo(this.dataToViewX(wellLeft), this.dataToViewY(getV(wellLeft, 0)));
        shape.lineTo(this.dataToViewX(wellRight), this.dataToViewY(getV(wellRight, 0)));
        shape.lineTo(this.dataToViewX(wellRight), this.dataToViewY(getV(wellRight, wellDepth)));

        // Barrier between wells (except after last well)
        if (i < numberOfWells - 1) {
          const barrierRight = wellRight + effectiveSeparation;
          shape.lineTo(this.dataToViewX(barrierRight), this.dataToViewY(getV(barrierRight, wellDepth)));
        }
      }

      // Right outside region (with field tilt)
      const rightmostX = this.xMaxProperty.value;
      shape.lineTo(this.chartWidth - this.chartMargins.right, this.dataToViewY(getV(rightmostX, wellDepth)));
    } else if (potentialType === PotentialType.MULTI_COULOMB_1D) {
      // Draw multi-Coulomb 1D potential (multiple Coulomb centers)
      const manyWellsModel = this.model as import("../../many-wells/model/ManyWellsModel.js").ManyWellsModel;
      const numberOfWells = "numberOfWellsProperty" in manyWellsModel ? manyWellsModel.numberOfWellsProperty.value : 3;
      const separationParam =
        "wellSeparationProperty" in manyWellsModel ? manyWellsModel.wellSeparationProperty.value : 0.2;
      const electricField =
        "electricFieldProperty" in manyWellsModel ? manyWellsModel.electricFieldProperty.value : 0.0;

      const numPoints = 200;
      let firstPoint = true;

      // Calculate positions of Coulomb centers
      // Ensure they fit within the visible range of -4nm to 4nm
      const maxVisibleRange = 7.5; // Use 7.5nm of the 8nm available range

      // Start with base scaling
      let effectiveSeparation = separationParam * 10;

      // Calculate natural span
      const naturalSpan = (numberOfWells - 1) * effectiveSeparation;

      // Scale down if needed to fit within visible range
      if (naturalSpan > maxVisibleRange) {
        effectiveSeparation = maxVisibleRange / (numberOfWells - 1);
      }

      const totalSpan = (numberOfWells - 1) * effectiveSeparation;
      const centers: number[] = [];
      for (let i = 0; i < numberOfWells; i++) {
        centers.push(-totalSpan / 2 + i * effectiveSeparation);
      }

      // Scale factor for Coulomb strength
      const k = wellDepth * (wellWidth / 2);

      for (let i = 0; i < numPoints; i++) {
        const x =
          (xGrid[0]! + ((xGrid[xGrid.length - 1]! - xGrid[0]!) * i) / (numPoints - 1)) * QuantumConstants.M_TO_NM;

        // Sum contributions from all Coulomb centers
        let V = 0;
        for (const center of centers) {
          const dx = x - center;
          const distance = Math.max(Math.abs(dx), 0.01); // Avoid singularity
          V += -k / distance;
        }

        // Add electric field tilt: V_field(x) = -E * x
        V += -electricField * x;

        // Clamp V to reasonable range for display
        const VClamped = Math.max(V, this.yMinProperty.value);

        const viewX = this.dataToViewX(x);
        const viewY = this.dataToViewY(VClamped);

        if (firstPoint) {
          shape.moveTo(viewX, viewY);
          firstPoint = false;
        } else {
          shape.lineTo(viewX, viewY);
        }
      }
    } else {
      // For other potential types, draw a placeholder
      const y0 = this.dataToViewY(0);
      shape.moveTo(this.chartMargins.left, y0);
      shape.lineTo(this.chartWidth - this.chartMargins.right, y0);
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

    this.energyLabelNodes.forEach((label, index) => {
      const isHovered = index === this.hoveredEnergyLevelIndex;
      label.visible = isHovered;
    });
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

    // Remove old energy label nodes
    for (const label of this.energyLabelNodes.values()) {
      this.removeChild(label);
    }
    this.energyLabelNodes.clear();

    this.removeEnergyLevelHitAreas();

    // Create new energy level lines
    const energies = boundStates.energies.map((e) => e * QuantumConstants.JOULES_TO_EV);
    const x1 = this.chartMargins.left;
    const x2 = this.chartWidth - this.chartMargins.right;

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

      // Add click handler to hit area
      hitArea.addInputListener({
        down: () => {
          // Only set if index is within valid range
          if (index >= 0 && index < boundStates.energies.length) {
            this.model.selectedEnergyLevelIndexProperty.value = index;
          }
        },
        click: () => {
          // Also handle click events for mouse users
          if (index >= 0 && index < boundStates.energies.length) {
            this.model.selectedEnergyLevelIndexProperty.value = index;
          }
        },
        enter: () => {
          this.hoveredEnergyLevelIndex = index;
          this.updateEnergyLevelStyling();
        },
        exit: () => {
          this.hoveredEnergyLevelIndex = null;
          this.updateEnergyLevelStyling();
        },
      });

      this.energyLevelNodes.set(index, line);
      this.plotContentNode.addChild(line); // Add to clipped content
      this.plotContentNode.addChild(hitArea); // Add hit area on top

      // Add energy label (outside clipped area for visibility)
      // Use template string from i18n: "E{{level}} = {{value}} eV"
      const template = stringManager.energyLevelLabelStringProperty.value;
      const labelText = template.replace("{{level}}", (index + 1).toString()).replace("{{value}}", energy.toFixed(3));
      const label = new Text(labelText, {
        font: "10px sans-serif",
        fill: QPPWColors.labelFillProperty,
        left: x2 + 5,
        centerY: y,
        visible: isHovered, // Only show when hovering
      });
      this.energyLabelNodes.set(index, label);
      this.addChild(label);
    });

    // Ensure total energy line and legend are on top
    this.totalEnergyLine.moveToFront();
    this.legendNode.moveToFront();
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
    this.zeroLine.visible = potentialType !== PotentialType.COULOMB_1D && potentialType !== PotentialType.COULOMB_3D;
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
