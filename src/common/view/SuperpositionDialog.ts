/** Configure a superposition and preview its time-zero wave function. */

import { NumberProperty, type TReadOnlyProperty } from "scenerystack/axon";
import { Dimension2, Range } from "scenerystack/dot";
import { Shape } from "scenerystack/kite";
import {
  type Color,
  GridBox,
  HBox,
  HSeparator,
  Line,
  Node,
  Path,
  Rectangle,
  RichText,
  Text,
  VBox,
} from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import { Dialog } from "scenerystack/sim";
import { HSlider, RectangularPushButton } from "scenerystack/sun";
import stringManager from "../../i18n/StringManager.js";
import type { ManyWellsModel } from "../../many-wells/model/ManyWellsModel.js";
import type { OneWellModel } from "../../one-well/model/OneWellModel.js";
import QPPWColors from "../../QPPWColors.js";
import type { TwoWellsModel } from "../../two-wells/model/TwoWellsModel.js";
import { createProjectedWavePacket, isSpatialPresetType } from "../model/LocalizedWavePacket.js";
import { isOneWellModel } from "../model/ModelTypeGuards.js";
import type { BoundStateResult } from "../model/PotentialFunction.js";
import QuantumConstants from "../model/QuantumConstants.js";
import type { SuperpositionConfig } from "../model/SuperpositionType.js";
import { SuperpositionType } from "../model/SuperpositionType.js";
import { FLAT_PANEL_PUSH_BUTTON_OPTIONS } from "../QPPWButtonOptions.js";

type SuperpositionModel = OneWellModel | TwoWellsModel | ManyWellsModel;

export class SuperpositionDialog {
  private static readonly PAGE_SIZE = 6;
  private static readonly PREVIEW_WIDTH = 480;
  private static readonly PREVIEW_HEIGHT = 110;

  private readonly dialog: Dialog;
  private readonly originalConfig: SuperpositionConfig;
  private readonly originalDisplacement: number | null;
  private readonly amplitudeProperties: NumberProperty[] = [];
  private readonly phaseProperties: NumberProperty[] = [];
  private readonly model: SuperpositionModel;
  private readonly previousType: SuperpositionType;
  public constructor(model: SuperpositionModel, previousType: SuperpositionType) {
    this.model = model;
    this.previousType = previousType;
    this.originalConfig = {
      ...model.superpositionConfigProperty.value,
      amplitudes: [...model.superpositionConfigProperty.value.amplitudes],
      phases: [...model.superpositionConfigProperty.value.phases],
    };
    this.originalDisplacement = isOneWellModel(model) ? model.coherentDisplacementProperty.value : null;

    this.dialog = new Dialog(this.createContent(model.getBoundStates()), {
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
      closeButtonListener: () => this.handleCancel(),
    });
  }

  public show(): void {
    this.dialog.show();
  }

  private handleCancel(): void {
    if (isOneWellModel(this.model) && this.originalDisplacement !== null) {
      this.model.coherentDisplacementProperty.value = this.originalDisplacement;
    }
    this.model.superpositionTypeProperty.value = this.previousType;
    this.model.superpositionConfigProperty.value = this.originalConfig;
    this.dialog.hide();
  }

  private isAllStatesEqually(config: SuperpositionConfig, numStates: number): boolean {
    if (numStates === 0 || config.amplitudes.length !== numStates) {
      return false;
    }
    const amplitude = 1 / Math.sqrt(numStates);
    return config.amplitudes.every(
      (value, index) => Math.abs(value - amplitude) < 1e-6 && Math.abs(config.phases[index] ?? 0) < 1e-6,
    );
  }

  private getInitialPreset(config: SuperpositionConfig, numStates: number): SuperpositionType | "all" {
    return this.model.superpositionTypeProperty.value === SuperpositionType.CUSTOM &&
      this.isAllStatesEqually(config, numStates)
      ? "all"
      : this.model.superpositionTypeProperty.value;
  }

  private createContent(boundStates: BoundStateResult | null): Node {
    const numStates = boundStates?.energies.length ?? 0;
    const model = this.model;
    const config = boundStates
      ? model.getSuperpositionConfigForBoundStates(boundStates)
      : model.superpositionConfigProperty.value;
    const pages: Node[] = [];
    const pageCount = Math.ceil(numStates / SuperpositionDialog.PAGE_SIZE);
    let pageIndex = 0;
    let syncingCoefficients = false;
    let selectedPreset: SuperpositionType | "all" | null = this.getInitialPreset(config, numStates);
    const presetIndicators = new Map<SuperpositionType | "all", Text>();
    const setSelectedPreset = (preset: SuperpositionType | "all" | null) => {
      selectedPreset = preset;
      presetIndicators.forEach((indicator, key) => {
        indicator.opacity = key === preset ? 1 : 0;
      });
    };
    const presetButton = (label: TReadOnlyProperty<string>, type: SuperpositionType | "all", listener: () => void) => {
      const indicator = new Text("●", { font: new PhetFont(12), fill: QPPWColors.energyLevelSelectedProperty });
      indicator.opacity = selectedPreset === type ? 1 : 0;
      presetIndicators.set(type, indicator);
      return new HBox({ spacing: 4, children: [indicator, this.createButton(label, listener)] });
    };

    const preview = this.createPreview(boundStates);
    const updatePreview = preview.update;
    const customControls = new VBox({ spacing: 10, align: "left", children: [] });

    const updateConfig = () => {
      if (syncingCoefficients) {
        return;
      }
      model.superpositionTypeProperty.value = SuperpositionType.CUSTOM;
      model.superpositionConfigProperty.value = {
        type: SuperpositionType.CUSTOM,
        amplitudes: this.amplitudeProperties.map((property) => property.value),
        phases: this.phaseProperties.map((property) => property.value),
      };
      spatialRow.visible = false;
      movingRow.visible = false;
      twoLobedRow.visible = false;
      displacementRow.visible = false;
      pairRow.visible = false;
      setSelectedPreset(SuperpositionType.CUSTOM);
      updatePreview();
    };

    const rows: Node[][] = [];
    for (let i = 0; i < numStates; i++) {
      const amplitudeProperty = new NumberProperty(Math.abs(config.amplitudes[i] ?? 0), { range: new Range(0, 1) });
      const phase = (config.phases[i] ?? 0) + ((config.amplitudes[i] ?? 0) < 0 ? Math.PI : 0);
      const phaseProperty = new NumberProperty(Math.atan2(Math.sin(phase), Math.cos(phase)), {
        range: new Range(-Math.PI, Math.PI),
      });
      this.amplitudeProperties.push(amplitudeProperty);
      this.phaseProperties.push(phaseProperty);

      const amplitudeText = new Text("", { font: new PhetFont(12), fill: QPPWColors.textFillProperty });
      const phaseText = new Text("", { font: new PhetFont(12), fill: QPPWColors.textFillProperty });
      amplitudeProperty.link((value) => {
        amplitudeText.string = value.toFixed(2);
      });
      phaseProperty.link((value) => {
        phaseText.string = `${(value / Math.PI).toFixed(2)}π`;
      });
      amplitudeProperty.lazyLink(updateConfig);
      phaseProperty.lazyLink(updateConfig);

      rows.push([
        new RichText(`ψ<sub>${i}</sub>`, { font: new PhetFont(13), fill: QPPWColors.textFillProperty }),
        new HSlider(amplitudeProperty, amplitudeProperty.range!, {
          trackSize: new Dimension2(145, 4),
          thumbSize: new Dimension2(13, 24),
          accessibleName: `ψ${i} ${stringManager.amplitudeStringProperty.value}`,
        }),
        amplitudeText,
        new HSlider(phaseProperty, phaseProperty.range!, {
          trackSize: new Dimension2(100, 4),
          thumbSize: new Dimension2(13, 24),
          accessibleName: `ψ${i} ${stringManager.phaseStringProperty.value}`,
        }),
        phaseText,
      ]);
    }

    const syncSliders = (preset: SuperpositionConfig) => {
      syncingCoefficients = true;
      for (let i = 0; i < numStates; i++) {
        const coefficient = preset.amplitudes[i] ?? 0;
        const phase = (preset.phases[i] ?? 0) + (coefficient < 0 ? Math.PI : 0);
        this.amplitudeProperties[i]!.value = Math.abs(coefficient);
        this.phaseProperties[i]!.value = Math.atan2(Math.sin(phase), Math.cos(phase));
      }
      syncingCoefficients = false;
    };

    for (let page = 0; page < pageCount; page++) {
      const header: (Node | null)[] = [
        new Text(stringManager.stateStringProperty, { font: new PhetFont(12), fill: QPPWColors.labelFillProperty }),
        new Text(stringManager.amplitudeStringProperty, { font: new PhetFont(12), fill: QPPWColors.labelFillProperty }),
        null,
        new Text(stringManager.phaseStringProperty, { font: new PhetFont(12), fill: QPPWColors.labelFillProperty }),
        null,
      ];
      pages.push(
        new GridBox({
          xSpacing: 10,
          ySpacing: 8,
          xAlign: "left",
          rows: [
            header,
            ...rows.slice(page * SuperpositionDialog.PAGE_SIZE, (page + 1) * SuperpositionDialog.PAGE_SIZE),
          ],
          visible: page === 0,
        }),
      );
    }

    const pageLabel = new Text("", { font: new PhetFont(12), fill: QPPWColors.labelFillProperty });
    const previousButton = this.createButton(
      "◀",
      () => {
        pageIndex--;
        showPage();
      },
      stringManager.previousStringProperty,
    );
    const nextButton = this.createButton(
      "▶",
      () => {
        pageIndex++;
        showPage();
      },
      stringManager.nextStringProperty,
    );
    const showPage = () => {
      pages.forEach((page, index) => {
        page.visible = index === pageIndex;
      });
      pageLabel.string = `${stringManager.stateStringProperty.value} ${pageIndex * SuperpositionDialog.PAGE_SIZE + 1}–${Math.min((pageIndex + 1) * SuperpositionDialog.PAGE_SIZE, numStates)} / ${numStates}`;
      previousButton.enabled = pageIndex > 0;
      nextButton.enabled = pageIndex < pageCount - 1;
    };
    if (pageCount > 0) {
      showPage();
    }

    const normalizationText = new Text("", { font: new PhetFont(12), fill: QPPWColors.textFillProperty });
    const updateNormalization = () => {
      const sum = this.amplitudeProperties.reduce((total, property) => total + property.value ** 2, 0);
      normalizationText.string = stringManager.normalizationSumStringProperty.value + sum.toFixed(3);
      normalizationText.fill =
        Math.abs(sum - 1) > 0.01 ? QPPWColors.warningColorProperty.value : QPPWColors.textFillProperty.value;
    };
    for (const property of this.amplitudeProperties) {
      property.link(updateNormalization);
    }

    const normalize = () => {
      const norm = Math.sqrt(this.amplitudeProperties.reduce((sum, property) => sum + property.value ** 2, 0));
      if (norm > 0) {
        syncingCoefficients = true;
        for (const property of this.amplitudeProperties) {
          property.value /= norm;
        }
        syncingCoefficients = false;
        updateConfig();
      }
    };
    const allStates = () => {
      const amplitude = 1 / Math.sqrt(numStates);
      syncingCoefficients = true;
      for (const property of this.amplitudeProperties) {
        property.value = amplitude;
      }
      for (const property of this.phaseProperties) {
        property.value = 0;
      }
      syncingCoefficients = false;
      updateConfig();
      setSelectedPreset("all");
    };
    const normalizationRow = new HBox({
      spacing: 10,
      children: [normalizationText, this.createButton(stringManager.normalizeButtonStringProperty, normalize)],
    });

    if (numStates > 0) {
      customControls.children = [
        new Text(stringManager.superpositionInstructionsStringProperty, {
          font: new PhetFont(12),
          fill: QPPWColors.labelFillProperty,
          maxWidth: SuperpositionDialog.PREVIEW_WIDTH,
        }),
        ...pages,
        ...(pageCount > 1 ? [new HBox({ spacing: 12, children: [previousButton, pageLabel, nextButton] })] : []),
        normalizationRow,
      ];
    }

    const sliderControl = (
      label: TReadOnlyProperty<string>,
      property: NumberProperty,
      format: (value: number) => string,
    ): Node => {
      const valueText = new Text("", { font: new PhetFont(12), fill: QPPWColors.textFillProperty });
      property.link((value) => {
        valueText.string = format(value);
      });
      return new VBox({
        spacing: 3,
        align: "left",
        children: [
          new Text(label, { font: new PhetFont(12), fill: QPPWColors.textFillProperty }),
          new HBox({
            spacing: 6,
            children: [
              new HSlider(property, property.range!, {
                trackSize: new Dimension2(140, 4),
                accessibleName: label,
              }),
              valueText,
            ],
          }),
        ],
      });
    };
    const locationProperty = new NumberProperty(config.position ?? 0, { range: new Range(-4, 4) });
    const widthProperty = new NumberProperty(config.width ?? 0.5, { range: new Range(0.1, 2) });
    const momentumProperty = new NumberProperty(config.momentum ?? 2, { range: new Range(-8, 8) });
    const secondPositionProperty = new NumberProperty(config.secondPosition ?? 1.5, { range: new Range(-4, 4) });
    const relativePhaseProperty = new NumberProperty(config.relativePhase ?? 0, {
      range: new Range(-Math.PI, Math.PI),
    });
    const spatialRow = new HBox({
      spacing: 14,
      visible: isSpatialPresetType(model.superpositionTypeProperty.value),
      children: [
        sliderControl(stringManager.positionNmStringProperty, locationProperty, (value) => `${value.toFixed(2)} nm`),
        sliderControl(stringManager.packetWidthStringProperty, widthProperty, (value) => `${value.toFixed(2)} nm`),
      ],
    });
    const movingRow = new HBox({
      visible: model.superpositionTypeProperty.value === SuperpositionType.MOVING_LOCALIZED,
      children: [
        sliderControl(stringManager.momentumStringProperty, momentumProperty, (value) => `${value.toFixed(2)} ℏ/nm`),
      ],
    });
    const twoLobedRow = new HBox({
      spacing: 14,
      visible: model.superpositionTypeProperty.value === SuperpositionType.TWO_LOBED,
      children: [
        sliderControl(
          stringManager.secondPositionStringProperty,
          secondPositionProperty,
          (value) => `${value.toFixed(2)} nm`,
        ),
        sliderControl(
          stringManager.relativePhaseStringProperty,
          relativePhaseProperty,
          (value) => `${(value / Math.PI).toFixed(2)}π`,
        ),
      ],
    });
    const applySpatial = () => {
      if (!boundStates || numStates === 0) {
        return;
      }
      const type = model.superpositionTypeProperty.value;
      const projected = createProjectedWavePacket(boundStates, {
        type,
        position: locationProperty.value,
        width: widthProperty.value,
        momentum: momentumProperty.value,
        secondPosition: secondPositionProperty.value,
        relativePhase: relativePhaseProperty.value,
      });
      model.superpositionConfigProperty.value = projected;
      syncSliders(projected);
      updatePreview();
    };
    for (const property of [
      locationProperty,
      widthProperty,
      momentumProperty,
      secondPositionProperty,
      relativePhaseProperty,
    ]) {
      property.lazyLink(() => {
        if (isSpatialPresetType(model.superpositionTypeProperty.value)) {
          applySpatial();
        }
      });
    }

    const displacementRow = new VBox({
      spacing: 4,
      align: "left",
      children: [],
      visible: model.superpositionTypeProperty.value === SuperpositionType.COHERENT && isOneWellModel(model),
    });
    if (isOneWellModel(model)) {
      const displacementValue = new Text("", { font: new PhetFont(12), fill: QPPWColors.textFillProperty });
      const displacementProperty = new NumberProperty(model.coherentDisplacementProperty.value, {
        range: model.coherentDisplacementProperty.range,
      });
      displacementProperty.link((value) => {
        displacementValue.string = `${value.toFixed(2)} nm`;
        model.coherentDisplacementProperty.value = value;
        if (model.superpositionTypeProperty.value === SuperpositionType.COHERENT) {
          syncSliders(model.superpositionConfigProperty.value);
        }
        updatePreview();
      });
      displacementRow.children = [
        new Text(stringManager.positionStringProperty, {
          font: new PhetFont(12),
          fill: QPPWColors.textFillProperty,
        }),
        new HBox({
          spacing: 10,
          children: [
            new HSlider(displacementProperty, displacementProperty.range!, {
              trackSize: new Dimension2(245, 4),
              accessibleName: stringManager.positionStringProperty,
            }),
            displacementValue,
          ],
        }),
      ];
    }

    const pairControls = this.createPairControls(config, numStates, syncSliders, updatePreview);
    const pairRow = pairControls.node;

    const selectPreset = (type: SuperpositionType) => {
      if (isSpatialPresetType(type)) {
        model.superpositionTypeProperty.value = type;
        applySpatial();
      } else if (type === SuperpositionType.PSI_I_PSI_J && numStates >= 2) {
        model.superpositionTypeProperty.value = type;
        pairControls.apply();
      } else if (type === SuperpositionType.COHERENT && isOneWellModel(model)) {
        model.superpositionTypeProperty.value = type;
        syncSliders(model.superpositionConfigProperty.value);
        updatePreview();
      } else {
        updateConfig();
      }
      spatialRow.visible = isSpatialPresetType(type);
      movingRow.visible = type === SuperpositionType.MOVING_LOCALIZED;
      twoLobedRow.visible = type === SuperpositionType.TWO_LOBED;
      displacementRow.visible = type === SuperpositionType.COHERENT && isOneWellModel(model);
      pairRow.visible = numStates >= 2 && type === SuperpositionType.PSI_I_PSI_J;
      setSelectedPreset(type);
      okButton.enabled = numStates > 0 && this.amplitudeProperties.some((property) => property.value > 0);
      updatePreview();
    };

    const twoLowestStatesButton = presetButton(
      stringManager.psiIPsiJStringProperty,
      SuperpositionType.PSI_I_PSI_J,
      () => selectPreset(SuperpositionType.PSI_I_PSI_J),
    );
    twoLowestStatesButton.enabled = numStates >= 2;

    const presets = new VBox({
      spacing: 8,
      align: "left",
      children: [
        new HBox({
          spacing: 8,
          children: [
            twoLowestStatesButton,
            presetButton(stringManager.allStatesStringProperty, "all", allStates),
            presetButton(stringManager.localizedStateStringProperty, SuperpositionType.LOCALIZED, () =>
              selectPreset(SuperpositionType.LOCALIZED),
            ),
          ],
        }),
        new HBox({
          spacing: 8,
          children: [
            presetButton(stringManager.movingPacketStringProperty, SuperpositionType.MOVING_LOCALIZED, () =>
              selectPreset(SuperpositionType.MOVING_LOCALIZED),
            ),
            presetButton(stringManager.twoLobedPacketStringProperty, SuperpositionType.TWO_LOBED, () =>
              selectPreset(SuperpositionType.TWO_LOBED),
            ),
            ...(isOneWellModel(model)
              ? [
                  presetButton(stringManager.coherentStateStringProperty, SuperpositionType.COHERENT, () =>
                    selectPreset(SuperpositionType.COHERENT),
                  ),
                ]
              : []),
            presetButton(stringManager.customStringProperty, SuperpositionType.CUSTOM, () =>
              selectPreset(SuperpositionType.CUSTOM),
            ),
          ],
        }),
      ],
    });

    const okButton = this.createButton(stringManager.okButtonStringProperty, () => {
      if (model.superpositionTypeProperty.value === SuperpositionType.CUSTOM) {
        normalize();
        updateConfig();
      }
      model.isPlayingProperty.value = false;
      model.timeProperty.value = 0;
      this.dialog.hide();
    });
    const updateOK = () => {
      okButton.enabled = numStates > 0 && this.amplitudeProperties.some((property) => property.value > 0);
    };
    for (const property of this.amplitudeProperties) {
      property.link(updateOK);
    }
    updateOK();
    const cancelButton = this.createButton(stringManager.cancelButtonStringProperty, () => this.handleCancel());

    return new VBox({
      spacing: 12,
      align: "left",
      children: [
        presets,
        pairRow,
        spatialRow,
        movingRow,
        twoLobedRow,
        displacementRow,
        new VBox({
          spacing: 3,
          align: "left",
          children: [
            new RichText(stringManager.superpositionEquationStringProperty, {
              font: new PhetFont(14),
              fill: QPPWColors.textFillProperty,
            }),
            new RichText(stringManager.superpositionEquationHelpStringProperty, {
              font: new PhetFont(11),
              fill: QPPWColors.labelFillProperty,
              maxWidth: SuperpositionDialog.PREVIEW_WIDTH,
            }),
          ],
        }),
        ...(numStates > 0
          ? [customControls]
          : [
              new Text(stringManager.noBoundStatesForSuperpositionStringProperty, {
                font: new PhetFont(13),
                fill: QPPWColors.textFillProperty,
              }),
            ]),
        new Text(stringManager.waveFunctionPreviewStringProperty, {
          font: new PhetFont(12),
          fill: QPPWColors.labelFillProperty,
        }),
        preview.node,
        new HBox({
          spacing: 16,
          children: [
            this.createLegend(stringManager.realPartStringProperty, QPPWColors.wavefunctionRealProperty),
            this.createLegend(stringManager.imaginaryPartStringProperty, QPPWColors.wavefunctionImaginaryProperty),
            this.createLegend(stringManager.magnitudeStringProperty, QPPWColors.wavefunctionMagnitudeProperty),
          ],
        }),
        new HSeparator({ stroke: QPPWColors.panelStrokeProperty }),
        new HBox({ spacing: 12, align: "center", children: [cancelButton, okButton] }),
      ],
    });
  }

  private createPairControls(
    config: SuperpositionConfig,
    numStates: number,
    syncSliders: (preset: SuperpositionConfig) => void,
    updatePreview: () => void,
  ): { node: HBox; apply: () => void } {
    if (numStates < 2) {
      return { node: new HBox({ visible: false }), apply: () => undefined };
    }
    const model = this.model;
    const initialPair = config.stateIndices ?? [0, 1];
    const maxIndex = numStates - 1;
    const firstIndex = Math.max(0, Math.min(initialPair[0], maxIndex));
    const secondIndex = Math.max(0, Math.min(initialPair[1], maxIndex));
    const firstStateProperty = new NumberProperty(firstIndex, {
      range: new Range(0, maxIndex),
    });
    const secondStateProperty = new NumberProperty(
      secondIndex === firstIndex ? (firstIndex + 1) % numStates : secondIndex,
      {
        range: new Range(0, maxIndex),
      },
    );
    const pairSlider = (label: TReadOnlyProperty<string>, property: NumberProperty) => {
      const value = new RichText("", { font: new PhetFont(12), fill: QPPWColors.textFillProperty });
      property.link((index) => {
        value.string = `${stringManager.stateStringProperty.value} ${index + 1} (ψ<sub>${index}</sub>)`;
      });
      return new VBox({
        spacing: 3,
        align: "left",
        children: [
          new Text(label, { font: new PhetFont(12), fill: QPPWColors.textFillProperty }),
          new HBox({
            spacing: 6,
            children: [
              new HSlider(property, property.range!, {
                trackSize: new Dimension2(180, 4),
                constrainValue: Math.round,
                keyboardStep: 1,
                thumbSize: new Dimension2(13, 24),
                accessibleName: label,
              }),
              value,
            ],
          }),
        ],
      });
    };
    const node = new HBox({
      spacing: 16,
      visible: numStates >= 2 && model.superpositionTypeProperty.value === SuperpositionType.PSI_I_PSI_J,
      children: [
        pairSlider(stringManager.firstStateStringProperty, firstStateProperty),
        pairSlider(stringManager.secondStateStringProperty, secondStateProperty),
      ],
    });
    const apply = () => {
      if (numStates < 2 || model.superpositionTypeProperty.value !== SuperpositionType.PSI_I_PSI_J) {
        return;
      }
      const first = firstStateProperty.value;
      const second = secondStateProperty.value;
      const amplitudes = new Array(numStates).fill(0);
      amplitudes[first] = 1 / Math.sqrt(2);
      amplitudes[second] = 1 / Math.sqrt(2);
      const preset: SuperpositionConfig = {
        type: SuperpositionType.PSI_I_PSI_J,
        amplitudes,
        phases: new Array(numStates).fill(0),
        stateIndices: [first, second],
      };
      model.superpositionConfigProperty.value = preset;
      syncSliders(preset);
      updatePreview();
    };
    let syncingPair = false;
    firstStateProperty.lazyLink((first) => {
      if (syncingPair) {
        return;
      }
      if (first === secondStateProperty.value) {
        syncingPair = true;
        secondStateProperty.value = (first + 1) % numStates;
        syncingPair = false;
      }
      apply();
    });
    secondStateProperty.lazyLink((second) => {
      if (syncingPair) {
        return;
      }
      if (second === firstStateProperty.value) {
        syncingPair = true;
        firstStateProperty.value = (second + 1) % numStates;
        syncingPair = false;
      }
      apply();
    });
    return { node, apply };
  }

  private createLegend(label: TReadOnlyProperty<string>, color: TReadOnlyProperty<Color>): Node {
    return new HBox({
      spacing: 5,
      children: [
        new Line(0, 0, 18, 0, { stroke: color, lineWidth: 2 }),
        new Text(label, { font: new PhetFont(11), fill: QPPWColors.labelFillProperty }),
      ],
    });
  }

  private createButton(
    label: string | TReadOnlyProperty<string>,
    listener: () => void,
    accessibleName?: TReadOnlyProperty<string>,
  ): RectangularPushButton {
    return new RectangularPushButton({
      ...FLAT_PANEL_PUSH_BUTTON_OPTIONS,
      content: new Text(label, { font: new PhetFont(12), fill: QPPWColors.textFillProperty }),
      ...(accessibleName ? { accessibleName } : {}),
      listener,
    });
  }

  private createPreview(boundStates: BoundStateResult | null): { node: Node; update: () => void } {
    const width = SuperpositionDialog.PREVIEW_WIDTH;
    const height = SuperpositionDialog.PREVIEW_HEIGHT;
    const xMinNm = -4;
    const xMaxNm = 4;
    const realPath = new Path(null, { stroke: QPPWColors.wavefunctionRealProperty, lineWidth: 2 });
    const imaginaryPath = new Path(null, { stroke: QPPWColors.wavefunctionImaginaryProperty, lineWidth: 2 });
    const magnitudePath = new Path(null, { stroke: QPPWColors.wavefunctionMagnitudeProperty, lineWidth: 2 });
    const ticks: Node[] = [];
    for (const value of [-4, -2, 0, 2, 4]) {
      const x = ((value - xMinNm) / (xMaxNm - xMinNm)) * width;
      ticks.push(new Line(x, height, x, height + 5, { stroke: QPPWColors.axisProperty }));
      const label = new Text(String(value), { font: new PhetFont(11), fill: QPPWColors.labelFillProperty });
      label.centerX = x;
      label.top = height + 7;
      ticks.push(label);
    }
    const node = new Node({
      children: [
        new Rectangle(0, 0, width, height, {
          fill: QPPWColors.backgroundColorProperty,
          stroke: QPPWColors.panelStrokeProperty,
        }),
        new Line(0, height / 2, width, height / 2, { stroke: QPPWColors.gridLineProperty }),
        realPath,
        imaginaryPath,
        magnitudePath,
        ...ticks,
      ],
    });

    const update = () => {
      const wave = this.model.getTimeEvolvedSuperposition(0);
      if (!(wave && boundStates) || boundStates.xGrid.length < 2) {
        return;
      }
      const max = wave.maxMagnitude || 1;
      const plot = (values: readonly number[]): Shape => {
        const shape = new Shape();
        const count = Math.min(values.length, boundStates.xGrid.length);
        let hasPoint = false;
        for (let i = 0; i < count; i++) {
          const positionNm = boundStates.xGrid[i]! * QuantumConstants.M_TO_NM;
          if (positionNm < xMinNm || positionNm > xMaxNm) {
            continue;
          }
          const x = ((positionNm - xMinNm) / (xMaxNm - xMinNm)) * width;
          const y = height / 2 - (values[i]! / max) * (height * 0.42);
          if (!hasPoint) {
            shape.moveTo(x, y);
            hasPoint = true;
          } else {
            shape.lineTo(x, y);
          }
        }
        return shape;
      };
      realPath.shape = plot(wave.realPart);
      imaginaryPath.shape = plot(wave.imagPart);
      magnitudePath.shape = plot(wave.magnitude);
    };
    update();
    return { node, update };
  }
}
