// Structural type -- deliberately no import of the File class.
export interface PollableFile {
  cloudStatus: string;
  updateCloudStatus(): void;
}

export const kCloudPollIntervalMs = 1500;

// With no worker to notify us, a file's hydrating->local transition can only
// be noticed by re-reading its attributes. One singleton timer serves every
// watched file -- a previous version of this feature leaked a per-file abort
// listener, so this design deliberately has exactly one setInterval and zero
// event listeners.
class CloudFilePoller {
  private watched = new Set<PollableFile>();
  private timer: ReturnType<typeof setInterval> | undefined;

  public watch(file: PollableFile): void {
    this.watched.add(file);
    if (!this.timer) {
      this.timer = setInterval(() => this.tick(), kCloudPollIntervalMs);
    }
  }

  private tick(): void {
    // Snapshot so a watch() call triggered by updateCloudStatus() can't
    // mutate the set out from under this iteration.
    for (const file of [...this.watched]) {
      file.updateCloudStatus();
      if (file.cloudStatus !== "hydrating") {
        this.watched.delete(file);
      }
    }
    if (this.watched.size === 0 && this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
  }

  public dispose(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }
    this.watched.clear();
  }
}

export const cloudFilePoller = new CloudFilePoller();
