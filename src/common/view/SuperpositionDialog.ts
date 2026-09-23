/**
 * SuperpositionDialog allows users to configure superposition state amplitudes.
 */

import { NumberProperty, type Property } from "scenerystack/axon";
import { Dimension2, Range } from "scenerystack/dot";
import { HBox, type Node, RichText, Text, VBox } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Dialog } from "scenerystack/sim";
import { HSlider, RectangularPushButton } from "scenerystack/sun";
import stringManager from "../../i18n/StringManager.js";
import QPPWColors from "../../QPPWColors.js";
import type { BoundStateResult } from "../model/PotentialFunction.js";
import type { SuperpositionConfig } from "../model/SuperpositionType.js";
import { FLAT_PANEL_PUSH_BUTTON_OPTIONS } from "../QPPWButtonOptions.js";

export class SuperpositionDialog {
  private readonly dialog: Dialog;
  private readonly configProperty: Property<SuperpositionConfig>;
  private readonly amplitudeProperties: NumberProperty[];
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
      type: configProperty.value.type,
      amplitudes: [...configProperty.value.amplitudes],
      phases: [...configProperty.value.phases],
    };

    this.configProperty = configProperty;
    this.amplitudeProperties = [];
    this.onOK = onOK;
    this.onCancel = onCancel;

    const content = this.createContent(configProperty, boundStateResult);

    this.dialog = new Dialog(content, {
      xSpacing: 20,
      ySpacing: 20,
      cornerRadius: 8,
      fill: QPPWColors.panelFillProperty,
      stroke: QPPWColors.panelStrokeProperty,
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
    const titleText = new Text(stringManager.superpositionDialogTitleStringProperty, {
      font: new PhetFont({ size: 18, weight: "bold" }),
      fill: QPPWColors.textFillProperty,
    });

    const descriptionText = new RichText(stringManager.superpositionInstructionsStringProperty, {
      font: new PhetFont(12),
      fill: QPPWColors.textFillProperty,
      maxWidth: 400,
    });

    // Determine how many states to show based on the current config
    const config = configProperty.value;
    const numStates = Math.min(config.amplitudes.length, boundStateResult?.energies.length || 5);

    // Create sliders for each amplitude
    const sliderNodes: Node[] = [];

    for (let i = 0; i < numStates; i++) {
      const amplitude = config.amplitudes[i] || 0;
      const amplitudeProperty = new NumberProperty(amplitude, {
        range: new Range(0, 1),
      });
      this.amplitudeProperties.push(amplitudeProperty);

      const stateLabel = new RichText(`ψ<sub>${i}</sub>:`, {
        font: new PhetFont(14),
        fill: QPPWColors.textFillProperty,
      });

      const valueText = new Text("0.00", {
        font: new PhetFont(12),
        fill: QPPWColors.textFillProperty,
      });

      amplitudeProperty.link((value: number) => {
        valueText.string = value.toFixed(2);
      });

      const slider = new HSlider(amplitudeProperty, amplitudeProperty.range!, {
        trackSize: new Dimension2(200, 4),
        thumbSize: new Dimension2(15, 30),
      });

      const sliderRowHBox = new HBox({
        spacing: 10,
        children: [stateLabel, slider, valueText],
      });

      sliderNodes.push(sliderRowHBox);
    }

    // Update config when amplitudes change
    const updateConfig = () => {
      const amplitudes = this.amplitudeProperties.map((prop) => prop.value);
      const phases = config.phases.slice(0, numStates);

      // Extend phases array if needed
      while (phases.length < amplitudes.length) {
        phases.push(0);
      }

      configProperty.value = {
        ...config,
        amplitudes,
        phases,
      };
    };

    for (const prop of this.amplitudeProperties) {
      prop.link(updateConfig);
    }

    const slidersVBox = new VBox({
      spacing: 10,
      align: "left",
      children: sliderNodes,
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
    const normalizeButton = new RectangularPushButton({
      ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
      content: new Text(stringManager.normalizeButtonStringProperty, {
        font: new PhetFont(12),
        fill: QPPWColors.textFillProperty,
      }),
      listener: () => {
        const sumSquared = this.amplitudeProperties.reduce((sum, prop) => sum + prop.value * prop.value, 0);
        const normFactor = Math.sqrt(sumSquared);

        if (normFactor > 0) {
          for (const prop of this.amplitudeProperties) {
            prop.value /= normFactor;
          }
        }
      },
    });

    const normalizationRowHBox = new HBox({
      spacing: 10,
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
      spacing: 15,
      children: [okButton, cancelButton],
      align: "center",
    });

    return new VBox({
      spacing: 15,
      align: "left",
      children: [titleText, descriptionText, slidersVBox, normalizationRowHBox, buttonRowHBox],
    });
  }
}
