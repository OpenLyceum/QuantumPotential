import { describe, expect, it } from "vitest";
import { getEnergyLevelDecimalPlaces } from "../src/common/view/EnergyLevelPrecision.js";

describe("energy level display precision", () => {
  it("uses the nearest adjacent level and keeps two decimal places at minimum", () => {
    expect(getEnergyLevelDecimalPlaces([1, 1.25, 3], 0)).toBe(2);
    expect(getEnergyLevelDecimalPlaces([1, 1.25, 3], 1)).toBe(2);
    expect(getEnergyLevelDecimalPlaces([1, 3], 1)).toBe(2);
  });

  it("resolves closely spaced levels using the first nonzero spacing digit", () => {
    expect(getEnergyLevelDecimalPlaces([0, 0.004, 0.00407], 1)).toBe(5);
    expect(getEnergyLevelDecimalPlaces([0, 0.004, 0.00407], 2)).toBe(5);
    expect(getEnergyLevelDecimalPlaces([0, 1e-12], 0)).toBe(12);
  });
});
