/**
 * SimulationControlBar provides playback controls and time display.
 * This is displayed at the bottom of quantum physics screens.
 */

import { DerivedProperty } from "scenerystack/axon";
import { HBox, Node, Rectangle, Text, VBox } from "scenerystack/scenery";
import { PhetFont, TimeControlNode } from "scenerystack/scenery-phet";
import stringManager from "../../i18n/StringManager.js";
import QPPWColors from "../../QPPWColors.js";
import { BaseModel } from "../model/BaseModel.js";

export class SimulationControlBar extends Node {
  private readonly model: BaseModel;
  private readonly timeText: Text;
  private readonly barWidth: number;

  public constructor(model: BaseModel, options?: { width?: number }) {
    super();

    this.model = model;
    this.barWidth = options?.width ?? 800;

    // Create background bar
    const backgroundRectangle = new Rectangle(0, 0, this.barWidth, 80, {
      fill: QPPWColors.panelFillProperty,
      stroke: null, // Remove border to avoid line appearing below chart
      lineWidth: 0,
    });
    this.addChild(backgroundRectangle);

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
        includeStepForwardButton: true,
        includeStepBackwardButton: true,
        stepForwardButtonOptions: {
          listener: () => {
            // Step forward by one frame (forced even when paused)
            this.model.step(BaseModel.MANUAL_STEP_SIZE, true);
          },
          enabledProperty: DerivedProperty.not(this.model.isPlayingProperty),
          radius: 15, // Smaller than play/pause button

          // PDOM
          innerContent: "Step Forward",
          // TODO: Add helpText when PhET accessibility is fully configured
          // helpText:
          //   "Step forward one frame in time. Advances wavefunction by small time increment.",
        },
        stepBackwardButtonOptions: {
          listener: () => {
            // Step backward by one frame (negative time step, forced even when paused)
            this.model.step(-BaseModel.MANUAL_STEP_SIZE, true);
          },
          enabledProperty: DerivedProperty.not(this.model.isPlayingProperty),
          radius: 15, // Smaller than play/pause button

          // PDOM
          innerContent: "Step Backward",
          // TODO: Add helpText when PhET accessibility is fully configured
          // helpText:
          //   "Step backward one frame in time. Reverses wavefunction by small time increment.",
        },
        playPauseButtonOptions: {
          // PDOM
          innerContent: new DerivedProperty([this.model.isPlayingProperty], (isPlaying) =>
            isPlaying ? "Pause" : "Play",
          ),
          // TODO: Add helpText when PhET accessibility is fully configured
          // helpText:
          //   "Start or stop time evolution of the wavefunction. Keyboard shortcut: Space bar.",
        },
      },
      speedRadioButtonGroupPlacement: "left",
      speedRadioButtonGroupOptions: {
        labelOptions: {
          fill: QPPWColors.textFillProperty,
        },

        // PDOM
        accessibleName: "Animation Speed",
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
      centerX: this.barWidth / 2,
      centerY: 40,
    });

    this.addChild(contentHBox);
  }
}
