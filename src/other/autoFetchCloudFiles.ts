// Cloud-only OneDrive files can be huge (2 GB+) and lameta has no way to know
// how long a fetch will take, so auto-fetching must be conservative:
//  - only kick in once the user's selection has RESTED on a file for a bit
//    (so arrow-keying/clicking through a list doesn't fetch every row passed)
// makeAvailableOffline() now just pins the file (a fast attribute flip) and
// lets OneDrive's own sync engine queue and throttle the actual download, so
// there is no concurrency cap to manage here.
// Explicit, user-initiated fetches (checking the "available offline"
// checkbox) are not subject to the dwell delay -- those go through
// File.makeAvailableOffline() directly.

export const kDefaultAutoFetchDwellMs = 1500;

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

  public constructor(
    private readonly dwellMs: number = kDefaultAutoFetchDwellMs
  ) {}

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
      this.startFetch(file);
    }, this.dwellMs);
  }

  private startFetch(file: AutoFetchableFile): void {
    // Re-check status: it may have changed (e.g. someone already fetched it,
    // or it's mid-hydration) between when the dwell timer was scheduled and
    // when it fired.
    if (file.cloudStatus !== "cloudOnly") {
      return;
    }
    file.makeAvailableOffline().catch(() => {
      // Best-effort background fetch. If the user cares, the file will
      // still show as cloud-only and they can retry explicitly.
    });
  }

  public dispose(): void {
    if (this.dwellTimer !== undefined) {
      clearTimeout(this.dwellTimer);
      this.dwellTimer = undefined;
    }
  }
}
