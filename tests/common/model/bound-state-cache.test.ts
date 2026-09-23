import { describe, expect, it } from "vitest";
import { BaseModel } from "../../../src/common/model/BaseModel.js";

class NoStatesModel extends BaseModel {
  public solves = 0;

  public constructor() {
    super({ screenKind: "intro" });
    this.setupCacheInvalidation();
  }

  protected override calculateBoundStates(): void {
    this.solves++;
    this.boundStateResult = null;
  }

  protected override calculatePotentialEnergy(xGrid: readonly number[]): number[] {
    return xGrid.map(() => 0);
  }
}

describe("bound-state cache", () => {
  it("remembers a completed solve with no states until a parameter changes", () => {
    const model = new NoStatesModel();
    expect(model.getBoundStates()).toBeNull();
    expect(model.getEnergyLevels()).toEqual([]);
    expect(model.getEnergyLevel(1)).toBeNull();
    expect(model.getPotentialEnergy([0])).toEqual([0]);
    expect(model.solves).toBe(1);

    const revision = model.potentialRevisionProperty.value;
    model.wellWidthProperty.value += 0.1;
    expect(model.potentialRevisionProperty.value).toBe(revision + 1);
    expect(model.getBoundStates()).toBeNull();
    expect(model.solves).toBe(2);
    model.dispose();
  });
});
