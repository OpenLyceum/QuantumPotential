/**
 * Maps wavefunction phase to a reversed version of the cyclic "twilight" colormap used by PhET's
 * Quantum Bound States simulation. Reversing the phase direction preserves the seam at zero while
 * exchanging the colors assigned to positive and negative phases.
 */

type Rgb = readonly [number, number, number];

// Equally spaced samples from the cyclic twilight colormap used by Quantum Bound States.
const TWILIGHT_PALETTE: readonly Rgb[] = [
  [0.88575, 0.850009, 0.887973],
  [0.786704, 0.736551, 0.875285],
  [0.659225, 0.614799, 0.824051],
  [0.521328, 0.491902, 0.745531],
  [0.384072, 0.368671, 0.642999],
  [0.261122, 0.24614, 0.514349],
  [0.190631, 0.174639, 0.371857],
  [0.18488, 0.079425, 0.213076],
  [0.277935, 0.050344, 0.094963],
  [0.417642, 0.090719, 0.07916],
  [0.562738, 0.177596, 0.119724],
  [0.695029, 0.299631, 0.18362],
  [0.808892, 0.446809, 0.287795],
  [0.894493, 0.618705, 0.457609],
  [0.941512, 0.779133, 0.674998],
  [0.88575, 0.850009, 0.887973],
];

const TWO_PI = 2 * Math.PI;

/**
 * Convert a phase in radians to a CSS color using the reversed twilight colormap.
 */
export function phaseToReversedTwilight(radians: number): string {
  const reversedRadians = -radians;
  const normalizedRadians = ((reversedRadians % TWO_PI) + TWO_PI) % TWO_PI;
  const degrees = Math.floor((normalizedRadians / TWO_PI) * 360);
  const scaled = (degrees / 360) * (TWILIGHT_PALETTE.length - 1);
  const index = Math.floor(scaled);
  const fraction = scaled - index;
  const color0 = TWILIGHT_PALETTE[index]!;
  const color1 = TWILIGHT_PALETTE[Math.min(index + 1, TWILIGHT_PALETTE.length - 1)]!;

  const red = interpolateColorComponent(color0[0], color1[0], fraction);
  const green = interpolateColorComponent(color0[1], color1[1], fraction);
  const blue = interpolateColorComponent(color0[2], color1[2], fraction);

  return `rgb(${red}, ${green}, ${blue})`;
}

function interpolateColorComponent(a: number, b: number, fraction: number): number {
  return Math.round((a + (b - a) * fraction) * 255);
}
