import { describe, it, expect, vi, afterEach } from "vitest";
import { afterTyping, isTyping, startedTyping, stoppedTyping } from "./whileTyping";

describe("afterTyping", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs at once when the user is not typing", () => {
    const run = vi.fn();
    afterTyping(run);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("runs once the user leaves the field", () => {
    vi.useFakeTimers();
    const editor = {};
    startedTyping(editor);
    const run = vi.fn();
    afterTyping(run);
    vi.advanceTimersByTime(10_000);
    expect(run).not.toHaveBeenCalled();
    stoppedTyping(editor);
    vi.advanceTimersByTime(0);
    expect(run).toHaveBeenCalledTimes(1);
    expect(isTyping()).toBe(false);
  });

  it("waits while focus moves from one field to the next", () => {
    vi.useFakeTimers();
    const first = {};
    const second = {};
    startedTyping(first);
    const run = vi.fn();
    afterTyping(run);
    startedTyping(second);
    stoppedTyping(first);
    vi.advanceTimersByTime(1000);
    expect(run).not.toHaveBeenCalled();
    stoppedTyping(second);
    vi.advanceTimersByTime(0);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("does not run once cancelled", () => {
    vi.useFakeTimers();
    const editor = {};
    startedTyping(editor);
    const run = vi.fn();
    const cancel = afterTyping(run);
    cancel();
    stoppedTyping(editor);
    vi.advanceTimersByTime(1000);
    expect(run).not.toHaveBeenCalled();
  });
});
