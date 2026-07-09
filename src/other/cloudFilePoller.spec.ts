import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { cloudFilePoller, kCloudPollIntervalMs, PollableFile } from "./cloudFilePoller";

function makeFile(initialStatus: string): PollableFile {
  return {
    cloudStatus: initialStatus,
    updateCloudStatus: vi.fn()
  };
}

describe("cloudFilePoller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cloudFilePoller.dispose();
    vi.useRealTimers();
  });

  it("polls a watched file on each interval tick", () => {
    const file = makeFile("hydrating");
    cloudFilePoller.watch(file);

    vi.advanceTimersByTime(kCloudPollIntervalMs);
    expect(file.updateCloudStatus).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(kCloudPollIntervalMs);
    expect(file.updateCloudStatus).toHaveBeenCalledTimes(2);
  });

  it("drops a file once its status is no longer hydrating", () => {
    const file = makeFile("hydrating");
    (file.updateCloudStatus as any).mockImplementation(() => {
      file.cloudStatus = "local";
    });
    cloudFilePoller.watch(file);

    vi.advanceTimersByTime(kCloudPollIntervalMs);
    expect(file.updateCloudStatus).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(kCloudPollIntervalMs);
    expect(file.updateCloudStatus).toHaveBeenCalledTimes(1);
  });

  it("clears the interval once the last watched file drops", () => {
    const file = makeFile("hydrating");
    (file.updateCloudStatus as any).mockImplementation(() => {
      file.cloudStatus = "local";
    });
    cloudFilePoller.watch(file);

    vi.advanceTimersByTime(kCloudPollIntervalMs);
    expect(file.updateCloudStatus).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(kCloudPollIntervalMs * 5);
    expect(file.updateCloudStatus).toHaveBeenCalledTimes(1);
  });

  it("restarts polling when watch() is called again after the set emptied", () => {
    const file1 = makeFile("hydrating");
    (file1.updateCloudStatus as any).mockImplementation(() => {
      file1.cloudStatus = "local";
    });
    cloudFilePoller.watch(file1);
    vi.advanceTimersByTime(kCloudPollIntervalMs);
    expect(file1.updateCloudStatus).toHaveBeenCalledTimes(1);

    const file2 = makeFile("hydrating");
    cloudFilePoller.watch(file2);

    vi.advanceTimersByTime(kCloudPollIntervalMs);
    expect(file2.updateCloudStatus).toHaveBeenCalledTimes(1);
  });

  it("does not double-poll a file watched twice", () => {
    const file = makeFile("hydrating");
    cloudFilePoller.watch(file);
    cloudFilePoller.watch(file);

    vi.advanceTimersByTime(kCloudPollIntervalMs);
    expect(file.updateCloudStatus).toHaveBeenCalledTimes(1);
  });
});
