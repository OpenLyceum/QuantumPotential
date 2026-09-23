/**
 * ControlPanelNode contains all the controls for the One Well screen.
 * This includes potential selection, display options, particle mass, and well parameters.
 */

import { Dimension2 } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { HBox, HSeparator, Node, RichText, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Checkbox, ComboBox, type ComboBoxItem, HSlider, Panel, VerticalAquaRadioButtonGroup } from "scenerystack/sun";
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
import { QPPWDescriber } from "./accessibility/QPPWDescriber.js";
import { SuperpositionDialog } from "./SuperpositionDialog.js";

const a11y = stringManager.getA11yStrings();

export type ControlPanelNodeOptions = {
  // Whether to show the particle mass control group
  showParticleMass?: boolean;
  // Filter which potential types to show (if undefined, shows all)
  allowedPotentialTypes?: PotentialType[];
};

type ResolvedControlPanelNodeOptions = {
  showParticleMass: boolean;
  allowedPotentialTypes: PotentialType[] | undefined;
};

export class ControlPanelNode extends Node {
  private readonly model: OneWellModel | TwoWellsModel | ManyWellsModel;
  private readonly viewState: OneWellViewState | TwoWellsViewState | ManyWellsViewState;
  private readonly options: ResolvedControlPanelNodeOptions;

  public constructor(
    model: OneWellModel | TwoWellsModel | ManyWellsModel,
    viewState: OneWellViewState | TwoWellsViewState | ManyWellsViewState,
    listBoxParent: Node,
    providedOptions?: ControlPanelNodeOptions,
  ) {
    super();

    this.model = model;
    this.viewState = viewState;

    // Default options
    this.options = {
      showParticleMass: true,
      allowedPotentialTypes: undefined,
      ...providedOptions,
    };

    // Create all control groups
    const energyChartGroup = this.createEnergyChartGroup(listBoxParent);
    const bottomChartGroup = this.createBottomChartGroup();
    const particleMassGroup = this.options.showParticleMass ? this.createParticleMassGroup() : null;
    const wellConfigGroup = this.createWellConfigurationGroup();

    // Arrange groups vertically (only include particle mass if enabled)
    const children: Node[] = [
      energyChartGroup,
      new HSeparator({ stroke: QPPWColors.gridLineProperty }),
      bottomChartGroup,
      new HSeparator({ stroke: QPPWColors.gridLineProperty }),
    ];

    if (particleMassGroup) {
      children.push(particleMassGroup);
      children.push(new HSeparator({ stroke: QPPWColors.gridLineProperty }));
    }

    children.push(wellConfigGroup);
    children.push(new HSeparator({ stroke: QPPWColors.gridLineProperty }));

    // Arrange groups vertically
    const contentVBox = new VBox({
      spacing: 15,
      align: "left",
      children: children,
    });

    const controlPanel = new Panel(contentVBox, {
      fill: QPPWColors.panelFillProperty,
      stroke: QPPWColors.panelStrokeProperty,
      xMargin: 15,
      yMargin: 15,
      cornerRadius: 5,
    });

    this.addChild(controlPanel);
  }

  /**
   * Creates the Energy Chart control group.
   */
  private createEnergyChartGroup(listBoxParent: Node): Node {
    const titleText = new Text(stringManager.energyChartStringProperty, {
      font: new PhetFont({ size: 16, weight: "bold" }),
      fill: QPPWColors.textFillProperty,
    });

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
      xMargin: 8,
      yMargin: 6,
      cornerRadius: 4,
      buttonFill: QPPWColors.controlPanelBackgroundColorProperty,
      buttonStroke: QPPWColors.controlPanelStrokeColorProperty,
      listFill: QPPWColors.controlPanelBackgroundColorProperty,
      listStroke: QPPWColors.controlPanelStrokeColorProperty,
      highlightFill: QPPWColors.controlPanelStrokeColorProperty,

      // PDOM - make potential type selector keyboard accessible
      accessibleName: a11y.controls.potentialTypeStringProperty,
      // TODO: Add helpText when PhET accessibility is fully configured
      // helpText:
      //   "Select quantum potential well type. " +
      //   "Press Enter to open menu, use arrow keys to navigate options, " +
      //   "Enter to select, Escape to close.",
    });

    const potentialLabelText = new Text(stringManager.potentialWellStringProperty, {
      font: new PhetFont(14),
      fill: QPPWColors.textFillProperty,
    });

    const potentialRowNode = new HBox({
      spacing: 10,
      children: [potentialLabelText, potentialComboBox],
    });

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
        xMargin: 8,
        yMargin: 6,
        cornerRadius: 4,
        buttonFill: QPPWColors.controlPanelBackgroundColorProperty,
        buttonStroke: QPPWColors.controlPanelStrokeColorProperty,
        listFill: QPPWColors.controlPanelBackgroundColorProperty,
        listStroke: QPPWColors.controlPanelStrokeColorProperty,
        highlightFill: QPPWColors.controlPanelStrokeColorProperty,

        // PDOM - make superposition type selector keyboard accessible
        accessibleName: a11y.controls.superpositionTypeStringProperty,
        // TODO: Add helpText when PhET accessibility is fully configured
        // helpText:
        //   "Select wavefunction superposition state. " +
        //   "Press Enter to open menu, use arrow keys to navigate options, " +
        //   "Enter to select, Escape to close.",
      },
    );

    const superpositionLabelText = new Text(stringManager.superpositionStringProperty, {
      font: new PhetFont(14),
      fill: QPPWColors.textFillProperty,
    });

    const superpositionRowNode = new HBox({
      spacing: 10,
      children: [superpositionLabelText, superpositionComboBox],
    });

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
          trackSize: new Dimension2(120, 4),
          thumbSize: new Dimension2(15, 30),

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

    const children: Node[] = [titleText, potentialRowNode, superpositionRowNode];

    if (displacementRowVBox) {
      children.push(displacementRowVBox);
    }

    return new VBox({
      spacing: 8,
      align: "left",
      children: children,
    });
  }

  /**
   * Creates the Bottom Chart control group.
   */
  private createBottomChartGroup(): Node {
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

    const displayLabel = new Text(stringManager.displayStringProperty, {
      font: new PhetFont(14),
      fill: QPPWColors.textFillProperty,
    });

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
              boxWidth: 16,

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

    // Wave function views checkboxes
    const waveFunctionViewsLabel = new Text(stringManager.waveFunctionViewsStringProperty, {
      font: new PhetFont(14),
      fill: QPPWColors.textFillProperty,
    });

    const realPartCheckbox = new Checkbox(
      this.viewState.showRealPartProperty,
      new Text(stringManager.realPartStringProperty, {
        font: new PhetFont(12),
        fill: QPPWColors.textFillProperty,
      }),
      {
        boxWidth: 16,

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
        boxWidth: 16,

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
        boxWidth: 16,

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
        boxWidth: 16,

        // PDOM
        labelContent: a11y.controls.showPhaseStringProperty,
        // TODO: Add helpText when PhET accessibility is fully configured
        // helpText:
        //   "Toggle visibility of quantum phase angle. Phase rotates continuously during time evolution.",
      },
    );

    const waveFunctionCheckboxes = new VBox({
      spacing: 6,
      align: "left",
      children: [realPartCheckbox, imaginaryPartCheckbox, magnitudeCheckbox, phaseCheckbox],
      leftMargin: 20,
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

    // Build children array conditionally
    const children: Node[] = [displayLabel, displayModeRadioButtonGroup];

    // Add classical probability checkbox if it exists
    if (classicalProbabilityCheckbox) {
      children.push(classicalProbabilityCheckbox);
    }

    // Add wave function views
    children.push(waveFunctionViewsLabel, waveFunctionCheckboxes);

    return new VBox({
      spacing: 8,
      align: "left",
      children,
    });
  }

  /**
   * Creates the Particle Mass control group.
   */
  private createParticleMassGroup(): Node {
    const titleText = new Text(stringManager.particleMassStringProperty, {
      font: new PhetFont({ size: 16, weight: "bold" }),
      fill: QPPWColors.textFillProperty,
    });

    const massValueText = new Text("", {
      font: new PhetFont(14),
      fill: QPPWColors.textFillProperty,
    });

    // Update text when mass changes
    this.model.particleMassProperty.link((mass: number) => {
      massValueText.string = StringUtils.fillIn(stringManager.valueWithElectronMassStringProperty, {
        value: mass.toFixed(2),
      });
    });

    const massSlider = new HSlider(this.model.particleMassProperty, this.model.particleMassProperty.range!, {
      trackSize: new Dimension2(150, 4),
      thumbSize: new Dimension2(15, 30),

      // PDOM
      accessibleName: QPPWDescriber.getParameterNameProperty("particleMass"),
      descriptionContent: QPPWDescriber.getSliderHelpText("particleMass"),
    });

    return new VBox({
      spacing: 8,
      align: "left",
      children: [
        titleText,
        new HBox({
          spacing: 10,
          children: [massSlider, massValueText],
        }),
      ],
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
      trackSize: new Dimension2(150, 4),
      thumbSize: new Dimension2(15, 30),

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

    // Well Depth slider (only for finite wells)
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
      trackSize: new Dimension2(150, 4),
      thumbSize: new Dimension2(15, 30),

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

    let barrierHeightRowVBox: Node | null = null;
    if (hasBarrierHeight(this.model)) {
      this.model.barrierHeightProperty.link((height: number) => {
        barrierHeightValueText.string = StringUtils.fillIn(stringManager.valueWithElectronVoltsStringProperty, {
          value: height.toFixed(2),
        });
      });

      const barrierHeightSlider = new HSlider(
        this.model.barrierHeightProperty,
        this.model.barrierHeightProperty.range!,
        {
          trackSize: new Dimension2(150, 4),
          thumbSize: new Dimension2(15, 30),

          // PDOM
          accessibleName: QPPWDescriber.getParameterNameProperty("barrierHeight"),
          descriptionContent: QPPWDescriber.getSliderHelpText("barrierHeight"),
        },
      );

      barrierHeightRowVBox = new VBox({
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
    }

    // Potential Offset slider (only for triangular potential)
    const offsetValueText = new Text("", {
      font: new PhetFont(12),
      fill: QPPWColors.textFillProperty,
    });

    let offsetRowVBox: Node | null = null;
    if (hasPotentialOffset(this.model)) {
      this.model.potentialOffsetProperty.link((offset: number) => {
        offsetValueText.string = StringUtils.fillIn(stringManager.valueWithElectronVoltsStringProperty, {
          value: offset.toFixed(2),
        });
      });

      const offsetSlider = new HSlider(this.model.potentialOffsetProperty, this.model.potentialOffsetProperty.range!, {
        trackSize: new Dimension2(150, 4),
        thumbSize: new Dimension2(15, 30),

        // PDOM
        accessibleName: QPPWDescriber.getParameterNameProperty("potentialOffset"),
        descriptionContent: QPPWDescriber.getSliderHelpText("potentialOffset"),
      });

      offsetRowVBox = new VBox({
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
    }

    // Well Separation slider (only for double/multi square well and multi-Coulomb 1D)
    const separationValueText = new Text("", {
      font: new PhetFont(12),
      fill: QPPWColors.textFillProperty,
    });

    // Check if the model has wellSeparationProperty (TwoWellsModel or ManyWellsModel)
    let separationRowVBox: Node | null = null;
    if (hasWellSeparation(this.model)) {
      this.model.wellSeparationProperty.link((separation: number) => {
        separationValueText.string = StringUtils.fillIn(stringManager.valueWithNanometersStringProperty, {
          value: separation.toFixed(2),
        });
      });

      const separationSlider = new HSlider(
        this.model.wellSeparationProperty,
        this.model.wellSeparationProperty.range!,
        {
          trackSize: new Dimension2(150, 4),
          thumbSize: new Dimension2(15, 30),

          // PDOM
          accessibleName: QPPWDescriber.getParameterNameProperty("wellSeparation"),
          descriptionContent: QPPWDescriber.getSliderHelpText("wellSeparation"),
        },
      );

      separationRowVBox = new VBox({
        spacing: 4,
        align: "left",
        children: [
          new Text(stringManager.wellSeparationStringProperty, {
            font: new PhetFont(12),
            fill: QPPWColors.textFillProperty,
          }),
          new HBox({
            spacing: 10,
            children: [separationSlider, separationValueText],
          }),
        ],
      });
    }

    // Number of Wells slider (only for multi-well potentials)
    const numberOfWellsValueText = new Text("", {
      font: new PhetFont(12),
      fill: QPPWColors.textFillProperty,
    });

    // Check if the model has numberOfWellsProperty (ManyWellsModel)
    let numberOfWellsRowVBox: Node | null = null;
    if (isManyWellsModel(this.model)) {
      this.model.numberOfWellsProperty.link((numberOfWells: number) => {
        numberOfWellsValueText.string = `${numberOfWells}`;
      });

      const numberOfWellsSlider = new HSlider(
        this.model.numberOfWellsProperty,
        this.model.numberOfWellsProperty.range!,
        {
          trackSize: new Dimension2(150, 4),
          thumbSize: new Dimension2(15, 30),
          constrainValue: (value: number) => Math.round(value), // Integer values only

          // PDOM
          accessibleName: QPPWDescriber.getParameterNameProperty("numberOfWells"),
          descriptionContent: QPPWDescriber.getSliderHelpText("numberOfWells"),
        },
      );

      numberOfWellsRowVBox = new VBox({
        spacing: 4,
        align: "left",
        children: [
          new Text(stringManager.numberOfWellsStringProperty, {
            font: new PhetFont(12),
            fill: QPPWColors.textFillProperty,
          }),
          new HBox({
            spacing: 10,
            children: [numberOfWellsSlider, numberOfWellsValueText],
          }),
        ],
      });
    }

    // Enable/disable width slider based on potential type
    // Coulomb potentials have fixed spatial extent and don't use well width
    this.model.potentialTypeProperty.link((type: PotentialType) => {
      const needsWidth = type !== PotentialType.COULOMB_1D && type !== PotentialType.COULOMB_3D;
      widthRowVBox.visible = needsWidth;
    });

    // Enable/disable depth slider based on potential type
    this.model.potentialTypeProperty.link((type: PotentialType) => {
      const needsDepth =
        type === PotentialType.FINITE_WELL ||
        type === PotentialType.HARMONIC_OSCILLATOR ||
        type === PotentialType.MORSE ||
        type === PotentialType.POSCHL_TELLER ||
        type === PotentialType.ROSEN_MORSE ||
        type === PotentialType.ECKART ||
        type === PotentialType.ASYMMETRIC_TRIANGLE ||
        type === PotentialType.TRIANGULAR ||
        type === PotentialType.DOUBLE_SQUARE_WELL ||
        type === PotentialType.MULTI_SQUARE_WELL;
      depthRowVBox.visible = needsDepth;
    });

    // Enable/disable barrier height slider based on potential type (only for Rosen-Morse and Eckart)
    if (barrierHeightRowVBox) {
      this.model.potentialTypeProperty.link((type: PotentialType) => {
        const needsBarrierHeight = type === PotentialType.ROSEN_MORSE || type === PotentialType.ECKART;
        barrierHeightRowVBox!.visible = needsBarrierHeight;
      });
    }

    // Enable/disable offset slider based on potential type (only for triangular potential)
    if (offsetRowVBox) {
      this.model.potentialTypeProperty.link((type: PotentialType) => {
        const needsOffset = type === PotentialType.TRIANGULAR;
        offsetRowVBox!.visible = needsOffset;
      });
    }

    // Enable/disable separation slider based on potential type
    if (separationRowVBox) {
      this.model.potentialTypeProperty.link((type: PotentialType) => {
        const needsSeparation =
          type === PotentialType.DOUBLE_SQUARE_WELL ||
          type === PotentialType.MULTI_SQUARE_WELL ||
          type === PotentialType.MULTI_COULOMB_1D;
        separationRowVBox!.visible = needsSeparation;
      });
    }

    // Enable/disable number of wells slider based on potential type
    if (numberOfWellsRowVBox) {
      this.model.potentialTypeProperty.link((type: PotentialType) => {
        const needsNumberOfWells = type === PotentialType.MULTI_SQUARE_WELL || type === PotentialType.MULTI_COULOMB_1D;
        numberOfWellsRowVBox!.visible = needsNumberOfWells;
      });
    }

    // Electric Field slider (only for ManyWellsModel)
    const electricFieldValueText = new Text("", {
      font: new PhetFont(12),
      fill: QPPWColors.textFillProperty,
    });

    let electricFieldRowVBox: Node | null = null;
    if (hasElectricField(this.model)) {
      this.model.electricFieldProperty.link((field: number) => {
        electricFieldValueText.string = StringUtils.fillIn(
          stringManager.valueWithElectronVoltsPerNanometerStringProperty,
          { value: field.toFixed(3) },
        );
      });

      const electricFieldSlider = new HSlider(
        this.model.electricFieldProperty,
        this.model.electricFieldProperty.range!,
        {
          trackSize: new Dimension2(150, 4),
          thumbSize: new Dimension2(15, 30),

          // PDOM
          accessibleName: QPPWDescriber.getParameterNameProperty("electricField"),
          descriptionContent: QPPWDescriber.getSliderHelpText("electricField"),
        },
      );

      electricFieldRowVBox = new VBox({
        spacing: 4,
        align: "left",
        children: [
          new Text(stringManager.electricFieldStringProperty, {
            font: new PhetFont(12),
            fill: QPPWColors.textFillProperty,
          }),
          new HBox({
            spacing: 10,
            children: [electricFieldSlider, electricFieldValueText],
          }),
        ],
      });
    }

    // Enable/disable electric field slider based on potential type
    if (electricFieldRowVBox) {
      this.model.potentialTypeProperty.link((type: PotentialType) => {
        const needsElectricField = type === PotentialType.MULTI_SQUARE_WELL || type === PotentialType.MULTI_COULOMB_1D;
        electricFieldRowVBox!.visible = needsElectricField;
      });
    }

    const children: Node[] = [titleText, widthRowVBox, depthRowVBox];
    if (barrierHeightRowVBox) {
      children.push(barrierHeightRowVBox);
    }
    if (offsetRowVBox) {
      children.push(offsetRowVBox);
    }
    if (numberOfWellsRowVBox) {
      children.push(numberOfWellsRowVBox);
    }
    if (separationRowVBox) {
      children.push(separationRowVBox);
    }
    if (electricFieldRowVBox) {
      children.push(electricFieldRowVBox);
    }

    return new VBox({
      spacing: 10,
      align: "left",
      children: children,
    });
  }
}
