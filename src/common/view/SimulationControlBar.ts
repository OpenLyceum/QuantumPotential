/**
 * SimulationControlBar provides playback controls and time display, placed under the charts of the
 * One, Two and Many Wells screens.
 */

import { DerivedProperty, NumberProperty } from "scenerystack/axon";
import { Dimension2, Range } from "scenerystack/dot";
import { StringUtils } from "scenerystack/phetcommon";
import { AlignBox, HBox, Node, Text, VBox } from "scenerystack/scenery";
import { PhetFont, RestartButton, TimeControlNode } from "scenerystack/scenery-phet";
import { HSlider } from "scenerystack/sun";
import stringManager from "../../i18n/StringManager.js";
import QPPWColors from "../../QPPWColors.js";
import { BaseModel } from "../model/BaseModel.js";
import { FLAT_BUTTON_APPEARANCE_OPTIONS, FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS } from "../QPPWButtonOptions.js";
import { PANEL_SLIDER_OPTIONS } from "../QPPWControlOptions.js";

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
      (time, format) => StringUtils.fillIn(format, { time: time.toFixed(2) }),
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
          accessibleHelpText: a11y.controls.stepForwardHelpStringProperty,
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
          accessibleHelpText: a11y.controls.stepBackwardHelpStringProperty,
        },
        playPauseButtonOptions: {
          ...FLAT_PLAY_PAUSE_STEP_BUTTON_OPTIONS.playPauseButtonOptions,
          // PDOM
          innerContent: new DerivedProperty(
            [this.model.isPlayingProperty, a11y.controls.pauseStringProperty, a11y.controls.playStringProperty],
            (isPlaying, pause, play) => (isPlaying ? pause : play),
          ),
          accessibleHelpText: a11y.controls.playPauseHelpStringProperty,
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

    // Five-notch speed slider (slow → very fast). It drives a notch index, kept in sync with the
    // model's speed multiplier, so the notches are evenly spaced even though the rates are geometric.
    const speeds: readonly number[] = BaseModel.TIME_SPEED_MULTIPLIERS;
    const maxSpeedIndex = speeds.length - 1;
    const speedIndexProperty = new NumberProperty(speeds.indexOf(this.model.timeSpeedProperty.value), {
      range: new Range(0, maxSpeedIndex),
    });
    const syncIndexFromSpeed = (speed: number) => {
      const index = speeds.indexOf(speed);
      if (index >= 0) {
        speedIndexProperty.value = index;
      }
    };
    const syncSpeedFromIndex = (index: number) => {
      this.model.timeSpeedProperty.value = speeds[index]!;
    };
    this.model.timeSpeedProperty.lazyLink(syncIndexFromSpeed);
    speedIndexProperty.lazyLink(syncSpeedFromIndex);

    const tickLabelOptions = { font: new PhetFont(12), fill: QPPWColors.textFillProperty, maxWidth: 70 };
    const speedSlider = new HSlider(speedIndexProperty, speedIndexProperty.range, {
      ...PANEL_SLIDER_OPTIONS,
      trackSize: new Dimension2(140, 4),
      thumbSize: new Dimension2(13, 24),
      constrainValue: (value: number) => Math.round(value),
      keyboardStep: 1,
      shiftKeyboardStep: 1,
      pageKeyboardStep: 1,
      majorTickLength: 12,
      minorTickLength: 8,
      majorTickStroke: QPPWColors.textFillProperty,
      minorTickStroke: QPPWColors.textFillProperty,
      accessibleName: a11y.controls.animationSpeedStringProperty,
      pdomCreateAriaValueText: (index: number | null) => `${speeds[index ?? 0]}×`,
    });
    speedSlider.addMajorTick(0, new Text(a11y.controls.slowStringProperty, tickLabelOptions));
    speedSlider.addMajorTick(maxSpeedIndex, new Text(a11y.controls.veryFastStringProperty, tickLabelOptions));
    for (let index = 1; index < maxSpeedIndex; index++) {
      speedSlider.addMinorTick(index);
    }

    const speedSection = new VBox({
      spacing: 5,
      align: "center",
      children: [
        new Text(a11y.controls.animationSpeedStringProperty, {
          font: new PhetFont(14),
          fill: QPPWColors.textFillProperty,
        }),
        speedSlider,
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
    this.addDisposable({
      dispose: () => {
        this.model.timeSpeedProperty.unlink(syncIndexFromSpeed);
        speedIndexProperty.dispose();
      },
    });
  }
}
