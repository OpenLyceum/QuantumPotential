/**
 * SimulationControlBar provides playback controls and time display, placed under the charts of the
 * One, Two and Many Wells screens.
 */

import { DerivedProperty } from "scenerystack/axon";
import { HBox, Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont, TimeControlNode } from "scenerystack/scenery-phet";
import stringManager from "../../i18n/StringManager.js";
import QPPWColors from "../../QPPWColors.js";
import { BaseModel } from "../model/BaseModel.js";
import { FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS, TIME_CONTROL_SPEED_RADIO_OPTIONS } from "../QPPWButtonOptions.js";

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

    this.timeText = new Text(stringManager.timeFormatStringProperty.value.replace("{{time}}", "0.00"), {
      font: new PhetFont({ size: 16, weight: "bold" }),
      fill: QPPWColors.textFillProperty,
    });

    this.model.timeProperty.link((time: number) => {
      this.timeText.string = stringManager.timeFormatStringProperty.value.replace("{{time}}", time.toFixed(2));
    });

    const timeDisplayVBox = new VBox({
      spacing: 5,
      align: "center",
      children: [timeLabel, this.timeText],
    });

    // Time controls (play/pause and step buttons)
    const timeControlNode = new TimeControlNode(this.model.isPlayingProperty, {
      timeSpeedProperty: this.model.timeSpeedProperty,
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
      speedRadioButtonGroupPlacement: "left",
      speedRadioButtonGroupOptions: {
        ...TIME_CONTROL_SPEED_RADIO_OPTIONS.speedRadioButtonGroupOptions,

        // PDOM
        accessibleName: a11y.controls.animationSpeedStringProperty,
        // TODO: Add helpText when PhET accessibility is fully configured
        // helpText:
        //   "Control time evolution speed. Use arrow keys to navigate options, Space or Enter to select.",
      },
    });

    const playbackButtonsHBox = new HBox({
      spacing: 10,
      children: [timeControlNode],
    });

    const playbackSectionVBox = new VBox({
      spacing: 8,
      align: "center",
      children: [playbackButtonsHBox],
    });

    // Arrange all sections horizontally
    const contentHBox = new HBox({
      spacing: 40,
      align: "center",
      children: [timeDisplayVBox, playbackSectionVBox],
    });

    this.addChild(contentHBox);
  }
}
