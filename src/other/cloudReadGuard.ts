import { makeAutoObservable } from "mobx";

// When a cloud sync provider (OneDrive, Dropbox, Nextcloud, ...) cannot deliver
// the contents of a placeholder file, reading its bytes fails. On Windows the
// Cloud Files API surfaces this to Node as a generic read error:
//   { code: "UNKNOWN", errno: -4094, syscall: "read" }
// (Verified against a broken/rate-limited Nextcloud demo server: the read of a
// cloud-only placeholder threw exactly this.) A plain missing/locked file uses
// ENOENT/EBUSY/EPERM instead, so this signature is specific to "the provider
// tried to hydrate and failed".
export function isCloudProviderReadFailure(err: any): boolean {
  if (!err) return false;
  return (
    (err.errno === -4094 || err.code === "UNKNOWN") && err.syscall === "read"
  );
}

export interface FailedCloudRead {
  path: string;
  // "OneDrive", "Dropbox", "Nextcloud", ... or undefined if unknown.
  providerName?: string;
}

// A per-load circuit breaker for cloud reads. lameta reads each session/person
// metadata file (and .meta sidecars) synchronously at project-load time, which
// forces the sync engine to hydrate them on demand. When the provider is down
// or rate-limiting, every such read fails -- and each failed attempt can make
// the provider's own client pop a modal error dialog. Rather than hammer a
// broken provider (one storm of dialogs + toasts per file), we trip this
// breaker on the first failure and skip the remaining placeholder reads for the
// rest of the load, surfacing a single "couldn't reach <provider>" banner with
// a Retry action instead.
class CloudReadGuard {
  private tripped = false;
  private failures: FailedCloudRead[] = [];

  constructor() {
    makeAutoObservable(this);
  }

  // Call at the start of each project load.
  public reset(): void {
    this.tripped = false;
    this.failures = [];
  }

  public get isTripped(): boolean {
    return this.tripped;
  }

  public get failedReads(): ReadonlyArray<FailedCloudRead> {
    return this.failures;
  }

  public get hasFailures(): boolean {
    return this.failures.length > 0;
  }

  // Record that a placeholder read failed (or was skipped because the breaker
  // was already tripped). Trips the breaker so subsequent placeholder reads in
  // this load are skipped.
  public recordFailure(path: string, providerName?: string): void {
    this.tripped = true;
    if (!this.failures.some((f) => f.path === path)) {
      this.failures.push({ path, providerName });
    }
  }

  // Called when a previously-failed file has been (or is about to be) re-read
  // successfully. Clears the breaker once nothing is left outstanding so future
  // placeholder reads are attempted again.
  public clearFailure(path: string): void {
    this.failures = this.failures.filter((f) => f.path !== path);
    if (this.failures.length === 0) {
      this.tripped = false;
    }
  }
}

export const cloudReadGuard = new CloudReadGuard();
