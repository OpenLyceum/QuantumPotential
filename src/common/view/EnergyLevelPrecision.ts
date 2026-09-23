/** Decimal places needed to distinguish an energy from its adjacent levels, in eV. */
export function getEnergyLevelDecimalPlaces(energies: readonly number[], index: number): number {
  const energy = energies[index];
  if (energy === undefined) {
    return 2;
  }

  let difference = 1000;
  if (index > 0) {
    difference = Math.abs(energy - energies[index - 1]!);
  }
  if (index < energies.length - 1) {
    difference = Math.min(difference, Math.abs(energy - energies[index + 1]!));
  }
  if (difference >= 1) {
    return 2;
  }

  // Match Quantum Bound States: inspect the first nonzero decimal digit of the
  // nearest spacing, then keep at least two decimal places.
  const decimalDigits = difference.toFixed(20).split(".")[1]!;
  const firstNonzero = decimalDigits.search(/[1-9]/);
  return Math.max(2, Math.min(25, firstNonzero < 0 ? 20 : firstNonzero + 1));
}
