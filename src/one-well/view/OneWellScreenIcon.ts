/**
 * OneWellScreenIcon provides the icon for the One Well screen.
 * Features a colorful single potential well with a wave function visualization.
 */

import { Shape } from "scenerystack/kite";
import { LinearGradient, Node, Path, Rectangle } from "scenerystack/scenery";
import { ScreenIcon } from "scenerystack/sim";
import QPPWColors from "../../QPPWColors.js";

// Dimensions
const ICON_WIDTH = 60;
const ICON_HEIGHT = 50;
const CORNER_RADIUS = 4;

// Layout proportions
const PADDING = 5;
const WELL_TOP = ICON_HEIGHT * 0.2;
const WELL_BOTTOM = ICON_HEIGHT - PADDING * 2;
const WAVE_PADDING = PADDING + 3;
const WAVE_CENTER_Y = ICON_HEIGHT / 2;
const WAVE_WIDTH = ICON_WIDTH - 2 * WAVE_PADDING;
const PROBABILITY_BASELINE = WELL_BOTTOM - 2;
const ENERGY_LEVEL_Y = WAVE_CENTER_Y - 5;
const ENERGY_LEVEL_WIDTH = ICON_WIDTH - 2 * WAVE_PADDING - 4;
const ENERGY_LEVEL_HEIGHT = 2;

// Wave parameters
const WAVE_AMPLITUDE = 10;
const PROBABILITY_AMPLITUDE = 18;

// Line widths
const WELL_LINE_WIDTH = 3;
const WAVE_LINE_WIDTH = 2.5;

// Opacity
const ENERGY_LEVEL_OPACITY = 0.8;

export class OneWellScreenIcon extends ScreenIcon {
  public constructor() {
    // Create background with gradient
    const backgroundGradient = new LinearGradient(0, 0, 0, ICON_HEIGHT)
      .addColorStop(0, QPPWColors.iconBackgroundTopProperty.value)
      .addColorStop(1, QPPWColors.iconBackgroundBottomProperty.value);

    const background = new Rectangle(0, 0, ICON_WIDTH, ICON_HEIGHT, {
      fill: backgroundGradient,
      cornerRadius: CORNER_RADIUS,
    });

    // Create potential well shape (U-shaped)
    const wellShape = new Shape()
      .moveTo(PADDING, WELL_TOP)
      .lineTo(PADDING, WELL_BOTTOM)
      .lineTo(ICON_WIDTH - PADDING, WELL_BOTTOM)
      .lineTo(ICON_WIDTH - PADDING, WELL_TOP);

    const well = new Path(wellShape, {
      stroke: QPPWColors.iconWellStrokeProperty,
      lineWidth: WELL_LINE_WIDTH,
    });

    // Create wave function (sinusoidal curve)
    const waveShape = new Shape().moveTo(WAVE_PADDING, WAVE_CENTER_Y);
    for (let x = WAVE_PADDING; x <= WAVE_PADDING + WAVE_WIDTH; x += 1) {
      const normalizedX = (x - WAVE_PADDING) / WAVE_WIDTH;
      const amplitude = WAVE_AMPLITUDE * Math.sin(normalizedX * Math.PI);
      const y = WAVE_CENTER_Y - amplitude * Math.sin(normalizedX * Math.PI);
      waveShape.lineTo(x, y);
    }

    const waveFunction = new Path(waveShape, {
      stroke: QPPWColors.iconWaveFunctionProperty,
      lineWidth: WAVE_LINE_WIDTH,
    });

    // Create probability density fill
    const probabilityShape = new Shape().moveTo(WAVE_PADDING, PROBABILITY_BASELINE);
    for (let x = WAVE_PADDING; x <= WAVE_PADDING + WAVE_WIDTH; x += 1) {
      const normalizedX = (x - WAVE_PADDING) / WAVE_WIDTH;
      const amplitude = Math.sin(normalizedX * Math.PI) ** 2 * PROBABILITY_AMPLITUDE;
      probabilityShape.lineTo(x, PROBABILITY_BASELINE - amplitude);
    }
    probabilityShape.lineTo(WAVE_PADDING + WAVE_WIDTH, PROBABILITY_BASELINE).close();

    const probabilityFill = new Path(probabilityShape, {
      fill: QPPWColors.wavefunctionProbabilityFillProperty,
    });

    // Energy level indicator
    const energyLevel = new Rectangle(WAVE_PADDING + 2, ENERGY_LEVEL_Y, ENERGY_LEVEL_WIDTH, ENERGY_LEVEL_HEIGHT, {
      fill: QPPWColors.iconEnergyLevelProperty,
      opacity: ENERGY_LEVEL_OPACITY,
    });

    const iconNode = new Node({
      children: [background, probabilityFill, well, energyLevel, waveFunction],
    });

    super(iconNode, {
      fill: QPPWColors.backgroundColorProperty,
    });
  }
}
