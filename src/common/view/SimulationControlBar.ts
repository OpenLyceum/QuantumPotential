/**
 * SimulationControlBar provides playback controls and time display, placed under the charts of the
 * One, Two and Many Wells screens.
 */

import { DerivedProperty } from "scenerystack/axon";
import { AlignBox, HBox, Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont, RestartButton, TimeControlNode } from "scenerystack/scenery-phet";
import { HorizontalAquaRadioButtonGroup } from "scenerystack/sun";
import stringManager from "../../i18n/StringManager.js";
import QPPWColors from "../../QPPWColors.js";
import { BaseModel } from "../model/BaseModel.js";
import { FLAT_BUTTON_APPEARANCE_OPTIONS, FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS } from "../QPPWButtonOptions.js";

const a11y = stringManager.getA11yStrings();

export class SimulationControlBar extends Node {
  private readonly model: BaseModel;
  private readonly timeText: Text;

  public constructor(model: BaseModel) {
    super();

    this.model = model;

    // Time display
    const timeLabel = new Text(stringManager.timeStringProperty, {
      font: new PhetFont(14),
      fill: QPPWColors.textFillProperty,
    });

    const formattedTimeProperty = new DerivedProperty(
      [this.model.timeProperty, stringManager.timeFormatStringProperty],
      (time, format) => format.replace("{{time}}", time.toFixed(2)),
    );
    this.timeText = new Text(formattedTimeProperty, {
      font: new PhetFont({ size: 16, weight: "bold" }),
      fill: QPPWColors.textFillProperty,
      maxWidth: 130,
    });

    // Reserve room for the changing digits so the adjacent buttons stay put while time advances.
    const timeReadout = new AlignBox(this.timeText, { preferredWidth: 140 });

    const timeDisplayVBox = new VBox({
      spacing: 5,
      align: "center",
      children: [timeLabel, timeReadout],
    });

    // Time controls (play/pause and step buttons)
    const timeControlNode = new TimeControlNode(this.model.isPlayingProperty, {
      playPauseStepButtonOptions: {
        ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS,
        includeStepForwardButton: true,
        includeStepBackwardButton: true,
        stepForwardButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepForwardButtonOptions,
          listener: () => {
            // Step forward by one frame (forced even when paused)
            this.model.step(BaseModel.MANUAL_STEP_SIZE, true);
          },
          enabledProperty: DerivedProperty.not(this.model.isPlayingProperty),
          radius: 15, // Smaller than play/pause button

          // PDOM
          innerContent: a11y.controls.stepForwardStringProperty,
          // TODO: Add helpText when PhET accessibility is fully configured
          // helpText:
          //   "Step forward one frame in time. Advances wavefunction by small time increment.",
        },
        stepBackwardButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.stepBackwardButtonOptions,
          listener: () => {
            // Step backward by one frame (negative time step, forced even when paused)
            this.model.step(-BaseModel.MANUAL_STEP_SIZE, true);
          },
          enabledProperty: DerivedProperty.not(this.model.isPlayingProperty),
          radius: 15, // Smaller than play/pause button

          // PDOM
          innerContent: a11y.controls.stepBackwardStringProperty,
          // TODO: Add helpText when PhET accessibility is fully configured
          // helpText:
          //   "Step backward one frame in time. Reverses wavefunction by small time increment.",
        },
        playPauseButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.playPauseButtonOptions,
          // PDOM
          innerContent: new DerivedProperty(
            [this.model.isPlayingProperty, a11y.controls.pauseStringProperty, a11y.controls.playStringProperty],
            (isPlaying, pause, play) => (isPlaying ? pause : play),
          ),
          // TODO: Add helpText when PhET accessibility is fully configured
          // helpText:
          //   "Start or stop time evolution of the wavefunction. Keyboard shortcut: Space bar.",
        },
      },
    });

    const restartButton = new RestartButton({
      ...FLAT_BUTTON_APPEARANCE_OPTIONS,
      radius: 15,
      listener: () => {
        this.model.isPlayingProperty.value = false;
        this.model.timeProperty.value = 0;
      },
      accessibleName: a11y.controls.restartTimeStringProperty,
    });
    const playbackControls = new HBox({ spacing: 6, align: "center", children: [restartButton, timeControlNode] });

    const speedButtons = new HorizontalAquaRadioButtonGroup(
      this.model.timeSpeedProperty,
      BaseModel.TIME_SPEED_MULTIPLIERS.map((speed) => ({
        value: speed,
        createNode: () =>
          new Text(`${speed}×`, {
            font: new PhetFont(14),
            fill: QPPWColors.textFillProperty,
          }),
        options: { accessibleName: `${speed}×` },
      })),
      {
        spacing: 10,
        radioButtonOptions: { radius: 7 },
        accessibleName: a11y.controls.animationSpeedStringProperty,
      },
    );
    const speedSection = new VBox({
      spacing: 5,
      align: "center",
      children: [
        new Text(a11y.controls.animationSpeedStringProperty, {
          font: new PhetFont(14),
          fill: QPPWColors.textFillProperty,
        }),
        speedButtons,
      ],
    });

    // Keep the readout, playback buttons, and speed choices in one stable row.
    const contentHBox = new HBox({
      spacing: 24,
      align: "center",
      children: [timeDisplayVBox, playbackControls, speedSection],
    });

    this.addChild(contentHBox);
    this.addDisposable(formattedTimeProperty);
  }
}
