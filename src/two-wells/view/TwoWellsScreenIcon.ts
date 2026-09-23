/**
 * TwoWellsScreenIcon provides the icon for the Two Wells screen.
 * Features a colorful double potential well with tunneling visualization.
 */

import { Shape } from "scenerystack/kite";
import { LinearGradient, Node, Path, Rectangle } from "scenerystack/scenery";
import { ScreenIcon } from "scenerystack/sim";
import QPPWColors from "../../QPPWColors.js";

// Dimensions
const ICON_WIDTH = 70;
const ICON_HEIGHT = 50;
const CORNER_RADIUS = 4;

// Layout proportions
const PADDING = 5;
const WELL_TOP = ICON_HEIGHT * 0.16;
const WELL_BOTTOM = ICON_HEIGHT * 0.8;
const BARRIER_TOP = ICON_HEIGHT * 0.3;
const CENTRAL_BARRIER_WIDTH = 16;
const WELL_SECTION_WIDTH = (ICON_WIDTH - 2 * PADDING - CENTRAL_BARRIER_WIDTH) / 2;
const LEFT_WELL_END = PADDING + WELL_SECTION_WIDTH;
const RIGHT_WELL_START = LEFT_WELL_END + CENTRAL_BARRIER_WIDTH;

// Wave parameters
const WAVE_CENTER_Y = ICON_HEIGHT * 0.6;
const LEFT_WAVE_AMPLITUDE = 8;
const RIGHT_WAVE_AMPLITUDE = 6;
const TUNNEL_Y = ICON_HEIGHT * 0.52;

// Energy level layout
const ENERGY_LEVEL_Y = ICON_HEIGHT * 0.44;
const ENERGY_LEVEL_WIDTH = WELL_SECTION_WIDTH - 5;
const ENERGY_LEVEL_HEIGHT = 1.5;
const LEFT_ENERGY_X = PADDING + 3;
const RIGHT_ENERGY_X = RIGHT_WELL_START + 2;

// Line widths
const WELL_LINE_WIDTH = 2.5;
const WAVE_LINE_WIDTH = 2;
const TUNNEL_LINE_WIDTH = 1.5;

// Opacity
const BARRIER_OPACITY = 0.7;
const TUNNEL_OPACITY = 0.9;
const ENERGY_LEVEL_OPACITY = 0.8;

export class TwoWellsScreenIcon extends ScreenIcon {
  public constructor() {
    // Create background with gradient
    const backgroundGradient = new LinearGradient(0, 0, 0, ICON_HEIGHT)
      .addColorStop(0, QPPWColors.iconBackgroundTopProperty.value)
      .addColorStop(1, QPPWColors.iconBackgroundBottomProperty.value);

    const background = new Rectangle(0, 0, ICON_WIDTH, ICON_HEIGHT, {
      fill: backgroundGradient,
      cornerRadius: CORNER_RADIUS,
    });

    // Create double well shape (W-shaped)
    const wellShape = new Shape()
      .moveTo(PADDING, WELL_TOP)
      .lineTo(PADDING, WELL_BOTTOM)
      .lineTo(LEFT_WELL_END, WELL_BOTTOM)
      .lineTo(LEFT_WELL_END, BARRIER_TOP)
      .lineTo(RIGHT_WELL_START, BARRIER_TOP)
      .lineTo(RIGHT_WELL_START, WELL_BOTTOM)
      .lineTo(ICON_WIDTH - PADDING, WELL_BOTTOM)
      .lineTo(ICON_WIDTH - PADDING, WELL_TOP);

    const well = new Path(wellShape, {
      stroke: QPPWColors.iconWellStrokeProperty,
      lineWidth: WELL_LINE_WIDTH,
    });

    // Central barrier with gradient
    const barrierGradient = new LinearGradient(LEFT_WELL_END, 0, RIGHT_WELL_START, 0)
      .addColorStop(0, QPPWColors.iconBarrierEdgeProperty.value)
      .addColorStop(0.5, QPPWColors.iconBarrierCenterProperty.value)
      .addColorStop(1, QPPWColors.iconBarrierEdgeProperty.value);

    const barrierHeight = WELL_BOTTOM - BARRIER_TOP;
    const barrier = new Rectangle(LEFT_WELL_END, BARRIER_TOP, CENTRAL_BARRIER_WIDTH, barrierHeight, {
      fill: barrierGradient,
      opacity: BARRIER_OPACITY,
    });

    // Left well wave function
    const leftWaveStart = PADDING + 2;
    const leftWaveEnd = LEFT_WELL_END - 2;
    const leftWaveWidth = leftWaveEnd - leftWaveStart;
    const leftWaveShape = new Shape().moveTo(leftWaveStart, WAVE_CENTER_Y);
    for (let x = leftWaveStart; x <= leftWaveEnd; x += 0.5) {
      const normalizedX = (x - leftWaveStart) / leftWaveWidth;
      const amplitude = LEFT_WAVE_AMPLITUDE * Math.sin(normalizedX * Math.PI);
      leftWaveShape.lineTo(x, WAVE_CENTER_Y - amplitude);
    }

    const leftWave = new Path(leftWaveShape, {
      stroke: QPPWColors.iconWaveFunctionProperty,
      lineWidth: WAVE_LINE_WIDTH,
    });

    // Right well wave function (showing tunneled state)
    const rightWaveStart = RIGHT_WELL_START + 2;
    const rightWaveEnd = ICON_WIDTH - PADDING - 2;
    const rightWaveWidth = rightWaveEnd - rightWaveStart;
    const rightWaveShape = new Shape().moveTo(rightWaveStart, WAVE_CENTER_Y);
    for (let x = rightWaveStart; x <= rightWaveEnd; x += 0.5) {
      const normalizedX = (x - rightWaveStart) / rightWaveWidth;
      const amplitude = RIGHT_WAVE_AMPLITUDE * Math.sin(normalizedX * Math.PI);
      rightWaveShape.lineTo(x, WAVE_CENTER_Y - amplitude);
    }

    const rightWave = new Path(rightWaveShape, {
      stroke: QPPWColors.wavefunctionImaginaryProperty,
      lineWidth: WAVE_LINE_WIDTH,
    });

    // Tunneling effect - dashed line through barrier
    const tunnelShape = new Shape().moveTo(LEFT_WELL_END - 2, TUNNEL_Y).lineTo(RIGHT_WELL_START + 2, TUNNEL_Y);

    const tunnelEffect = new Path(tunnelShape, {
      stroke: QPPWColors.iconTunnelEffectProperty,
      lineWidth: TUNNEL_LINE_WIDTH,
      lineDash: [2, 2],
      opacity: TUNNEL_OPACITY,
    });

    // Energy levels
    const leftEnergy = new Rectangle(LEFT_ENERGY_X, ENERGY_LEVEL_Y, ENERGY_LEVEL_WIDTH, ENERGY_LEVEL_HEIGHT, {
      fill: QPPWColors.iconEnergyLevelProperty,
      opacity: ENERGY_LEVEL_OPACITY,
    });

    const rightEnergy = new Rectangle(RIGHT_ENERGY_X, ENERGY_LEVEL_Y, ENERGY_LEVEL_WIDTH, ENERGY_LEVEL_HEIGHT, {
      fill: QPPWColors.iconEnergyLevelProperty,
      opacity: ENERGY_LEVEL_OPACITY,
    });

    const iconNode = new Node({
      children: [background, barrier, well, leftEnergy, rightEnergy, leftWave, rightWave, tunnelEffect],
    });

    super(iconNode, {
      fill: QPPWColors.backgroundColorProperty,
    });
  }
}
