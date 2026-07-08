export type CloudFileStatus = "local" | "cloudOnly" | "hydrating" | "unknown";

export type AttributeReader = (path: string) =>
  | {
      IS_OFFLINE: boolean;
      IS_RECALL_ON_DATA_ACCESS: boolean;
      IS_RECALL_ON_OPEN: boolean;
    }
  | undefined;

let testAttributeReader: AttributeReader | undefined;
let cachedFswinModule: { getAttributesSync: AttributeReader } | undefined;
let haveWarnedAboutFswinFailure = false;

export function setAttributeReaderForTests(reader?: AttributeReader): void {
  testAttributeReader = reader;
}

function getAttributeReader(): AttributeReader | undefined {
  if (testAttributeReader) {
    return testAttributeReader;
  }
  if (process.platform !== "win32") {
    return undefined;
  }
  if (!cachedFswinModule) {
    try {
      // Lazy require: must never run at module-load time, or this module
      // would blow up on macOS/CI/Vitest where fswin isn't installed.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      cachedFswinModule = require("fswin");
    } catch (e) {
      if (!haveWarnedAboutFswinFailure) {
        haveWarnedAboutFswinFailure = true;
        console.warn("cloudFileStatus: failed to load fswin", e);
      }
      return undefined;
    }
  }
  return cachedFswinModule?.getAttributesSync;
}

export function getCloudFileStatus(path: string): CloudFileStatus {
  const reader = getAttributeReader();
  if (!reader) {
    return "unknown";
  }
  try {
    const attributes = reader(path);
    if (!attributes) {
      return "unknown";
    }
    if (
      attributes.IS_OFFLINE ||
      attributes.IS_RECALL_ON_DATA_ACCESS ||
      attributes.IS_RECALL_ON_OPEN
    ) {
      return "cloudOnly";
    }
    return "local";
  } catch (e) {
    if (!haveWarnedAboutFswinFailure) {
      haveWarnedAboutFswinFailure = true;
      console.warn("cloudFileStatus: failed to read file attributes", e);
    }
    return "unknown";
  }
}

function makeAbortError(): Error {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

// Runs the actual hydration for one file: reads it end to end so that when it
// resolves the whole file is guaranteed local, reporting byte progress along
// the way. Injectable so tests don't need a real worker (or a real cloud file).
export type HydrationRunner = (
  path: string,
  callbacks: {
    onProgress?: (bytesRead: number, totalBytes: number) => void;
    signal?: AbortSignal;
  }
) => Promise<void>;

let testHydrationRunner: HydrationRunner | undefined;

export function setHydrationRunnerForTests(runner?: HydrationRunner): void {
  testHydrationRunner = runner;
}

// This is the body of the worker thread that actually pulls the file down.
// It MUST run off the main/renderer thread: hydrating means a *blocking*
// synchronous read (see runHydrationInWorker below for why), which for a
// multi-GB file on a slow link can block for hours -- the UI thread must never
// do that. Kept as a string (eval worker) so it needs no separate bundled
// entry file. It only uses `fs` + `worker_threads`, never fswin.
const HYDRATION_WORKER_SOURCE = `
const { parentPort, workerData } = require("worker_threads");
const fs = require("fs");
// Synchronous sleep for backoff. Atomics.wait is only legal off the main
// thread, which is exactly where we are.
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
const filePath = workerData.path;
const CHUNK = 4 * 1024 * 1024;
// A read can hard-fail with a Windows cloud error (libuv surfaces it as
// code "UNKNOWN" / errno -4094) when OneDrive can't service the recall right
// then -- provider busy, briefly offline, throttled. That is transient, so we
// retry with backoff. A genuinely slow (but working) download does NOT throw;
// readSync just blocks, so no retry/timeout is needed for the slow case.
const MAX_UNKNOWN_RETRIES = 6;
try {
  const size = fs.statSync(filePath).size;
  const buf = Buffer.allocUnsafe(Math.min(CHUNK, size || CHUNK));
  let offset = 0;
  let unknownRetries = 0;
  let lastPost = 0;
  let fd = fs.openSync(filePath, "r");
  try {
    while (offset < size) {
      let n;
      try {
        n = fs.readSync(fd, buf, 0, Math.min(buf.length, size - offset), offset);
      } catch (e) {
        const isCloudRecallError = e && (e.code === "UNKNOWN" || e.errno === -4094);
        if (isCloudRecallError && unknownRetries < MAX_UNKNOWN_RETRIES) {
          unknownRetries++;
          try { fs.closeSync(fd); } catch (e2) {}
          sleepSync(Math.min(1000 * Math.pow(2, unknownRetries - 1), 15000));
          fd = fs.openSync(filePath, "r");
          continue;
        }
        throw e;
      }
      if (n <= 0) break;
      unknownRetries = 0;
      offset += n;
      const now = Date.now();
      if (now - lastPost >= 200 || offset >= size) {
        lastPost = now;
        parentPort.postMessage({ type: "progress", bytesRead: offset, totalBytes: size });
      }
    }
  } finally {
    try { fs.closeSync(fd); } catch (e3) {}
  }
  parentPort.postMessage({ type: "done" });
} catch (e) {
  parentPort.postMessage({
    type: "error",
    code: (e && e.code) || "UNKNOWN",
    message: String((e && e.message) || e)
  });
}
`;

// The production hydration runner. OneDrive hydrates a placeholder when its
// content is read -- but Node's ASYNC fs read (fs.promises / callback) fails
// outright on a real placeholder with "UNKNOWN: unknown error, read"
// (errno -4094): libuv's overlapped I/O can't satisfy the cloud recall. Only a
// SYNCHRONOUS, blocking read triggers the recall and blocks until the bytes
// arrive. That blocking read therefore has to happen on a worker thread, never
// on the caller's (renderer/UI) thread.
function runHydrationInWorker(
  path: string,
  callbacks: {
    onProgress?: (bytesRead: number, totalBytes: number) => void;
    signal?: AbortSignal;
  }
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // Lazy require, same rationale as fswin: worker_threads is a Node builtin,
    // but keeping the require in-function avoids surprises in odd environments.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Worker } = require("worker_threads");
    const signal = callbacks.signal;

    let settled = false;
    let worker: any;

    const onAbort = () => {
      // Terminate the read; OneDrive keeps whatever it already downloaded.
      worker?.terminate();
    };

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
    };

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn();
    };

    try {
      worker = new Worker(HYDRATION_WORKER_SOURCE, {
        eval: true,
        workerData: { path }
      });
    } catch (e) {
      finish(() => reject(e));
      return;
    }

    worker.on("message", (msg: any) => {
      if (!msg) return;
      if (msg.type === "progress") {
        callbacks.onProgress?.(msg.bytesRead, msg.totalBytes);
      } else if (msg.type === "done") {
        finish(() => resolve());
      } else if (msg.type === "error") {
        const err: any = new Error(msg.message || "hydration failed");
        err.code = msg.code;
        finish(() => reject(err));
      }
    });
    worker.on("error", (e: Error) => finish(() => reject(e)));
    worker.on("exit", () => {
      // Natural exit after "done" is already handled by finish(); this catches
      // an abnormal exit (including terminate() on abort).
      finish(() =>
        reject(signal?.aborted ? makeAbortError() : new Error("hydration worker exited unexpectedly"))
      );
    });

    if (signal) {
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener("abort", onAbort, { once: true });
      }
    }
  });
}

export async function hydrateFile(
  path: string,
  options?: {
    timeoutMs?: number;
    signal?: AbortSignal;
    onProgress?: (bytesRead: number, totalBytes: number) => void;
  }
): Promise<void> {
  const timeoutMs = options?.timeoutMs;
  const callerSignal = options?.signal;

  if (callerSignal?.aborted) {
    throw makeAbortError();
  }

  // Combine the caller's abort signal with an optional timeout into one signal
  // that stops the worker. Note there is deliberately NO default timeout: a
  // slow-but-working download (e.g. 2 GB at 2 Mbps ~ 2.5 h) must be allowed to
  // finish, and the worker keeps the UI thread free the whole time.
  const controller = new AbortController();
  let timedOut = false;
  const onCallerAbort = () => controller.abort();
  if (callerSignal) {
    callerSignal.addEventListener("abort", onCallerAbort, { once: true });
  }
  const timer =
    timeoutMs !== undefined
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : undefined;

  const runner = testHydrationRunner ?? runHydrationInWorker;

  try {
    await runner(path, {
      onProgress: options?.onProgress,
      signal: controller.signal
    });
  } catch (e) {
    if (timedOut) {
      throw new Error(`hydrateFile timed out after ${timeoutMs}ms: ${path}`);
    }
    if (controller.signal.aborted) {
      throw makeAbortError();
    }
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
    if (callerSignal) callerSignal.removeEventListener("abort", onCallerAbort);
  }
}
