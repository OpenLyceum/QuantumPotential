/**
 * IntroControlPanelNode is a simplified control panel for the intro screen.
 * It excludes the superposition controls and phase color display mode.
 */

import { HBox, HSeparator, Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox, ComboBox, type ComboBoxItem } from "scenerystack/sun";
import { PotentialType } from "../../common/model/PotentialFunction.js";
import { PANEL_CHECKBOX_OPTIONS } from "../../common/QPPWControlOptions.js";
import { QPPWPanel } from "../../common/QPPWPanel.js";
import { QPPWDescriber } from "../../common/view/accessibility/QPPWDescriber.js";
import { EnergyLevelControl } from "../../common/view/EnergyLevelControl.js";
import { PARTICLE_MASS_STEP_OPTIONS, QPPWNumberControl } from "../../common/view/QPPWNumberControl.js";
import type { WaveFunctionChartNode } from "../../common/view/WaveFunctionChartNode.js";
import stringManager from "../../i18n/StringManager.js";
import QPPWColors from "../../QPPWColors.js";
import type { IntroModel } from "../model/IntroModel.js";
import type { IntroViewState } from "./IntroViewState.js";

export class IntroControlPanelNode extends Node {
  private readonly model: IntroModel;
  private readonly viewState: IntroViewState;
  private readonly probabilityChartNode: WaveFunctionChartNode | undefined;

  public constructor(
    model: IntroModel,
    viewState: IntroViewState,
    listBoxParent: Node,
    probabilityChartNode?: WaveFunctionChartNode,
  ) {
    super();

    this.model = model;
    this.viewState = viewState;
    this.probabilityChartNode = probabilityChartNode;

    // Create all control groups
    const energyChartGroup = this.createEnergyChartGroup(listBoxParent);
    const bottomChartGroup = this.createBottomChartGroup();
    const wellConfigGroup = this.createWellConfigurationGroup();

    // Arrange groups vertically
    const children: Node[] = [
      energyChartGroup,
      new HSeparator({ stroke: QPPWColors.gridLineProperty }),
      bottomChartGroup,
      new HSeparator({ stroke: QPPWColors.gridLineProperty }),
      wellConfigGroup,
      new HSeparator({ stroke: QPPWColors.gridLineProperty }),
    ];

    // Arrange groups vertically
    const contentVBox = new VBox({
      spacing: 15,
      align: "left",
      children: children,
    });

    const controlPanel = new QPPWPanel(contentVBox);

    this.addChild(controlPanel);
  }

  /**
   * Creates the Energy Chart control group (without superposition).
   */
  private createEnergyChartGroup(listBoxParent: Node): Node {
    const titleText = new Text(stringManager.energyChartStringProperty, {
      font: new PhetFont({ size: 16, weight: "bold" }),
      fill: QPPWColors.textFillProperty,
    });

    // Potential Well dropdown - limited to intro-friendly potentials
    const potentialItems: ComboBoxItem<PotentialType>[] = [
      {
        value: PotentialType.INFINITE_WELL,
        createNode: () =>
          new Text(stringManager.squareInfiniteStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
      },
      {
        value: PotentialType.FINITE_WELL,
        createNode: () =>
          new Text(stringManager.squareFiniteStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
      },
      {
        value: PotentialType.HARMONIC_OSCILLATOR,
        createNode: () =>
          new Text(stringManager.harmonicOscillatorStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
      },
      {
        value: PotentialType.MORSE,
        createNode: () =>
          new Text(stringManager.morseStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
      },
      {
        value: PotentialType.POSCHL_TELLER,
        createNode: () =>
          new Text(stringManager.poschlTellerStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
      },
      {
        value: PotentialType.ROSEN_MORSE,
        createNode: () =>
          new Text(stringManager.rosenMorseStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
      },
      {
        value: PotentialType.ECKART,
        createNode: () =>
          new Text(stringManager.eckartStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
      },
      {
        value: PotentialType.ASYMMETRIC_TRIANGLE,
        createNode: () =>
          new Text(stringManager.asymmetricTriangleStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
      },
      {
        value: PotentialType.TRIANGULAR,
        createNode: () =>
          new Text(stringManager.triangularStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
      },
      {
        value: PotentialType.COULOMB_1D,
        createNode: () =>
          new Text(stringManager.coulomb1DStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
      },
    ];

    const potentialComboBox = new ComboBox(this.model.potentialTypeProperty, potentialItems, listBoxParent, {
      xMargin: 8,
      yMargin: 6,
      cornerRadius: 4,
      buttonFill: QPPWColors.controlPanelBackgroundColorProperty,
      buttonStroke: QPPWColors.controlPanelStrokeColorProperty,
      listFill: QPPWColors.controlPanelBackgroundColorProperty,
      listStroke: QPPWColors.controlPanelStrokeColorProperty,
      highlightFill: QPPWColors.controlPanelStrokeColorProperty,
    });

    const potentialLabelText = new Text(stringManager.potentialWellStringProperty, {
      font: new PhetFont(14),
      fill: QPPWColors.textFillProperty,
    });

    const potentialRowNode = new HBox({
      spacing: 10,
      children: [potentialLabelText, potentialComboBox],
    });

    // No superposition controls in intro screen

    const children: Node[] = [
      titleText,
      potentialRowNode,
      new EnergyLevelControl(this.model),
      new Checkbox(
        this.viewState.showEnergyValuesProperty,
        new Text(stringManager.valuesStringProperty, { font: new PhetFont(12), fill: QPPWColors.textFillProperty }),
        { ...PANEL_CHECKBOX_OPTIONS },
      ),
    ];

    return new VBox({
      spacing: 8,
      align: "left",
      children: children,
    });
  }

  /**
   * Creates the Bottom Chart control group (for probability density chart only).
   * Display mode controls removed since intro screen shows both charts separately.
   */
  private createBottomChartGroup(): Node {
    // Classical probability checkbox
    const classicalProbabilityCheckboxContent = new Checkbox(
      this.viewState.showClassicalProbabilityProperty,
      new Text(stringManager.classicalProbabilityDensityStringProperty, {
        font: new PhetFont(12),
        fill: QPPWColors.textFillProperty,
      }),
      { ...PANEL_CHECKBOX_OPTIONS },
    );

    const classicalProbabilityCheckbox = new Node({
      children: [classicalProbabilityCheckboxContent],
      x: 20,
    });

    // Show Zeros checkbox
    const showZerosCheckboxContent = new Checkbox(
      this.viewState.showZerosProperty,
      new Text(stringManager.showZerosStringProperty, {
        font: new PhetFont(12),
        fill: QPPWColors.textFillProperty,
      }),
      { ...PANEL_CHECKBOX_OPTIONS },
    );

    const showZerosCheckbox = new Node({
      children: [showZerosCheckboxContent],
      x: 20,
    });

    // Area measurement tool checkbox (for probability density chart)
    const areaToolCheckboxContent = this.probabilityChartNode
      ? new Checkbox(
          this.probabilityChartNode.showAreaToolProperty,
          new Text(stringManager.getA11yStrings().visible.measureAreaStringProperty, {
            font: new PhetFont(12),
            fill: QPPWColors.textFillProperty,
          }),
          { ...PANEL_CHECKBOX_OPTIONS },
        )
      : null;

    const areaToolCheckbox = areaToolCheckboxContent
      ? new Node({
          children: [areaToolCheckboxContent],
          x: 20,
        })
      : null;

    // RMS indicator checkbox (controls visibility of average and RMS indicators on charts)
    // Note: Curvature and Derivative checkboxes are now integrated within the WaveFunctionChartNode
    const rmsIndicatorCheckboxContent = new Checkbox(
      this.viewState.showRMSIndicatorProperty,
      new Text(stringManager.getA11yStrings().visible.showAverageAndRmsStringProperty, {
        font: new PhetFont(12),
        fill: QPPWColors.textFillProperty,
      }),
      { ...PANEL_CHECKBOX_OPTIONS },
    );

    const rmsIndicatorCheckbox = new Node({
      children: [rmsIndicatorCheckboxContent],
      x: 20,
    });

    // Build children array (no display mode controls since intro screen shows separate charts)
    const children: Node[] = [classicalProbabilityCheckbox, showZerosCheckbox, rmsIndicatorCheckbox];

    // Add area tool checkbox if it exists
    if (areaToolCheckbox) {
      children.push(areaToolCheckbox);
    }

    return new VBox({
      spacing: 8,
      align: "left",
      children,
    });
  }

  /**
   * Creates the Well Configuration control group.
   */
  private createWellConfigurationGroup(): Node {
    const titleText = new Text(stringManager.wellConfigurationStringProperty, {
      font: new PhetFont({ size: 16, weight: "bold" }),
      fill: QPPWColors.textFillProperty,
    });

    // Particle mass has no handle on the potential, so it keeps a ◀ value ▶ control
    const massControl = new QPPWNumberControl(
      stringManager.particleMassStringProperty,
      this.model.particleMassProperty,
      {
        ...PARTICLE_MASS_STEP_OPTIONS,
        valuePattern: stringManager.valueWithElectronMassStringProperty,
        accessibleName: QPPWDescriber.getParameterNameProperty("particleMass"),
      },
    );

    const children: Node[] = [titleText, massControl];
    return new VBox({ spacing: 8, align: "left", children: children });
  }
}
