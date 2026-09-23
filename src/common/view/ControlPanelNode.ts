/**
 * ControlPanelNode builds the two control panels of the One, Two and Many Wells screens, in the layout of
 * PhET's Quantum Bound States:
 *  - energyPanel, beside the energy chart: potential, superposition, and the parameters that are not
 *    geometric features of the potential (particle mass, number of wells, electric field). The geometric
 *    parameters are dragged with handles on the potential itself; their sliders appear only with ?dev.
 *  - graphPanel, beside the wave-function chart: what the chart shows.
 */

import { DerivedProperty, type NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2 } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { Color, HBox, Line, Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont, SpectrumNode } from "scenerystack/scenery-phet";
import {
  Checkbox,
  ComboBox,
  type ComboBoxItem,
  HSlider,
  RectangularPushButton,
  VerticalAquaRadioButtonGroup,
} from "scenerystack/sun";
import stringManager from "../../i18n/StringManager.js";
import type { ManyWellsModel } from "../../many-wells/model/ManyWellsModel.js";
import type { ManyWellsViewState } from "../../many-wells/view/ManyWellsViewState.js";
import type { OneWellModel } from "../../one-well/model/OneWellModel.js";
import type { OneWellViewState } from "../../one-well/view/OneWellViewState.js";
import QPPWColors from "../../QPPWColors.js";
import type { TwoWellsModel } from "../../two-wells/model/TwoWellsModel.js";
import type { TwoWellsViewState } from "../../two-wells/view/TwoWellsViewState.js";
import {
  hasBarrierHeight,
  hasElectricField,
  hasPotentialOffset,
  hasWellSeparation,
  isManyWellsModel,
  isOneWellModel,
} from "../model/ModelTypeGuards.js";
import { PotentialType } from "../model/PotentialFunction.js";
import { SuperpositionType } from "../model/SuperpositionType.js";
import { FLAT_PANEL_PUSH_BUTTON_OPTIONS } from "../QPPWButtonOptions.js";
import { COMPACT_PANEL_SLIDER_OPTIONS, PANEL_CHECKBOX_OPTIONS } from "../QPPWControlOptions.js";
import { QPPWPanel } from "../QPPWPanel.js";
import isDevMode from "../utils/isDevMode.js";
import type { QPPWParameter } from "./accessibility/QPPWDescriber.js";
import { QPPWDescriber } from "./accessibility/QPPWDescriber.js";
import { phaseToReversedTwilight } from "./chart-tools/PhaseColormap.js";
import { EnergyLevelControl } from "./EnergyLevelControl.js";
import { QPPWNumberControl } from "./QPPWNumberControl.js";
import { SuperpositionDialog } from "./SuperpositionDialog.js";

const a11y = stringManager.getA11yStrings();

/** Fixed width of both panels, so they line up in a column beside the charts. */
export const CONTROL_PANEL_WIDTH = 250;
const CONTENT_WIDTH = CONTROL_PANEL_WIDTH - 2 * 12;

const TITLE_FONT = new PhetFont({ size: 14, weight: "bold" });

const COMBO_BOX_OPTIONS = {
  xMargin: 8,
  yMargin: 5,
  cornerRadius: 4,
  buttonFill: QPPWColors.controlPanelBackgroundColorProperty,
  buttonStroke: QPPWColors.controlPanelStrokeColorProperty,
  listFill: QPPWColors.controlPanelBackgroundColorProperty,
  listStroke: QPPWColors.controlPanelStrokeColorProperty,
  highlightFill: QPPWColors.controlPanelStrokeColorProperty,
};

/** Potential types with more than one well (they have a separation and, in Many Wells, a count and a field). */
const MULTI_WELL_TYPES: readonly PotentialType[] = [PotentialType.MULTI_SQUARE_WELL, PotentialType.MULTI_POSCHL_TELLER];

export type ControlPanelNodeOptions = {
  // Whether to show the particle mass control
  showParticleMass?: boolean;
  // Filter which potential types to show (if undefined, shows all)
  allowedPotentialTypes?: PotentialType[];
};

type ResolvedControlPanelNodeOptions = {
  showParticleMass: boolean;
  allowedPotentialTypes: PotentialType[] | undefined;
};

export class ControlPanelNode {
  public readonly energyPanel: Node;
  public readonly graphPanel: Node;

  private readonly model: OneWellModel | TwoWellsModel | ManyWellsModel;
  private readonly viewState: OneWellViewState | TwoWellsViewState | ManyWellsViewState;
  private readonly options: ResolvedControlPanelNodeOptions;

  public constructor(
    model: OneWellModel | TwoWellsModel | ManyWellsModel,
    viewState: OneWellViewState | TwoWellsViewState | ManyWellsViewState,
    listBoxParent: Node,
    providedOptions?: ControlPanelNodeOptions,
  ) {
    this.model = model;
    this.viewState = viewState;
    this.options = {
      showParticleMass: true,
      allowedPotentialTypes: undefined,
      ...providedOptions,
    };

    const energyChildren: Node[] = [
      this.createPotentialGroup(listBoxParent),
      this.createSuperpositionGroup(),
      new EnergyLevelControl(model),
      new Checkbox(
        this.viewState.showEnergyValuesProperty,
        new Text(stringManager.valuesStringProperty, { font: new PhetFont(12), fill: QPPWColors.textFillProperty }),
        { ...PANEL_CHECKBOX_OPTIONS },
      ),
    ];
    energyChildren.push(...this.createParameterControls());
    if (isDevMode()) {
      energyChildren.push(this.createDevSliders());
    }

    this.energyPanel = new QPPWPanel(new VBox({ spacing: 10, align: "left", children: energyChildren }), {
      minWidth: CONTROL_PANEL_WIDTH,
      maxWidth: CONTROL_PANEL_WIDTH,
      xMargin: 12,
      yMargin: 10,
    });

    this.graphPanel = new QPPWPanel(this.createGraphGroup(), {
      minWidth: CONTROL_PANEL_WIDTH,
      maxWidth: CONTROL_PANEL_WIDTH,
      xMargin: 12,
      yMargin: 10,
      accessibleHeading: stringManager.quantumStateGraphStringProperty,
    });
  }

  /**
   * Potential type combo box, with its label above it.
   */
  private createPotentialGroup(listBoxParent: Node): Node {
    // Potential Well dropdown - all available options
    const allPotentialItems: Array<ComboBoxItem<PotentialType>> = [
      {
        value: PotentialType.INFINITE_WELL,
        createNode: () =>
          new Text(stringManager.squareInfiniteStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getPotentialTypeNameProperty(PotentialType.INFINITE_WELL),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getPotentialTypeDescriptionProperty(PotentialType.INFINITE_WELL),
        },
      },
      {
        value: PotentialType.FINITE_WELL,
        createNode: () =>
          new Text(stringManager.squareFiniteStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getPotentialTypeNameProperty(PotentialType.FINITE_WELL),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getPotentialTypeDescriptionProperty(PotentialType.FINITE_WELL),
        },
      },
      {
        value: PotentialType.HARMONIC_OSCILLATOR,
        createNode: () =>
          new Text(stringManager.harmonicOscillatorStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getPotentialTypeNameProperty(PotentialType.HARMONIC_OSCILLATOR),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getPotentialTypeDescriptionProperty(PotentialType.HARMONIC_OSCILLATOR),
        },
      },
      {
        value: PotentialType.MORSE,
        createNode: () =>
          new Text(stringManager.morseStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getPotentialTypeNameProperty(PotentialType.MORSE),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getPotentialTypeDescriptionProperty(PotentialType.MORSE),
        },
      },
      {
        value: PotentialType.POSCHL_TELLER,
        createNode: () =>
          new Text(stringManager.poschlTellerStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getPotentialTypeNameProperty(PotentialType.POSCHL_TELLER),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getPotentialTypeDescriptionProperty(PotentialType.POSCHL_TELLER),
        },
      },
      {
        value: PotentialType.ROSEN_MORSE,
        createNode: () =>
          new Text(stringManager.rosenMorseStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getPotentialTypeNameProperty(PotentialType.ROSEN_MORSE),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getPotentialTypeDescriptionProperty(PotentialType.ROSEN_MORSE),
        },
      },
      {
        value: PotentialType.ECKART,
        createNode: () =>
          new Text(stringManager.eckartStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getPotentialTypeNameProperty(PotentialType.ECKART),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getPotentialTypeDescriptionProperty(PotentialType.ECKART),
        },
      },
      {
        value: PotentialType.ASYMMETRIC_TRIANGLE,
        createNode: () =>
          new Text(stringManager.asymmetricTriangleStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getPotentialTypeNameProperty(PotentialType.ASYMMETRIC_TRIANGLE),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getPotentialTypeDescriptionProperty(PotentialType.ASYMMETRIC_TRIANGLE),
        },
      },
      {
        value: PotentialType.TRIANGULAR,
        createNode: () =>
          new Text(stringManager.triangularStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getPotentialTypeNameProperty(PotentialType.TRIANGULAR),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getPotentialTypeDescriptionProperty(PotentialType.TRIANGULAR),
        },
      },
      {
        value: PotentialType.COULOMB_1D,
        createNode: () =>
          new Text(stringManager.coulomb1DStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getPotentialTypeNameProperty(PotentialType.COULOMB_1D),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getPotentialTypeDescriptionProperty(PotentialType.COULOMB_1D),
        },
      },
      {
        value: PotentialType.COULOMB_3D,
        createNode: () =>
          new Text(stringManager.coulomb3DStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getPotentialTypeNameProperty(PotentialType.COULOMB_3D),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getPotentialTypeDescriptionProperty(PotentialType.COULOMB_3D),
        },
      },
      {
        value: PotentialType.DOUBLE_SQUARE_WELL,
        createNode: () =>
          new Text(stringManager.doubleSquareWellStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getPotentialTypeNameProperty(PotentialType.DOUBLE_SQUARE_WELL),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getPotentialTypeDescriptionProperty(PotentialType.DOUBLE_SQUARE_WELL),
        },
      },
      {
        value: PotentialType.DOUBLE_POSCHL_TELLER,
        createNode: () =>
          new Text(stringManager.doublePoschlTellerStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getPotentialTypeNameProperty(PotentialType.DOUBLE_POSCHL_TELLER),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getPotentialTypeDescriptionProperty(PotentialType.DOUBLE_POSCHL_TELLER),
        },
      },
      {
        value: PotentialType.MULTI_SQUARE_WELL,
        createNode: () =>
          new Text(stringManager.multiSquareWellStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getPotentialTypeNameProperty(PotentialType.MULTI_SQUARE_WELL),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getPotentialTypeDescriptionProperty(PotentialType.MULTI_SQUARE_WELL),
        },
      },
      {
        value: PotentialType.MULTI_POSCHL_TELLER,
        createNode: () =>
          new Text(stringManager.multiPoschlTellerStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getPotentialTypeNameProperty(PotentialType.MULTI_POSCHL_TELLER),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getPotentialTypeDescriptionProperty(PotentialType.MULTI_POSCHL_TELLER),
        },
      },
    ];

    // Filter potential types if specified in options
    const potentialItems = this.options.allowedPotentialTypes
      ? allPotentialItems.filter((item) => this.options.allowedPotentialTypes!.includes(item.value))
      : allPotentialItems;

    const potentialComboBox = new ComboBox(this.model.potentialTypeProperty, potentialItems, listBoxParent, {
      ...COMBO_BOX_OPTIONS,

      // PDOM - make potential type selector keyboard accessible
      accessibleName: a11y.controls.potentialTypeStringProperty,
    });

    return new VBox({
      spacing: 4,
      align: "left",
      children: [
        new Text(stringManager.potentialWellStringProperty, {
          font: TITLE_FONT,
          fill: QPPWColors.textFillProperty,
          maxWidth: CONTENT_WIDTH,
        }),
        potentialComboBox,
      ],
    });
  }

  /** Simple states are direct choices; wavepackets are configured in the dialog. */
  private createSuperpositionGroup(): Node {
    const choice = (label: TReadOnlyProperty<string>, listener: () => void): Node =>
      new RectangularPushButton({
        ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
        content: new Text(label, { font: new PhetFont(12), fill: QPPWColors.textFillProperty }),
        accessibleName: label,
        listener,
      });
    const selectSimple = (type: SuperpositionType) => {
      this.model.superpositionTypeProperty.value = type;
      if (!isOneWellModel(this.model)) {
        const count = this.model.getBoundStates()?.energies.length ?? 0;
        const amplitudes = new Array(count).fill(0);
        if (count > 0) {
          amplitudes[0] = type === SuperpositionType.SINGLE || count === 1 ? 1 : 1 / Math.sqrt(2);
        }
        if (type === SuperpositionType.PSI_I_PSI_J && count > 1) {
          amplitudes[1] = 1 / Math.sqrt(2);
        }
        this.model.superpositionConfigProperty.value = {
          type,
          amplitudes,
          phases: new Array(count).fill(0),
        };
      }
    };

    return new VBox({
      spacing: 4,
      align: "left",
      children: [
        new Text(stringManager.superpositionStringProperty, {
          font: TITLE_FONT,
          fill: QPPWColors.textFillProperty,
          maxWidth: CONTENT_WIDTH,
        }),
        choice(stringManager.psiKStringProperty, () => selectSimple(SuperpositionType.SINGLE)),
        choice(stringManager.psiIPsiJStringProperty, () => selectSimple(SuperpositionType.PSI_I_PSI_J)),
        choice(stringManager.configureSuperpositionStringProperty, () => {
          const previousType = this.model.superpositionTypeProperty.value;
          new SuperpositionDialog(this.model, previousType).show();
        }),
      ],
    });
  }

  /**
   * ◀ value ▶ controls for the parameters that have no handle on the energy chart.
   */
  private createParameterControls(): Node[] {
    const controls: Node[] = [];

    if (this.options.showParticleMass) {
      controls.push(
        new QPPWNumberControl(stringManager.particleMassStringProperty, this.model.particleMassProperty, {
          deltaValue: 0.05,
          decimalPlaces: 2,
          valuePattern: stringManager.valueWithElectronMassStringProperty,
          accessibleName: QPPWDescriber.getParameterNameProperty("particleMass"),
        }),
      );
    }

    if (isManyWellsModel(this.model)) {
      const numberOfWellsControl = new QPPWNumberControl(
        stringManager.numberOfWellsStringProperty,
        this.model.numberOfWellsProperty,
        {
          deltaValue: 1,
          decimalPlaces: 0,
          accessibleName: QPPWDescriber.getParameterNameProperty("numberOfWells"),
        },
      );
      controls.push(numberOfWellsControl);
      this.model.potentialTypeProperty.link((type) => {
        numberOfWellsControl.visible = MULTI_WELL_TYPES.includes(type);
      });
    }

    if (hasElectricField(this.model)) {
      const electricFieldControl = new QPPWNumberControl(
        stringManager.electricFieldStringProperty,
        this.model.electricFieldProperty,
        {
          deltaValue: 0.05,
          decimalPlaces: 2,
          valuePattern: stringManager.valueWithElectronVoltsPerNanometerStringProperty,
          accessibleName: QPPWDescriber.getParameterNameProperty("electricField"),
        },
      );
      controls.push(electricFieldControl);
      this.model.potentialTypeProperty.link((type) => {
        electricFieldControl.visible = MULTI_WELL_TYPES.includes(type);
      });
    }

    return controls;
  }

  /**
   * Sliders for the geometric parameters, shown only with ?dev. In normal use these parameters are changed
   * with the handles on the potential in the energy chart.
   */
  private createDevSliders(): Node {
    const rows: Node[] = [];
    const addRow = (
      parameter: QPPWParameter,
      titleStringProperty: TReadOnlyProperty<string>,
      property: NumberProperty,
      pattern: TReadOnlyProperty<string>,
      decimalPlaces: number,
      isNeeded: (type: PotentialType) => boolean,
    ): void => {
      const valueText = new Text("", { font: new PhetFont(11), fill: QPPWColors.textFillProperty });
      property.link((value: number) => {
        valueText.string = StringUtils.fillIn(pattern, { value: value.toFixed(decimalPlaces) });
      });
      const row = new VBox({
        spacing: 2,
        align: "left",
        children: [
          new Text(titleStringProperty, { font: new PhetFont(11), fill: QPPWColors.textFillProperty }),
          new HBox({
            spacing: 6,
            children: [
              new HSlider(property, property.range, {
                ...COMPACT_PANEL_SLIDER_OPTIONS,
                accessibleName: QPPWDescriber.getParameterNameProperty(parameter),
                descriptionContent: QPPWDescriber.getSliderHelpText(parameter),
              }),
              valueText,
            ],
          }),
        ],
      });
      this.model.potentialTypeProperty.link((type) => {
        row.visible = isNeeded(type);
      });
      rows.push(row);
    };

    addRow(
      "wellWidth",
      stringManager.wellWidthStringProperty,
      this.model.wellWidthProperty,
      stringManager.valueWithNanometersStringProperty,
      2,
      (type) => type !== PotentialType.COULOMB_1D && type !== PotentialType.COULOMB_3D,
    );
    addRow(
      "wellDepth",
      stringManager.wellDepthStringProperty,
      this.model.wellDepthProperty,
      stringManager.valueWithElectronVoltsStringProperty,
      2,
      (type) =>
        type !== PotentialType.INFINITE_WELL && type !== PotentialType.COULOMB_1D && type !== PotentialType.COULOMB_3D,
    );
    if (hasBarrierHeight(this.model)) {
      addRow(
        "barrierHeight",
        stringManager.barrierHeightStringProperty,
        this.model.barrierHeightProperty,
        stringManager.valueWithElectronVoltsStringProperty,
        2,
        (type) => type === PotentialType.ROSEN_MORSE || type === PotentialType.ECKART,
      );
    }
    if (hasPotentialOffset(this.model)) {
      addRow(
        "potentialOffset",
        stringManager.potentialOffsetStringProperty,
        this.model.potentialOffsetProperty,
        stringManager.valueWithElectronVoltsStringProperty,
        2,
        (type) => type === PotentialType.TRIANGULAR,
      );
    }
    if (hasWellSeparation(this.model)) {
      addRow(
        "wellSeparation",
        stringManager.wellSeparationStringProperty,
        this.model.wellSeparationProperty,
        stringManager.valueWithNanometersStringProperty,
        2,
        (type) =>
          type === PotentialType.DOUBLE_SQUARE_WELL ||
          type === PotentialType.DOUBLE_POSCHL_TELLER ||
          MULTI_WELL_TYPES.includes(type),
      );
    }

    return new VBox({ spacing: 6, align: "left", children: rows });
  }

  /**
   * Quantum State Graph controls, matching the hierarchy used by PhET's Quantum Bound States.
   */
  private createGraphGroup(): Node {
    const titleText = new Text(stringManager.quantumStateGraphStringProperty, {
      font: TITLE_FONT,
      fill: QPPWColors.textFillProperty,
      maxWidth: CONTENT_WIDTH,
    });

    // Display mode radio buttons
    const displayModeItems = [
      {
        value: "probabilityDensity" as const,
        createNode: () =>
          new Text(stringManager.probabilityDensityStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),

        // PDOM
        options: {
          accessibleName: a11y.controls.probabilityDensityStringProperty,
          accessibleHelpText: QPPWDescriber.getDisplayModeDescriptionProperty("probabilityDensity"),
        },
      },
      {
        value: "waveFunction" as const,
        createNode: () =>
          new Text(stringManager.wavefunctionStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),

        // PDOM
        options: {
          accessibleName: a11y.controls.waveFunctionStringProperty,
          accessibleHelpText: QPPWDescriber.getDisplayModeDescriptionProperty("waveFunction"),
        },
      },
    ];

    const displayModeRadioButtonGroup = new VerticalAquaRadioButtonGroup(
      this.viewState.displayModeProperty,
      displayModeItems,
      {
        spacing: 8,
        radioButtonOptions: {
          radius: 8,
        },

        // PDOM
        accessibleName: a11y.controls.displayModeStringProperty,
        // TODO: Add helpText when PhET accessibility is fully configured
        // helpText:
        //   "Choose how to visualize the wavefunction. Use arrow keys to navigate options, Space or Enter to select.",
      },
    );

    // Classical probability checkbox (only for OneWellModel and only in probability density mode)
    const classicalProbabilityCheckboxContent =
      "showClassicalProbabilityProperty" in this.model
        ? new Checkbox(
            this.viewState.showClassicalProbabilityProperty,
            new Text(stringManager.classicalProbabilityDensityStringProperty, {
              font: new PhetFont(12),
              fill: QPPWColors.textFillProperty,
            }),
            {
              ...PANEL_CHECKBOX_OPTIONS,

              // PDOM
              labelContent: a11y.controls.showClassicalProbabilityStringProperty,
              // TODO: Add helpText when PhET accessibility is fully configured
              // helpText:
              //   "Toggle visibility of classical probability distribution. Shows where a classical particle would be found, for comparison with quantum probability.",
            },
          )
        : null;

    const classicalProbabilityCheckbox = classicalProbabilityCheckboxContent
      ? new Node({
          children: [classicalProbabilityCheckboxContent],
          layoutOptions: { leftMargin: 25 },
        })
      : null;

    const waveFunctionModeProperty = new DerivedProperty(
      [this.viewState.displayModeProperty],
      (mode) => mode === "waveFunction",
    );

    const createComponentContent = (
      labelProperty: TReadOnlyProperty<string>,
      strokeProperty: TReadOnlyProperty<Color>,
    ): Node =>
      new HBox({
        spacing: 10,
        children: [
          new Text(labelProperty, {
            font: new PhetFont(12),
            fill: QPPWColors.textFillProperty,
            maxWidth: 120,
          }),
          new Line(0, 0, 30, 0, {
            lineWidth: 3,
            stroke: strokeProperty,
          }),
        ],
      });

    const realPartCheckbox = new Checkbox(
      this.viewState.showRealPartProperty,
      createComponentContent(stringManager.realPartStringProperty, QPPWColors.wavefunctionRealProperty),
      {
        ...PANEL_CHECKBOX_OPTIONS,
        enabledProperty: waveFunctionModeProperty,

        // PDOM
        labelContent: a11y.controls.showRealPartStringProperty,
        // TODO: Add helpText when PhET accessibility is fully configured
        // helpText:
        //   "Toggle visibility of real component of wavefunction. Real part oscillates between positive and negative values.",
      },
    );

    const imaginaryPartCheckbox = new Checkbox(
      this.viewState.showImaginaryPartProperty,
      createComponentContent(stringManager.imaginaryPartStringProperty, QPPWColors.wavefunctionImaginaryProperty),
      {
        ...PANEL_CHECKBOX_OPTIONS,
        enabledProperty: waveFunctionModeProperty,

        // PDOM
        labelContent: a11y.controls.showImaginaryPartStringProperty,
        // TODO: Add helpText when PhET accessibility is fully configured
        // helpText:
        //   "Toggle visibility of imaginary component of wavefunction. Imaginary part oscillates 90 degrees out of phase with real part.",
      },
    );

    const magnitudeCheckbox = new Checkbox(
      this.viewState.showMagnitudeProperty,
      createComponentContent(stringManager.magnitudeStringProperty, QPPWColors.wavefunctionMagnitudeProperty),
      {
        ...PANEL_CHECKBOX_OPTIONS,
        enabledProperty: waveFunctionModeProperty,

        // PDOM
        labelContent: a11y.controls.showMagnitudeStringProperty,
        // TODO: Add helpText when PhET accessibility is fully configured
        // helpText:
        //   "Toggle visibility of wavefunction magnitude. Magnitude equals square root of probability density.",
      },
    );

    const phaseEnabledProperty = new DerivedProperty(
      [this.viewState.displayModeProperty, this.viewState.showMagnitudeProperty],
      (mode, showMagnitude) => mode === "waveFunction" && showMagnitude,
    );
    const phaseContent = new HBox({
      spacing: 8,
      children: [
        new Text(stringManager.phaseStringProperty, {
          font: new PhetFont(12),
          fill: QPPWColors.textFillProperty,
          maxWidth: 55,
        }),
        new HBox({
          spacing: 3,
          children: [
            new Text("0", { font: new PhetFont(11), fill: QPPWColors.textFillProperty }),
            new SpectrumNode({
              minValue: 0,
              maxValue: 2 * Math.PI,
              valueToColor: (phase) => new Color(phaseToReversedTwilight(phase)),
              size: new Dimension2(44, 10),
            }),
            new Text("2π", { font: new PhetFont(11), fill: QPPWColors.textFillProperty }),
          ],
        }),
      ],
    });
    const phaseCheckbox = new Checkbox(this.viewState.showPhaseProperty, phaseContent, {
      ...PANEL_CHECKBOX_OPTIONS,
      enabledProperty: phaseEnabledProperty,

      // PDOM
      labelContent: a11y.controls.showPhaseStringProperty,
      // TODO: Add helpText when PhET accessibility is fully configured
      // helpText:
      //   "Toggle visibility of quantum phase angle. Phase rotates continuously during time evolution.",
    });

    const waveFunctionCheckboxes = new VBox({
      spacing: 8,
      align: "left",
      layoutOptions: { leftMargin: 25 },
      children: [
        realPartCheckbox,
        imaginaryPartCheckbox,
        magnitudeCheckbox,
        new Node({
          children: [phaseCheckbox],
          layoutOptions: { leftMargin: 25 },
        }),
      ],
    });

    // Classical probability belongs to the Probability Density graph.
    this.viewState.displayModeProperty.link((mode: string) => {
      if (classicalProbabilityCheckboxContent) {
        classicalProbabilityCheckboxContent.enabled = mode === "probabilityDensity";
      }
    });

    const children: Node[] = [titleText, displayModeRadioButtonGroup];
    if (classicalProbabilityCheckbox) {
      children.push(classicalProbabilityCheckbox);
    }
    children.push(waveFunctionCheckboxes);

    return new VBox({ spacing: 8, align: "left", children: children });
  }
}
