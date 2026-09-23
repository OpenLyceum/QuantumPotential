import { expect, it, vi } from "vitest";
import { CoalescedUpdate } from "../../../src/common/view/CoalescedUpdate.js";

it("coalesces synchronous notifications into one update", async () => {
  const update = vi.fn();
  const scheduler = new CoalescedUpdate(update);
  scheduler.schedule();
  scheduler.schedule();
  scheduler.schedule();
  expect(update).not.toHaveBeenCalled();

  await Promise.resolve();
  expect(update).toHaveBeenCalledTimes(1);
  scheduler.schedule();
  await Promise.resolve();
  expect(update).toHaveBeenCalledTimes(2);
});
