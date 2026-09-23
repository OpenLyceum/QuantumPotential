/**
 * QPPWPreferencesNode — content of Preferences → Simulation: auto-pause, the numerical method used
 * by the Schrödinger solver, and the solver grid size.
 */

import { NumberProperty, PatternStringProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2, Range } from "scenerystack/dot";
import { HBox, HStrut, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox, HSlider, VerticalAquaRadioButtonGroup } from "scenerystack/sun";
import { NumericalMethod } from "../common/model/NumericalMethod.js";
import stringManager from "../i18n/StringManager.js";
import QPPWColors from "../QPPWColors.js";
import QPPWPreferences from "./QPPWPreferencesModel.js";
import { GRID_POINTS_VALUES } from "./qppwQueryParameters.js";

const TITLE_FONT = new PhetFont({ size: 16, weight: "bold" });
const DESCRIPTION_FONT = new PhetFont(12);
const TEXT_MAX_WIDTH = 600;

// The grid-points slider moves over the exponent: 2^5 = 32 … 2^9 = 512.
const MIN_EXPONENT = Math.log2(GRID_POINTS_VALUES[0]);
const MAX_EXPONENT = Math.log2(GRID_POINTS_VALUES[GRID_POINTS_VALUES.length - 1]!);

export class QPPWPreferencesNode extends VBox {
  public constructor() {
    const preferencesLabels = stringManager.getPreferencesLabels();

    // Auto-pause preference
    const autoPauseSection = new VBox({
      align: "left",
      spacing: 8,
      children: [
        new Checkbox(
          QPPWPreferences.autoPauseWhenTabHiddenProperty,
          new Text(preferencesLabels.autoPauseWhenTabHiddenStringProperty, { font: new PhetFont(16) }),
          { boxWidth: 16 },
        ),
        new Text(preferencesLabels.autoPauseDescriptionStringProperty, {
          font: DESCRIPTION_FONT,
          maxWidth: TEXT_MAX_WIDTH,
        }),
      ],
    });

    super({
      align: "left",
      spacing: 20,
      children: [
        autoPauseSection,
        new HStrut(650), // minimum width
        QPPWPreferencesNode.createNumericalMethodSection(),
        QPPWPreferencesNode.createGridPointsSection(),
      ],
    });
  }

  private static createNumericalMethodSection(): VBox {
    const preferencesLabels = stringManager.getPreferencesLabels();
    const names = stringManager.getNumericalMethodNames();
    const descriptions = stringManager.getNumericalMethodDescriptions();

    const methods: Array<{
      value: NumericalMethod;
      name: TReadOnlyProperty<string>;
      description: TReadOnlyProperty<string>;
      tandemName: string;
    }> = [
      {
        value: NumericalMethod.NUMEROV,
        name: names.numerovStringProperty,
        description: descriptions.numerovStringProperty,
        tandemName: "numerovRadioButton",
      },
      {
        value: NumericalMethod.MATRIX_NUMEROV,
        name: names.matrixNumerovStringProperty,
        description: descriptions.matrixNumerovStringProperty,
        tandemName: "matrixNumerovRadioButton",
      },
      {
        value: NumericalMethod.DVR,
        name: names.dvrStringProperty,
        description: descriptions.dvrStringProperty,
        tandemName: "dvrRadioButton",
      },
      {
        value: NumericalMethod.FGH,
        name: names.fghStringProperty,
        description: descriptions.fghStringProperty,
        tandemName: "fghRadioButton",
      },
      {
        value: NumericalMethod.SPECTRAL,
        name: names.spectralStringProperty,
        description: descriptions.spectralStringProperty,
        tandemName: "spectralRadioButton",
      },
      {
        value: NumericalMethod.QUANTUM_BOUND,
        name: names.quantumBoundStringProperty,
        description: descriptions.quantumBoundStringProperty,
        tandemName: "quantumBoundRadioButton",
      },
    ];

    const radioButtonGroup = new VerticalAquaRadioButtonGroup(
      QPPWPreferences.numericalMethodProperty,
      methods.map(({ value, name, description, tandemName }) => ({
        value,
        tandemName,
        createNode: () =>
          new VBox({
            align: "left",
            spacing: 4,
            children: [
              new Text(name, { font: new PhetFont(14) }),
              new Text(description, {
                font: new PhetFont(11),
                fill: QPPWColors.preferencesDescriptionTextProperty,
                maxWidth: 550,
              }),
            ],
          }),
      })),
      {
        spacing: 12,
        radioButtonOptions: { radius: 8 },
      },
    );

    return new VBox({
      align: "left",
      spacing: 12,
      children: [
        new Text(preferencesLabels.numericalMethodStringProperty, { font: TITLE_FONT }),
        new Text(preferencesLabels.numericalMethodDescriptionStringProperty, {
          font: DESCRIPTION_FONT,
          maxWidth: TEXT_MAX_WIDTH,
        }),
        radioButtonGroup,
      ],
    });
  }

  private static createGridPointsSection(): VBox {
    const preferencesLabels = stringManager.getPreferencesLabels();
    const gridPointsProperty = QPPWPreferences.gridPointsProperty;

    // Snap a non-power-of-two starting value onto the slider's range.
    const initialExponent = Math.max(
      MIN_EXPONENT,
      Math.min(MAX_EXPONENT, Math.round(Math.log2(gridPointsProperty.value))),
    );
    const correctedGridPoints = 2 ** initialExponent;
    if (gridPointsProperty.value !== correctedGridPoints) {
      gridPointsProperty.value = correctedGridPoints;
    }

    const exponentProperty = new NumberProperty(initialExponent, {
      range: new Range(MIN_EXPONENT, MAX_EXPONENT),
    });

    // Bidirectional sync between exponent and grid points. lazyLink avoids firing during
    // initialization; the flag prevents the two listeners from re-entering each other.
    let isUpdating = false;
    exponentProperty.lazyLink((exponent: number) => {
      if (isUpdating) {
        return;
      }
      isUpdating = true;
      const gridPoints = 2 ** Math.round(exponent);
      if (gridPointsProperty.value !== gridPoints) {
        gridPointsProperty.value = gridPoints;
      }
      isUpdating = false;
    });
    gridPointsProperty.lazyLink((gridPoints: number) => {
      if (isUpdating) {
        return;
      }
      isUpdating = true;
      const exponent = Math.log2(gridPoints);
      if (!Number.isNaN(exponent) && exponentProperty.value !== exponent) {
        exponentProperty.value = exponent;
      }
      isUpdating = false;
    });

    const slider = new HSlider(exponentProperty, exponentProperty.range, {
      trackSize: new Dimension2(400, 5),
      thumbSize: new Dimension2(20, 40),
      majorTickLength: 15,
      minorTickLength: 10,
      constrainValue: (value: number) => Math.round(value),
    });
    for (const gridPoints of GRID_POINTS_VALUES) {
      slider.addMajorTick(Math.log2(gridPoints), new Text(`${gridPoints}`, { font: DESCRIPTION_FONT }));
    }

    const valueText = new Text(
      new PatternStringProperty(stringManager.valueWithPointsStringProperty, { value: gridPointsProperty }),
      { font: new PhetFont({ size: 14, weight: "bold" }) },
    );

    return new VBox({
      align: "left",
      spacing: 12,
      children: [
        new Text(preferencesLabels.gridPointsStringProperty, { font: TITLE_FONT }),
        new Text(preferencesLabels.gridPointsDescriptionStringProperty, {
          font: DESCRIPTION_FONT,
          maxWidth: TEXT_MAX_WIDTH,
        }),
        new HBox({ spacing: 15, children: [slider, valueText] }),
      ],
    });
  }
}
