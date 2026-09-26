/**
 * The mean-and-spread overlay shared by the probability density and wavenumber charts: a double arrow from
 * ⟨q⟩ − σ to ⟨q⟩ + σ, an optional dashed line at ⟨q⟩, and "⟨q⟩ = …" / "σ = …" readouts. The readouts are
 * PatternStringProperties, so they follow language changes without a redraw.
 */

import { NumberProperty, PatternStringProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Line, type Node, Path, RichText, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import QPPWColors from "../../QPPWColors.js";
import { createDoubleArrowShape } from "./RMSIndicatorUtils.js";

export type StatisticsIndicatorOptions = {
  /** Pattern with a {{value}} placeholder for the mean. */
  averagePatternStringProperty: TReadOnlyProperty<string>;
  /** Pattern with a {{value}} placeholder for the spread (may contain RichText markup). */
  spreadPatternStringProperty: TReadOnlyProperty<string>;
  /** Draw a dashed vertical line at the mean. */
  showAverageLine: boolean;
  /** Top-left corner of the readouts, in the chart's coordinates. */
  labelLeft: number;
  labelTop: number;
};

/** The chart geometry the marks are drawn in: data → view x, and the view y of the plot's top and bottom. */
export type StatisticsIndicatorGeometry = {
  dataToViewX: (x: number) => number;
  yTop: number;
  yBottom: number;
  arrowY: number;
};

export class StatisticsIndicator {
  private readonly averageProperty = new NumberProperty(0);
  private readonly spreadProperty = new NumberProperty(0);
  private readonly averageLine: Line | null;
  private readonly spreadArrow: Path;
  private readonly averageLabel: Text;
  private readonly spreadLabel: RichText;

  /**
   * @param plotLayer - receives the arrow and line (clipped with the plot)
   * @param labelLayer - receives the readouts
   */
  public constructor(plotLayer: Node, labelLayer: Node, options: StatisticsIndicatorOptions) {
    this.averageLine = options.showAverageLine
      ? new Line(0, 0, 0, 0, {
          stroke: QPPWColors.energyLevelSelectedProperty,
          lineWidth: 2,
          lineDash: [8, 4],
          pickable: false,
        })
      : null;
    if (this.averageLine) {
      plotLayer.addChild(this.averageLine);
    }

    this.spreadArrow = new Path(null, {
      stroke: QPPWColors.energyLevelSelectedProperty,
      lineWidth: 2,
      fill: QPPWColors.energyLevelSelectedProperty,
      pickable: false,
    });
    plotLayer.addChild(this.spreadArrow);

    this.averageLabel = new Text(
      new PatternStringProperty(
        options.averagePatternStringProperty,
        { value: this.averageProperty },
        { decimalPlaces: 2 },
      ),
      {
        font: new PhetFont(12),
        fill: QPPWColors.labelFillProperty,
        left: options.labelLeft,
        top: options.labelTop,
        pickable: false,
      },
    );
    labelLayer.addChild(this.averageLabel);

    this.spreadLabel = new RichText(
      new PatternStringProperty(
        options.spreadPatternStringProperty,
        { value: this.spreadProperty },
        { decimalPlaces: 2 },
      ),
      {
        font: new PhetFont(12),
        fill: QPPWColors.labelFillProperty,
        left: options.labelLeft,
        top: options.labelTop + 20,
        pickable: false,
      },
    );
    labelLayer.addChild(this.spreadLabel);

    this.hide();
  }

  /** Shows the mean ± spread (data units) in the given chart geometry. */
  public show(average: number, spread: number, geometry: StatisticsIndicatorGeometry): void {
    this.averageProperty.value = average;
    this.spreadProperty.value = spread;

    const averageX = geometry.dataToViewX(average);
    this.averageLine?.setLine(averageX, geometry.yTop, averageX, geometry.yBottom);
    this.spreadArrow.shape = createDoubleArrowShape(
      geometry.dataToViewX(average - spread),
      geometry.dataToViewX(average + spread),
      geometry.arrowY,
    );
    this.setVisible(true);
  }

  public hide(): void {
    this.setVisible(false);
  }

  private setVisible(visible: boolean): void {
    if (this.averageLine) {
      this.averageLine.visible = visible;
    }
    this.spreadArrow.visible = visible;
    this.averageLabel.visible = visible;
    this.spreadLabel.visible = visible;
  }
}
