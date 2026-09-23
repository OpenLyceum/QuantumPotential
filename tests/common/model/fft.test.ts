/**
 * fft() is used by the FGH solver and the momentum-space transform. It must work for any length,
 * not only powers of 2 (it used to throw for e.g. 511 grid points).
 */

import { describe, expect, it } from "vitest";
import { fft, ifft } from "../../../src/common/model/LinearAlgebraUtils.js";

function signal(length: number): Array<{ real: number; imaginary: number }> {
  return Array.from({ length }, (_, n) => ({ real: Math.cos(0.3 * n) + 0.1 * n, imaginary: Math.sin(0.7 * n) }));
}

describe("fft", () => {
  it.each([8, 12, 17, 64])("round-trips through ifft for length %i", (length) => {
    const x = signal(length);
    const back = ifft(fft(x));
    back.forEach((value, n) => {
      expect(value.real).toBeCloseTo(x[n]!.real, 10);
      expect(value.imaginary).toBeCloseTo(x[n]!.imaginary, 10);
    });
  });

  it("gives the same spectrum through the radix-2 and direct paths (DC term = sum)", () => {
    for (const length of [16, 15]) {
      const x = signal(length);
      const dc = fft(x)[0]!;
      expect(dc.real).toBeCloseTo(
        x.reduce((sum, value) => sum + value.real, 0),
        10,
      );
    }
  });
});
