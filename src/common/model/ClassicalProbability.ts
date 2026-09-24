/**
 * Classical probability density of a particle of energy E moving in V(x): P(x) ∝ 1/v(x) = 1/√(2(E − V)/m)
 * inside the classically allowed region, and 0 outside it, normalized so that ∫P dx = 1.
 *
 * P is singular at the turning points, so the kinetic energy is floored at a fraction of its maximum (a
 * relative floor, since energies are ~1e-19 J). This keeps the curve finite and plottable beside |ψ|² without
 * changing its shape elsewhere.
 */

/** Floor on the kinetic energy, as a fraction of its maximum over the grid. */
const MIN_KINETIC_ENERGY_FRACTION = 0.01;

/**
 * @param potential - V at each grid point (J); non-finite values (walls, singularities) count as forbidden
 * @param energy - total energy (J)
 * @param mass - particle mass (kg)
 * @param xGrid - positions (m)
 * @returns the normalized density at each grid point (m⁻¹)
 */
export function calculateClassicalProbabilityDensity(
  potential: readonly number[],
  energy: number,
  mass: number,
  xGrid: readonly number[],
): number[] {
  let maxKineticEnergy = 0;
  for (const v of potential) {
    const kineticEnergy = energy - v;
    if (Number.isFinite(kineticEnergy) && kineticEnergy > maxKineticEnergy) {
      maxKineticEnergy = kineticEnergy;
    }
  }
  const minKineticEnergy = MIN_KINETIC_ENERGY_FRACTION * maxKineticEnergy;

  const density = potential.map((v) => {
    const kineticEnergy = energy - v;
    return Number.isFinite(kineticEnergy) && kineticEnergy > 0
      ? 1 / Math.sqrt((2 * Math.max(kineticEnergy, minKineticEnergy)) / mass)
      : 0;
  });

  // Normalize with the trapezoidal rule
  let integral = 0;
  for (let i = 1; i < density.length; i++) {
    integral += ((density[i]! + density[i - 1]!) * (xGrid[i]! - xGrid[i - 1]!)) / 2;
  }
  return integral > 0 ? density.map((p) => p / integral) : density;
}
