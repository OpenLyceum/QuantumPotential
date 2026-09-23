/**
 * ControlPanelNode builds the two control panels of the One, Two and Many Wells screens, in the layout of
 * PhET's Quantum Bound States:
 *  - energyPanel, beside the energy chart: potential, superposition, and the parameters that are not
 *    geometric features of the potential (particle mass, number of wells, electric field). The geometric
 *    parameters are dragged with handles on the potential itself; their sliders appear only with ?dev.
 *  - graphPanel, beside the wave-function chart: what the chart shows.
 */

import type { NumberProperty, TReadOnlyProperty } from "scenerystack/axon";
import { StringUtils } from "scenerystack/phetcommon";
import { GridBox, HBox, Node, RichText, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox, ComboBox, type ComboBoxItem, HSlider, VerticalAquaRadioButtonGroup } from "scenerystack/sun";
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
import { COMPACT_PANEL_SLIDER_OPTIONS, PANEL_CHECKBOX_OPTIONS } from "../QPPWControlOptions.js";
import { QPPWPanel } from "../QPPWPanel.js";
import isDevMode from "../utils/isDevMode.js";
import type { QPPWParameter } from "./accessibility/QPPWDescriber.js";
import { QPPWDescriber } from "./accessibility/QPPWDescriber.js";
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
const MULTI_WELL_TYPES: readonly PotentialType[] = [PotentialType.MULTI_SQUARE_WELL, PotentialType.MULTI_COULOMB_1D];

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
      this.createSuperpositionGroup(listBoxParent),
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
        value: PotentialType.MULTI_COULOMB_1D,
        createNode: () =>
          new Text(stringManager.multiCoulomb1DStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getPotentialTypeNameProperty(PotentialType.MULTI_COULOMB_1D),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getPotentialTypeDescriptionProperty(PotentialType.MULTI_COULOMB_1D),
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

  /**
   * Superposition combo box (opening the custom-superposition dialog), plus the coherent-state displacement on One Well.
   */
  private createSuperpositionGroup(listBoxParent: Node): Node {
    // Superposition State dropdown
    const superpositionItems: Array<ComboBoxItem<SuperpositionType>> = [
      {
        value: SuperpositionType.PSI_I_PSI_J,
        createNode: () =>
          new RichText(stringManager.psiIPsiJStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getSuperpositionTypeNameProperty(SuperpositionType.PSI_I_PSI_J),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getSuperpositionTypeDescriptionProperty(SuperpositionType.PSI_I_PSI_J),
        },
      },
      {
        value: SuperpositionType.SINGLE,
        createNode: () =>
          new RichText(stringManager.psiKStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getSuperpositionTypeNameProperty(SuperpositionType.SINGLE),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getSuperpositionTypeDescriptionProperty(SuperpositionType.SINGLE),
        },
      },
      {
        value: SuperpositionType.LOCALIZED_NARROW,
        createNode: () =>
          new Text(stringManager.localizedNarrowStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getSuperpositionTypeNameProperty(SuperpositionType.LOCALIZED_NARROW),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getSuperpositionTypeDescriptionProperty(SuperpositionType.LOCALIZED_NARROW),
        },
      },
      {
        value: SuperpositionType.LOCALIZED_WIDE,
        createNode: () =>
          new Text(stringManager.localizedWideStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getSuperpositionTypeNameProperty(SuperpositionType.LOCALIZED_WIDE),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getSuperpositionTypeDescriptionProperty(SuperpositionType.LOCALIZED_WIDE),
        },
      },
      {
        value: SuperpositionType.COHERENT,
        createNode: () =>
          new Text(stringManager.coherentStateStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getSuperpositionTypeNameProperty(SuperpositionType.COHERENT),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getSuperpositionTypeDescriptionProperty(SuperpositionType.COHERENT),
        },
      },
      {
        value: SuperpositionType.CUSTOM,
        createNode: () =>
          new Text(stringManager.customStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        accessibleName: QPPWDescriber.getSuperpositionTypeNameProperty(SuperpositionType.CUSTOM),
        comboBoxListItemNodeOptions: {
          accessibleHelpText: QPPWDescriber.getSuperpositionTypeDescriptionProperty(SuperpositionType.CUSTOM),
        },
      },
    ];

    const superpositionComboBox = new ComboBox(
      this.model.superpositionTypeProperty,
      superpositionItems,
      listBoxParent,
      {
        ...COMBO_BOX_OPTIONS,

        // PDOM - make superposition type selector keyboard accessible
        accessibleName: a11y.controls.superpositionTypeStringProperty,
        // TODO: Add helpText when PhET accessibility is fully configured
        // helpText:
        //   "Select wavefunction superposition state. " +
        //   "Press Enter to open menu, use arrow keys to navigate options, " +
        //   "Enter to select, Escape to close.",
      },
    );

    // Coherent state displacement slider (OneWellModel only)
    let displacementRowVBox: Node | null = null;
    if (isOneWellModel(this.model)) {
      const displacementValueText = new Text("", {
        font: new PhetFont(12),
        fill: QPPWColors.textFillProperty,
      });

      this.model.coherentDisplacementProperty.link((displacement: number) => {
        displacementValueText.string = StringUtils.fillIn(stringManager.valueWithNanometersStringProperty, {
          value: displacement.toFixed(2),
        });
      });

      const displacementSlider = new HSlider(
        this.model.coherentDisplacementProperty,
        this.model.coherentDisplacementProperty.range!,
        {
          ...COMPACT_PANEL_SLIDER_OPTIONS,

          // PDOM
          accessibleName: QPPWDescriber.getParameterNameProperty("coherentDisplacement"),
          descriptionContent: QPPWDescriber.getSliderHelpText("coherentDisplacement"),
        },
      );

      displacementRowVBox = new VBox({
        spacing: 4,
        align: "left",
        children: [
          new Text(stringManager.displacementStringProperty, {
            font: new PhetFont(12),
            fill: QPPWColors.textFillProperty,
          }),
          new HBox({
            spacing: 10,
            children: [displacementSlider, displacementValueText],
          }),
        ],
        visible: false, // Initially hidden
      });

      // Show/hide displacement slider based on superposition type
      this.model.superpositionTypeProperty.link((type: SuperpositionType) => {
        displacementRowVBox!.visible = type === SuperpositionType.COHERENT;
      });
    }

    // Track the previous superposition type to revert if dialog is cancelled
    let previousSuperpositionType: SuperpositionType = this.model.superpositionTypeProperty.value;
    let isHandlingDialogResult = false;

    // Open dialog when "Custom..." is selected
    this.model.superpositionTypeProperty.link((type: SuperpositionType) => {
      // Skip if we're handling dialog result to avoid recursion
      if (isHandlingDialogResult) {
        return;
      }

      if (type === SuperpositionType.CUSTOM) {
        const dialog = new SuperpositionDialog(
          this.model.superpositionConfigProperty,
          this.model.getBoundStates(),
          () => {
            // OK button pressed - keep CUSTOM selection
            isHandlingDialogResult = true;
            previousSuperpositionType = SuperpositionType.CUSTOM;
            isHandlingDialogResult = false;
          },
          () => {
            // Cancel button pressed - revert to previous selection
            isHandlingDialogResult = true;
            this.model.superpositionTypeProperty.value = previousSuperpositionType;
            isHandlingDialogResult = false;
          },
        );
        dialog.show();
      } else {
        // Update previous type when user selects a non-CUSTOM option
        previousSuperpositionType = type;
      }
    });

    const children: Node[] = [
      new Text(stringManager.superpositionStringProperty, {
        font: TITLE_FONT,
        fill: QPPWColors.textFillProperty,
        maxWidth: CONTENT_WIDTH,
      }),
      superpositionComboBox,
    ];
    if (displacementRowVBox) {
      children.push(displacementRowVBox);
    }

    return new VBox({ spacing: 4, align: "left", children: children });
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
        type !== PotentialType.INFINITE_WELL &&
        type !== PotentialType.COULOMB_1D &&
        type !== PotentialType.COULOMB_3D &&
        type !== PotentialType.MULTI_COULOMB_1D,
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
        (type) => type === PotentialType.DOUBLE_SQUARE_WELL || MULTI_WELL_TYPES.includes(type),
      );
    }

    return new VBox({ spacing: 6, align: "left", children: rows });
  }

  /**
   * Display mode (probability density, wave function, phase colour) and what parts of ψ are drawn.
   */
  private createGraphGroup(): Node {
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
      {
        value: "phaseColor" as const,
        createNode: () =>
          new Text(stringManager.phaseColorStringProperty, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),

        // PDOM
        options: {
          accessibleName: a11y.controls.phaseColorStringProperty,
          accessibleHelpText: QPPWDescriber.getDisplayModeDescriptionProperty("phaseColor"),
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
          x: 20,
        })
      : null;

    const realPartCheckbox = new Checkbox(
      this.viewState.showRealPartProperty,
      new Text(stringManager.realPartStringProperty, {
        font: new PhetFont(12),
        fill: QPPWColors.textFillProperty,
      }),
      {
        ...PANEL_CHECKBOX_OPTIONS,

        // PDOM
        labelContent: a11y.controls.showRealPartStringProperty,
        // TODO: Add helpText when PhET accessibility is fully configured
        // helpText:
        //   "Toggle visibility of real component of wavefunction. Real part oscillates between positive and negative values.",
      },
    );

    const imaginaryPartCheckbox = new Checkbox(
      this.viewState.showImaginaryPartProperty,
      new Text(stringManager.imaginaryPartStringProperty, {
        font: new PhetFont(12),
        fill: QPPWColors.textFillProperty,
      }),
      {
        ...PANEL_CHECKBOX_OPTIONS,

        // PDOM
        labelContent: a11y.controls.showImaginaryPartStringProperty,
        // TODO: Add helpText when PhET accessibility is fully configured
        // helpText:
        //   "Toggle visibility of imaginary component of wavefunction. Imaginary part oscillates 90 degrees out of phase with real part.",
      },
    );

    const magnitudeCheckbox = new Checkbox(
      this.viewState.showMagnitudeProperty,
      new Text(stringManager.magnitudeStringProperty, {
        font: new PhetFont(12),
        fill: QPPWColors.textFillProperty,
      }),
      {
        ...PANEL_CHECKBOX_OPTIONS,

        // PDOM
        labelContent: a11y.controls.showMagnitudeStringProperty,
        // TODO: Add helpText when PhET accessibility is fully configured
        // helpText:
        //   "Toggle visibility of wavefunction magnitude. Magnitude equals square root of probability density.",
      },
    );

    const phaseCheckbox = new Checkbox(
      this.viewState.showPhaseProperty,
      new Text(stringManager.phaseStringProperty, {
        font: new PhetFont(12),
        fill: QPPWColors.textFillProperty,
      }),
      {
        ...PANEL_CHECKBOX_OPTIONS,

        // PDOM
        labelContent: a11y.controls.showPhaseStringProperty,
        // TODO: Add helpText when PhET accessibility is fully configured
        // helpText:
        //   "Toggle visibility of quantum phase angle. Phase rotates continuously during time evolution.",
      },
    );

    // Two columns keep the panel no taller than the chart beside it
    const waveFunctionCheckboxes = new GridBox({
      xSpacing: 12,
      ySpacing: 6,
      xAlign: "left",
      rows: [
        [realPartCheckbox, imaginaryPartCheckbox],
        [magnitudeCheckbox, phaseCheckbox],
      ],
    });

    // Enable/disable wave function views based on display mode
    this.viewState.displayModeProperty.link((mode: string) => {
      const enabled = mode === "waveFunction";
      realPartCheckbox.enabled = enabled;
      imaginaryPartCheckbox.enabled = enabled;
      magnitudeCheckbox.enabled = enabled;
      phaseCheckbox.enabled = enabled;

      // Enable classical probability checkbox only in probability density mode
      if (classicalProbabilityCheckboxContent) {
        classicalProbabilityCheckboxContent.enabled = mode === "probabilityDensity";
      }
    });

    const children: Node[] = [displayModeRadioButtonGroup];
    if (classicalProbabilityCheckbox) {
      children.push(classicalProbabilityCheckbox);
    }
    children.push(waveFunctionCheckboxes);

    return new VBox({ spacing: 8, align: "left", children: children });
  }
}
