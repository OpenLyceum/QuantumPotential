import { describe, expect, it } from "vitest";
import { phaseToReversedTwilight } from "../../../src/common/view/chart-tools/PhaseColormap.js";

describe("phaseToReversedTwilight", () => {
  it("is cyclic across full turns", () => {
    expect(phaseToReversedTwilight(0)).toBe(phaseToReversedTwilight(2 * Math.PI));
    expect(phaseToReversedTwilight(Math.PI / 3)).toBe(phaseToReversedTwilight(Math.PI / 3 - 2 * Math.PI));
  });

  it("keeps the twilight seam at zero phase", () => {
    expect(phaseToReversedTwilight(0)).toBe("rgb(226, 217, 226)");
  });

  it("reverses the colors assigned to positive and negative phase", () => {
    expect(phaseToReversedTwilight(Math.PI / 2)).toBe("rgb(184, 86, 53)");
    expect(phaseToReversedTwilight(-Math.PI / 2)).toBe("rgb(107, 102, 171)");
  });
});
