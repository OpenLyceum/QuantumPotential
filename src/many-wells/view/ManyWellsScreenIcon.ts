/**
 * ManyWellsScreenIcon provides the icon for the Many Wells screen.
 * Features a colorful periodic potential with energy band visualization.
 */

import { Shape } from "scenerystack/kite";
import { LinearGradient, Node, Path, Rectangle } from "scenerystack/scenery";
import { ScreenIcon } from "scenerystack/sim";
import QPPWColors from "../../QPPWColors.js";

// Dimensions
const ICON_WIDTH = 80;
const ICON_HEIGHT = 50;
const CORNER_RADIUS = 4;
const NUM_WELLS = 4;
const WELL_WIDTH = 12;
const BARRIER_WIDTH = 6;

// Layout proportions
const WELL_TOP = ICON_HEIGHT * 0.16;
const WELL_BOTTOM = ICON_HEIGHT * 0.8;
const WELL_DEPTH = WELL_BOTTOM - WELL_TOP;
const WAVE_CENTER_Y = ICON_HEIGHT * 0.52;
const WAVE_AMPLITUDE = 4;
const WELL_INNER_PADDING = 1;

// Energy band layout
const NUM_BANDS = 4;
const BAND_HEIGHT = 1.5;
const BAND_TOP = ICON_HEIGHT * 0.3;
const BAND_SPACING = (WELL_BOTTOM - BAND_TOP - BAND_HEIGHT) / (NUM_BANDS - 1);
const BAND_Y_POSITIONS = Array.from({ length: NUM_BANDS }, (_, i) => BAND_TOP + i * BAND_SPACING);

// Line widths
const POTENTIAL_LINE_WIDTH = 2;
const BLOCH_WAVE_LINE_WIDTH = 1.5;

// Opacity
const BARRIER_OPACITY = 0.6;
const BASE_BAND_OPACITY = 0.8;
const BAND_OPACITY_DECREMENT = 0.1;

export class ManyWellsScreenIcon extends ScreenIcon {
  public constructor() {
    // Energy band colors from QPPWColors
    const BAND_COLORS = [
      QPPWColors.band1Property.value,
      QPPWColors.band2Property.value,
      QPPWColors.band3Property.value,
      QPPWColors.band4Property.value,
    ];

    // Create background with gradient
    const backgroundGradient = new LinearGradient(0, 0, 0, ICON_HEIGHT)
      .addColorStop(0, QPPWColors.iconBackgroundTopProperty.value)
      .addColorStop(1, QPPWColors.iconBackgroundBottomProperty.value);

    const background = new Rectangle(0, 0, ICON_WIDTH, ICON_HEIGHT, {
      fill: backgroundGradient,
      cornerRadius: CORNER_RADIUS,
    });

    // Create periodic potential shape
    const totalWidth = NUM_WELLS * WELL_WIDTH + (NUM_WELLS - 1) * BARRIER_WIDTH;
    const startX = (ICON_WIDTH - totalWidth) / 2;

    const potentialShape = new Shape().moveTo(startX, WELL_TOP);

    for (let i = 0; i < NUM_WELLS; i++) {
      const wellX = startX + i * (WELL_WIDTH + BARRIER_WIDTH);

      // Down into well
      potentialShape.lineTo(wellX, WELL_TOP);
      potentialShape.lineTo(wellX, WELL_BOTTOM);

      // Across bottom of well
      potentialShape.lineTo(wellX + WELL_WIDTH, WELL_BOTTOM);

      // Up out of well (if not last)
      if (i < NUM_WELLS - 1) {
        potentialShape.lineTo(wellX + WELL_WIDTH, WELL_TOP);
        // Across top of barrier
        potentialShape.lineTo(wellX + WELL_WIDTH + BARRIER_WIDTH, WELL_TOP);
      } else {
        potentialShape.lineTo(wellX + WELL_WIDTH, WELL_TOP);
      }
    }

    const potential = new Path(potentialShape, {
      stroke: QPPWColors.iconWellStrokeProperty,
      lineWidth: POTENTIAL_LINE_WIDTH,
    });

    // Create barriers with gradient fills
    const barriers: Node[] = [];
    for (let i = 0; i < NUM_WELLS - 1; i++) {
      const barrierX = startX + (i + 1) * WELL_WIDTH + i * BARRIER_WIDTH;

      const barrierGradient = new LinearGradient(barrierX, 0, barrierX + BARRIER_WIDTH, 0)
        .addColorStop(0, QPPWColors.iconBarrierEdgeProperty.value)
        .addColorStop(0.5, QPPWColors.iconBarrierCenterProperty.value)
        .addColorStop(1, QPPWColors.iconBarrierEdgeProperty.value);

      barriers.push(
        new Rectangle(barrierX, WELL_TOP, BARRIER_WIDTH, WELL_DEPTH, {
          fill: barrierGradient,
          opacity: BARRIER_OPACITY,
        }),
      );
    }

    // Energy bands (multiple horizontal lines with gradient colors)
    const energyBands: Node[] = [];
    const bandInnerWidth = WELL_WIDTH - 2 * WELL_INNER_PADDING;

    for (let band = 0; band < BAND_COLORS.length; band++) {
      // Draw energy band across all wells
      for (let i = 0; i < NUM_WELLS; i++) {
        const wellX = startX + i * (WELL_WIDTH + BARRIER_WIDTH);
        energyBands.push(
          new Rectangle(wellX + WELL_INNER_PADDING, BAND_Y_POSITIONS[band]!, bandInnerWidth, BAND_HEIGHT, {
            fill: BAND_COLORS[band]!,
            opacity: BASE_BAND_OPACITY - band * BAND_OPACITY_DECREMENT,
          }),
        );
      }
    }

    // Bloch wave function (sinusoidal across all wells)
    const waveShape = new Shape();
    let firstPoint = true;

    for (let i = 0; i < NUM_WELLS; i++) {
      const wellX = startX + i * (WELL_WIDTH + BARRIER_WIDTH);

      for (let x = wellX + WELL_INNER_PADDING; x <= wellX + WELL_WIDTH - WELL_INNER_PADDING; x += 0.5) {
        const localX = (x - wellX) / WELL_WIDTH;
        const globalPhase = i * Math.PI;
        const amplitude = WAVE_AMPLITUDE * Math.sin(localX * Math.PI);
        const y = WAVE_CENTER_Y - amplitude * Math.cos(globalPhase);

        if (firstPoint) {
          waveShape.moveTo(x, y);
          firstPoint = false;
        } else {
          waveShape.lineTo(x, y);
        }
      }
    }

    const blochWave = new Path(waveShape, {
      stroke: QPPWColors.iconWaveFunctionProperty,
      lineWidth: BLOCH_WAVE_LINE_WIDTH,
    });

    const iconNode = new Node({
      children: [background, ...barriers, potential, ...energyBands, blochWave],
    });

    super(iconNode, {
      fill: QPPWColors.backgroundColorProperty,
    });
  }
}
