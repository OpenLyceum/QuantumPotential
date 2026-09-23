/**
 * IntroControlPanelNode is a simplified control panel for the intro screen.
 * It excludes the superposition combo box and phase color display mode.
 */

import { StringUtils } from "scenerystack/phetcommon";
import { HBox, HSeparator, Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox, ComboBox, type ComboBoxItem, HSlider } from "scenerystack/sun";
import { PotentialType } from "../../common/model/PotentialFunction.js";
import { PANEL_CHECKBOX_OPTIONS, PANEL_SLIDER_OPTIONS } from "../../common/QPPWControlOptions.js";
import { QPPWPanel } from "../../common/QPPWPanel.js";
import isDevMode from "../../common/utils/isDevMode.js";
import { QPPWDescriber } from "../../common/view/accessibility/QPPWDescriber.js";
import { QPPWNumberControl } from "../../common/view/QPPWNumberControl.js";
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
      {
        value: PotentialType.COULOMB_3D,
        createNode: () =>
          new Text(stringManager.coulomb3DStringProperty, {
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

    // No superposition dropdown in intro screen

    const children: Node[] = [titleText, potentialRowNode];

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
        deltaValue: 0.05,
        decimalPlaces: 2,
        valuePattern: stringManager.valueWithElectronMassStringProperty,
        accessibleName: QPPWDescriber.getParameterNameProperty("particleMass"),
      },
    );

    // The geometric parameters are dragged with the handles on the energy chart; these sliders are for ?dev only
    // Well Width slider
    const widthValueText = new Text("", {
      font: new PhetFont(12),
      fill: QPPWColors.textFillProperty,
    });

    this.model.wellWidthProperty.link((width: number) => {
      widthValueText.string = StringUtils.fillIn(stringManager.valueWithNanometersStringProperty, {
        value: width.toFixed(2),
      });
    });

    const widthSlider = new HSlider(this.model.wellWidthProperty, this.model.wellWidthProperty.range!, {
      ...PANEL_SLIDER_OPTIONS,

      // PDOM
      accessibleName: QPPWDescriber.getParameterNameProperty("wellWidth"),
      descriptionContent: QPPWDescriber.getSliderHelpText("wellWidth"),
    });

    const widthRowVBox = new VBox({
      spacing: 4,
      align: "left",
      children: [
        new Text(stringManager.wellWidthStringProperty, {
          font: new PhetFont(12),
          fill: QPPWColors.textFillProperty,
        }),
        new HBox({
          spacing: 10,
          children: [widthSlider, widthValueText],
        }),
      ],
    });

    // Well Depth slider
    const depthValueText = new Text("", {
      font: new PhetFont(12),
      fill: QPPWColors.textFillProperty,
    });

    this.model.wellDepthProperty.link((depth: number) => {
      depthValueText.string = StringUtils.fillIn(stringManager.valueWithElectronVoltsStringProperty, {
        value: depth.toFixed(2),
      });
    });

    const depthSlider = new HSlider(this.model.wellDepthProperty, this.model.wellDepthProperty.range!, {
      ...PANEL_SLIDER_OPTIONS,

      // PDOM
      accessibleName: QPPWDescriber.getParameterNameProperty("wellDepth"),
      descriptionContent: QPPWDescriber.getSliderHelpText("wellDepth"),
    });

    const depthRowVBox = new VBox({
      spacing: 4,
      align: "left",
      children: [
        new Text(stringManager.wellDepthStringProperty, {
          font: new PhetFont(12),
          fill: QPPWColors.textFillProperty,
        }),
        new HBox({
          spacing: 10,
          children: [depthSlider, depthValueText],
        }),
      ],
    });

    // Barrier Height slider (only for Rosen-Morse and Eckart potentials)
    const barrierHeightValueText = new Text("", {
      font: new PhetFont(12),
      fill: QPPWColors.textFillProperty,
    });

    this.model.barrierHeightProperty.link((height: number) => {
      barrierHeightValueText.string = StringUtils.fillIn(stringManager.valueWithElectronVoltsStringProperty, {
        value: height.toFixed(2),
      });
    });

    const barrierHeightSlider = new HSlider(this.model.barrierHeightProperty, this.model.barrierHeightProperty.range!, {
      ...PANEL_SLIDER_OPTIONS,

      // PDOM
      accessibleName: QPPWDescriber.getParameterNameProperty("barrierHeight"),
      descriptionContent: QPPWDescriber.getSliderHelpText("barrierHeight"),
    });

    const barrierHeightRowVBox = new VBox({
      spacing: 4,
      align: "left",
      children: [
        new Text(stringManager.barrierHeightStringProperty, {
          font: new PhetFont(12),
          fill: QPPWColors.textFillProperty,
        }),
        new HBox({
          spacing: 10,
          children: [barrierHeightSlider, barrierHeightValueText],
        }),
      ],
    });

    // Potential Offset slider (only for triangular potential)
    const offsetValueText = new Text("", {
      font: new PhetFont(12),
      fill: QPPWColors.textFillProperty,
    });

    this.model.potentialOffsetProperty.link((offset: number) => {
      offsetValueText.string = StringUtils.fillIn(stringManager.valueWithElectronVoltsStringProperty, {
        value: offset.toFixed(2),
      });
    });

    const offsetSlider = new HSlider(this.model.potentialOffsetProperty, this.model.potentialOffsetProperty.range!, {
      ...PANEL_SLIDER_OPTIONS,

      // PDOM
      accessibleName: QPPWDescriber.getParameterNameProperty("potentialOffset"),
      descriptionContent: QPPWDescriber.getSliderHelpText("potentialOffset"),
    });

    const offsetRowVBox = new VBox({
      spacing: 4,
      align: "left",
      children: [
        new Text(stringManager.potentialOffsetStringProperty, {
          font: new PhetFont(12),
          fill: QPPWColors.textFillProperty,
        }),
        new HBox({
          spacing: 10,
          children: [offsetSlider, offsetValueText],
        }),
      ],
    });

    // Show/hide sliders based on potential type
    this.model.potentialTypeProperty.link((type: PotentialType) => {
      // Depth slider visibility
      const showDepth =
        type === PotentialType.FINITE_WELL ||
        type === PotentialType.HARMONIC_OSCILLATOR ||
        type === PotentialType.MORSE ||
        type === PotentialType.POSCHL_TELLER ||
        type === PotentialType.ROSEN_MORSE ||
        type === PotentialType.ECKART ||
        type === PotentialType.ASYMMETRIC_TRIANGLE ||
        type === PotentialType.TRIANGULAR ||
        type === PotentialType.COULOMB_1D ||
        type === PotentialType.COULOMB_3D;
      depthRowVBox.visible = showDepth;

      // Barrier height slider visibility (only for Rosen-Morse and Eckart)
      const showBarrierHeight = type === PotentialType.ROSEN_MORSE || type === PotentialType.ECKART;
      barrierHeightRowVBox.visible = showBarrierHeight;

      // Offset slider visibility (only for triangular potential)
      const showOffset = type === PotentialType.TRIANGULAR;
      offsetRowVBox.visible = showOffset;
    });

    const children: Node[] = [titleText, massControl];
    if (isDevMode()) {
      children.push(widthRowVBox, depthRowVBox, barrierHeightRowVBox, offsetRowVBox);
    }
    return new VBox({ spacing: 8, align: "left", children: children });
  }
}
