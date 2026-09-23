/**
 * SuperpositionDialog allows users to configure superposition state amplitudes.
 */

import { NumberProperty, type Property } from "scenerystack/axon";
import { Dimension2, Range } from "scenerystack/dot";
import { GridBox, HBox, HSeparator, type Node, RichText, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Dialog } from "scenerystack/sim";
import { HSlider, RectangularPushButton } from "scenerystack/sun";
import stringManager from "../../i18n/StringManager.js";
import QPPWColors from "../../QPPWColors.js";
import type { BoundStateResult } from "../model/PotentialFunction.js";
import type { SuperpositionConfig } from "../model/SuperpositionType.js";
import { SuperpositionType } from "../model/SuperpositionType.js";
import { FLAT_PANEL_PUSH_BUTTON_OPTIONS } from "../QPPWButtonOptions.js";

export class SuperpositionDialog {
  private static readonly MAX_EDITABLE_STATES = 6;
  private readonly dialog: Dialog;
  private readonly configProperty: Property<SuperpositionConfig>;
  private readonly amplitudeProperties: NumberProperty[];
  private readonly phaseProperties: NumberProperty[];
  private readonly originalConfig: SuperpositionConfig;
  private readonly onOK: () => void;
  private readonly onCancel: () => void;

  public constructor(
    configProperty: Property<SuperpositionConfig>,
    boundStateResult: BoundStateResult | null,
    onOK: () => void,
    onCancel: () => void,
  ) {
    // Store the original config to revert if cancelled
    this.originalConfig = {
      ...configProperty.value,
      amplitudes: [...configProperty.value.amplitudes],
      phases: [...configProperty.value.phases],
    };

    this.configProperty = configProperty;
    this.amplitudeProperties = [];
    this.phaseProperties = [];
    this.onOK = onOK;
    this.onCancel = onCancel;

    const content = this.createContent(configProperty, boundStateResult);

    this.dialog = new Dialog(content, {
      title: new Text(stringManager.superpositionDialogTitleStringProperty, {
        font: new PhetFont({ size: 18, weight: "bold" }),
        fill: QPPWColors.textFillProperty,
      }),
      accessibleName: stringManager.superpositionDialogTitleStringProperty,
      xSpacing: 18,
      ySpacing: 14,
      cornerRadius: 8,
      fill: QPPWColors.controlPanelBackgroundColorProperty,
      stroke: QPPWColors.controlPanelStrokeColorProperty,
      closeButtonColor: QPPWColors.textFillProperty,
      closeButtonListener: () => {
        this.handleCancel();
      },
    });
  }

  /**
   * Shows the dialog.
   */
  public show(): void {
    this.dialog.show();
  }

  /**
   * Hides the dialog.
   */
  public hide(): void {
    this.dialog.hide();
  }

  /**
   * Handles OK button press - confirms the changes and closes the dialog.
   */
  private handleOK(): void {
    this.dialog.hide();
    this.onOK();
  }

  /**
   * Handles Cancel button press or close button - reverts changes and closes the dialog.
   */
  private handleCancel(): void {
    // Revert to original config
    this.configProperty.value = this.originalConfig;
    this.dialog.hide();
    this.onCancel();
  }

  /**
   * Creates the content for the dialog.
   */
  private createContent(
    configProperty: Property<SuperpositionConfig>,
    boundStateResult: BoundStateResult | null,
  ): Node {
    const descriptionText = new Text(stringManager.superpositionInstructionsStringProperty, {
      font: new PhetFont(13),
      fill: QPPWColors.labelFillProperty,
      maxWidth: 450,
    });

    // The dialog stays compact while exposing more states than a two-state preset contains.
    const config = configProperty.value;
    const numStates = Math.min(boundStateResult?.energies.length ?? 0, SuperpositionDialog.MAX_EDITABLE_STATES);

    // Create amplitude and phase controls for each available state.
    const sliderRows: Node[][] = [];

    for (let i = 0; i < numStates; i++) {
      const amplitude = config.amplitudes[i] || 0;
      const amplitudeProperty = new NumberProperty(amplitude, {
        range: new Range(0, 1),
      });
      this.amplitudeProperties.push(amplitudeProperty);
      const phase = config.phases[i] ?? 0;
      const phaseProperty = new NumberProperty(Math.atan2(Math.sin(phase), Math.cos(phase)), {
        range: new Range(-Math.PI, Math.PI),
      });
      this.phaseProperties.push(phaseProperty);

      const stateLabel = new RichText(`ψ<sub>${i}</sub>`, {
        font: new PhetFont(14),
        fill: QPPWColors.textFillProperty,
      });

      const valueText = new Text("0.00", {
        font: new PhetFont(13),
        fill: QPPWColors.textFillProperty,
      });

      const probabilityText = new Text("0%", {
        font: new PhetFont(13),
        fill: QPPWColors.labelFillProperty,
      });

      amplitudeProperty.link((value: number) => {
        valueText.string = value.toFixed(2);
        probabilityText.string = `${Math.round(value * value * 100)}%`;
      });

      const phaseText = new Text("0.00π", {
        font: new PhetFont(13),
        fill: QPPWColors.textFillProperty,
      });
      phaseProperty.link((value: number) => {
        phaseText.string = `${(value / Math.PI).toFixed(2)}π`;
      });

      const slider = new HSlider(amplitudeProperty, amplitudeProperty.range!, {
        trackSize: new Dimension2(150, 4),
        thumbSize: new Dimension2(15, 30),
        trackFillEnabled: QPPWColors.textFillProperty,
        accessibleName: `ψ${i} ${stringManager.amplitudeStringProperty.value}`,
      });

      const phaseSlider = new HSlider(phaseProperty, phaseProperty.range!, {
        trackSize: new Dimension2(110, 4),
        thumbSize: new Dimension2(15, 30),
        trackFillEnabled: QPPWColors.textFillProperty,
        accessibleName: `ψ${i} ${stringManager.phaseStringProperty.value}`,
      });

      sliderRows.push([stateLabel, slider, valueText, phaseSlider, phaseText, probabilityText]);
    }

    // Preview edits immediately; Cancel restores the original configuration.
    const updateConfig = () => {
      const amplitudes = this.amplitudeProperties.map((prop) => prop.value);
      const phases = this.phaseProperties.map((prop) => prop.value);

      configProperty.value = {
        ...config,
        type: SuperpositionType.CUSTOM,
        amplitudes,
        phases,
      };
    };

    for (const prop of this.amplitudeProperties) {
      prop.lazyLink(updateConfig);
    }
    for (const prop of this.phaseProperties) {
      prop.lazyLink(updateConfig);
    }

    const slidersGrid = new GridBox({
      xSpacing: 14,
      ySpacing: 12,
      xAlign: "left",
      rows: [
        [
          new Text(stringManager.stateStringProperty, { font: new PhetFont(12), fill: QPPWColors.labelFillProperty }),
          new Text(stringManager.amplitudeStringProperty, {
            font: new PhetFont(12),
            fill: QPPWColors.labelFillProperty,
          }),
          null,
          new Text(stringManager.phaseStringProperty, {
            font: new PhetFont(12),
            fill: QPPWColors.labelFillProperty,
          }),
          null,
          new Text(stringManager.probabilityColumnStringProperty, {
            font: new PhetFont(12),
            fill: QPPWColors.labelFillProperty,
          }),
        ],
        ...sliderRows,
      ],
    });

    // Normalization info
    const normalizationText = new Text("", {
      font: new PhetFont(12),
      fill: QPPWColors.textFillProperty,
    });

    const updateNormalization = () => {
      const sumSquared = this.amplitudeProperties.reduce((sum, prop) => sum + prop.value * prop.value, 0);
      normalizationText.string = stringManager.normalizationSumStringProperty.value + sumSquared.toFixed(3);

      // Change color if not normalized
      if (Math.abs(sumSquared - 1.0) > 0.01) {
        normalizationText.fill = QPPWColors.warningColorProperty.value;
      } else {
        normalizationText.fill = QPPWColors.textFillProperty.value;
      }
    };

    for (const prop of this.amplitudeProperties) {
      prop.link(updateNormalization);
    }

    // Normalize button
    const normalize = () => {
      const sumSquared = this.amplitudeProperties.reduce((sum, prop) => sum + prop.value * prop.value, 0);
      const normFactor = Math.sqrt(sumSquared);

      if (normFactor > 0) {
        for (const prop of this.amplitudeProperties) {
          prop.value /= normFactor;
        }
      }
    };

    const normalizeButton = new RectangularPushButton({
      ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
      content: new Text(stringManager.normalizeButtonStringProperty, {
        font: new PhetFont(12),
        fill: QPPWColors.textFillProperty,
      }),
      listener: normalize,
    });

    const normalizationRowHBox = new HBox({
      spacing: 18,
      children: [normalizationText, normalizeButton],
    });

    // OK and Cancel buttons
    const okButton = new RectangularPushButton({
      ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
      content: new Text(stringManager.okButtonStringProperty, {
        font: new PhetFont({ size: 14, weight: "bold" }),
        fill: QPPWColors.textFillProperty,
      }),
      listener: () => {
        normalize();
        updateConfig();
        this.handleOK();
      },
      minWidth: 80,
    });

    const cancelButton = new RectangularPushButton({
      ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
      content: new Text(stringManager.cancelButtonStringProperty, {
        font: new PhetFont(14),
        fill: QPPWColors.textFillProperty,
      }),
      listener: () => {
        this.handleCancel();
      },
      minWidth: 80,
    });

    const buttonRowHBox = new HBox({
      spacing: 12,
      children: [cancelButton, okButton],
      align: "center",
    });

    const updateButtons = () => {
      const hasAmplitude = this.amplitudeProperties.some((prop) => prop.value > 0);
      normalizeButton.enabled = hasAmplitude;
      okButton.enabled = hasAmplitude;
    };
    for (const prop of this.amplitudeProperties) {
      prop.link(updateButtons);
    }

    return new VBox({
      spacing: 16,
      align: "left",
      children: [
        descriptionText,
        ...(numStates > 0
          ? [slidersGrid, normalizationRowHBox]
          : [
              new Text(stringManager.noBoundStatesForSuperpositionStringProperty, {
                font: new PhetFont(13),
                fill: QPPWColors.textFillProperty,
              }),
            ]),
        new HSeparator({ stroke: QPPWColors.panelStrokeProperty }),
        buttonRowHBox,
      ],
    });
  }
}
