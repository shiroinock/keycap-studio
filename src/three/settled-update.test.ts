import { afterEach, expect, it, vi } from "vitest";
import { settledUpdate } from "./settled-update";
afterEach(() => vi.useRealTimers());
it("publishes only the final value after a burst of wheel start/end events", () => {
  vi.useFakeTimers();
  let zoom = 1;
  const output: number[] = [];
  const update = settledUpdate(() => output.push(zoom));
  for (let i = 0; i < 40; i++) {
    update.cancel();
    zoom += 0.01;
    update.schedule();
    vi.advanceTimersByTime(16);
  }
  expect(output).toEqual([]);
  vi.advanceTimersByTime(150);
  expect(output).toEqual([zoom]);
  vi.advanceTimersByTime(1000);
  expect(output).toHaveLength(1);
});
it("cancels pending gesture updates on external view commands and disposal", () => {
  vi.useFakeTimers();
  const publish = vi.fn();
  const update = settledUpdate(publish);
  update.schedule();
  vi.advanceTimersByTime(100);
  update.cancel();
  vi.advanceTimersByTime(200);
  expect(publish).not.toHaveBeenCalled();
  update.schedule();
  vi.advanceTimersByTime(150);
  expect(publish).toHaveBeenCalledTimes(1);
});
