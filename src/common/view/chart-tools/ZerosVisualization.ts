/**
 * ZerosVisualization displays markers at the zeros (nodes) of the wavefunction.
 * These are points where the wavefunction crosses zero.
 */

import { BooleanProperty, DerivedProperty, Property } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { Circle, Node } from "scenerystack/scenery";
import stringManager from "../../../i18n/StringManager.js";
import QPPWColors from "../../../QPPWColors.js";
import QuantumConstants from "../../model/QuantumConstants.js";

export type ZerosVisualizationOptions = {
  dataToViewX: (x: number) => number;
  dataToViewY: (y: number) => number;
};

const tools = stringManager.getA11yStrings().tools;

export class ZerosVisualization extends Node {
  private readonly options: ZerosVisualizationOptions;
  public readonly showProperty: BooleanProperty;
  private readonly container: Node;
  private readonly zerosPositionsProperty: Property<number[]>;
  private readonly accessibleDescription: Node;

  constructor(options: ZerosVisualizationOptions) {
    super({
      // pdom - container for zeros visualization
      tagName: "div",
      labelTagName: "h3",
      labelContent: tools.zerosHeadingStringProperty,
    });

    this.options = options;
    this.showProperty = new BooleanProperty(false);
    this.zerosPositionsProperty = new Property<number[]>([]);

    // Create accessible description with live region
    this.accessibleDescription = new Node({
      tagName: "div",
      ariaRole: "status",
      pdomAttributes: [{ attribute: "aria-live", value: "polite" }],
      innerContent: new DerivedProperty([this.showProperty, this.zerosPositionsProperty], (show, zeros) => {
        if (!show || zeros.length === 0) {
          return "";
        }
        const positions = zeros.map((z) => z.toFixed(2)).join(", ");
        return zeros.length === 1
          ? StringUtils.fillIn(tools.zerosOnePatternStringProperty, { positions: positions })
          : StringUtils.fillIn(tools.zerosPatternStringProperty, { count: zeros.length, positions: positions });
      }),
    });
    this.addChild(this.accessibleDescription);

    // Create container for visual circles
    this.container = new Node({
      visible: false,
    });
    this.addChild(this.container);

    // Link visibility to property
    this.showProperty.link((show: boolean) => {
      if (!show) {
        this.container.visible = false;
      }
    });
  }

  /**
   * Update the visualization with new wavefunction data
   */
  public update(xGrid: number[], wavefunction: number[]): void {
    // Clear existing zeros
    this.container.removeAllChildren();

    // Only show if enabled
    if (!this.showProperty.value) {
      this.container.visible = false;
      this.zerosPositionsProperty.value = [];
      return;
    }

    // Find zeros
    const zeros = this.findZeros(xGrid, wavefunction);

    // Update the accessible description with zero positions
    this.zerosPositionsProperty.value = zeros;

    // Create circles at each zero position
    for (const zeroX of zeros) {
      const x = this.options.dataToViewX(zeroX);
      const y = this.options.dataToViewY(0); // Zeros are at y=0

      const circle = new Circle(4, {
        fill: QPPWColors.energyLevelSelectedProperty,
        stroke: QPPWColors.backgroundColorProperty,
        lineWidth: 1.5,
        centerX: x,
        centerY: y,
      });

      this.container.addChild(circle);
    }

    this.container.visible = zeros.length > 0;
  }

  /**
   * Finds zeros (sign changes) in the wavefunction.
   * Uses linear interpolation for accurate zero positions.
   */
  private findZeros(xGrid: number[], wavefunction: number[]): number[] {
    const zeros: number[] = [];

    for (let i = 0; i < wavefunction.length - 1; i++) {
      const y1 = wavefunction[i]!;
      const y2 = wavefunction[i + 1]!;

      // Check for sign change (zero crossing)
      if (y1 * y2 < 0) {
        // Linear interpolation to find more accurate zero position
        const x1 = xGrid[i]!;
        const x2 = xGrid[i + 1]!;
        const zeroX = x1 - (y1 * (x2 - x1)) / (y2 - y1);
        zeros.push(zeroX * QuantumConstants.M_TO_NM); // Convert to nm
      }
    }

    return zeros;
  }
}
