/** A finite array of smooth Pöschl–Teller wells, optionally tilted by an electric field. */

import QuantumConstants from "./QuantumConstants.js";

/**
 * V(x) = −D Σ sech²((x − xᵢ)/a) + eℰx, with a = wellWidth / 2 and
 * xᵢ = (i − (N−1)/2)(wellWidth + wellSeparation).
 *
 * The finite sum has no single-well closed-form spectrum, so it is solved numerically.
 */
export function createMultiPoschlTellerPotential(
  numberOfWells: number,
  wellWidth: number,
  wellDepth: number,
  wellSeparation: number,
  electricField = 0,
): (x: number) => number {
  const widthParameter = wellWidth / 2;
  const period = wellWidth + wellSeparation;
  const centers = Array.from({ length: numberOfWells }, (_, i) => (i - (numberOfWells - 1) / 2) * period);
  const fieldSlope = QuantumConstants.ELEMENTARY_CHARGE * electricField;

  return (x: number): number => {
    let energy = fieldSlope * x;
    for (const center of centers) {
      const sech = 1 / Math.cosh((x - center) / widthParameter);
      energy -= wellDepth * sech * sech;
    }
    return energy;
  };
}
