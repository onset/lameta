// Cloud-only OneDrive files can be huge (2 GB+) and lameta has no way to know
// how long a fetch will take, so auto-fetching must be conservative:
//  - only kick in once the user's selection has RESTED on a file for a bit
//    (so arrow-keying/clicking through a list doesn't fetch every row passed)
//  - only ever a couple of auto-fetches in flight at once, so a user quickly
//    visiting several small cloud-only files doesn't saturate the connection
// Explicit, user-initiated fetches (the "Make available on this device"
// button) are not subject to either limit -- those go through
// File.makeAvailableOffline() directly.

export const kDefaultAutoFetchDwellMs = 1500;
export const kDefaultMaxConcurrentAutoFetches = 2;

export interface AutoFetchableFile {
  cloudStatus: string;
  getSizeInBytes(): number;
  makeAvailableOffline(): Promise<void>;
}

export function mbToBytes(mb: number): number {
  return mb * 1024 * 1024;
}

export class AutoFetchCloudFiles {
  private dwellTimer: ReturnType<typeof setTimeout> | undefined;
  private inFlightCount = 0;

  public constructor(
    private readonly dwellMs: number = kDefaultAutoFetchDwellMs,
    private readonly maxConcurrent: number = kDefaultMaxConcurrentAutoFetches
  ) {}

  public get inFlight(): number {
    return this.inFlightCount;
  }

  // Call whenever the user's selection changes. `thresholdBytes` is the
  // current AutoFetchCloudFilesUnderMB setting, already converted to bytes
  // (0 = never auto-fetch, Infinity = always).
  public onSelectionChanged(
    file: AutoFetchableFile | undefined,
    thresholdBytes: number
  ): void {
    if (this.dwellTimer !== undefined) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = undefined;
    }

    if (
      !file ||
      file.cloudStatus !== "cloudOnly" ||
      thresholdBytes <= 0 ||
      file.getSizeInBytes() >= thresholdBytes
    ) {
      return;
    }

    this.dwellTimer = setTimeout(() => {
      this.dwellTimer = undefined;
      this.startFetchIfRoom(file);
    }, this.dwellMs);
  }

  private startFetchIfRoom(file: AutoFetchableFile): void {
    // Re-check status: it may have changed (e.g. someone already fetched it,
    // or it's mid-hydration) between when the dwell timer was scheduled and
    // when it fired.
    if (
      this.inFlightCount >= this.maxConcurrent ||
      file.cloudStatus !== "cloudOnly"
    ) {
      return;
    }
    this.inFlightCount++;
    file
      .makeAvailableOffline()
      .catch(() => {
        // Best-effort background fetch. If the user cares, the file will
        // still show as cloud-only and they can retry explicitly.
      })
      .finally(() => {
        this.inFlightCount--;
      });
  }

  public dispose(): void {
    if (this.dwellTimer !== undefined) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = undefined;
    }
  }
}
