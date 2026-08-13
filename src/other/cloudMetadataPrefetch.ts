import fs from "fs";
import * as Path from "path";
import { getCloudFileProvider } from "./cloudFileStatus";
import { cloudReadGuard } from "./cloudReadGuard";

// Opening a project reads each session/person/.sprj metadata file synchronously
// and in series. When those files are cloud-evicted placeholders, each read
// blocks while the provider hydrates that one file on demand (~2-3s each), so
// an 80-file project can take minutes and the UI appears frozen.
//
// This helper kicks off hydration for ALL the cloud-only metadata placeholders
// up front, without awaiting completion, so downloads run in parallel while the
// existing serial reads proceed unchanged. Each read still blocks until ITS
// file arrives, but by the time the loop reaches most files they are already
// downloading (macOS: one reader process per file; Windows: OneDrive
// parallelizes the pins).
//
// This never reads file bytes itself, so it cannot trip the cloud circuit
// breaker; and it is a no-op when there is no fetching provider or the breaker
// is already tripped (a failing provider must not be hammered -- see
// cloudReadGuard).

// Flat (non-recursive) list of directory entries, tolerating a missing or
// unreadable directory.
function readDirSafe(dir: string): string[] {
  try {
    return fs.readdirSync(dir, "utf8");
  } catch {
    // Directory doesn't exist (or isn't readable) yet.
    return [];
  }
}

// The paths of every ".meta" media sidecar directly in `folder` (flat, no
// recursion). These are read serially during folder load exactly like the
// folder's own metadata file, so they block one-at-a-time too.
function metaSidecarPaths(folder: string): string[] {
  return readDirSafe(folder)
    .filter((name) => name.endsWith(".meta"))
    .map((name) => Path.join(folder, name));
}

// For each child folder under `parentDir` (Sessions/ or People/): the folder's
// own metadata file (named after the folder plus a well-known extension -- see
// FolderMetadataFile, e.g. Sessions/foo/foo.session) plus every .meta media
// sidecar in that folder.
function folderMetadataPaths(parentDir: string, extension: string): string[] {
  const result: string[] = [];
  for (const childName of readDirSafe(parentDir)) {
    const dir = Path.join(parentDir, childName);
    try {
      if (!fs.lstatSync(dir).isDirectory()) {
        continue;
      }
    } catch {
      // Racing deletion / unreadable entry: skip it.
      continue;
    }
    result.push(Path.join(dir, childName + extension));
    result.push(...metaSidecarPaths(dir));
  }
  return result;
}

// Collect the conventional metadata file paths for a project, all of which are
// read serially at load time: the .sprj; every Sessions/*/<name>.session and
// People/*/<name>.person plus the .meta media sidecars in those folders; and
// the .meta sidecars in DescriptionDocuments/ and OtherDocuments/. Best-effort:
// paths that don't exist are harmless (they simply won't be cloud-only).
export function collectMetadataFilePaths(projectDir: string): string[] {
  const paths: string[] = [];
  paths.push(Path.join(projectDir, Path.basename(projectDir) + ".sprj"));
  paths.push(
    ...folderMetadataPaths(Path.join(projectDir, "Sessions"), ".session")
  );
  paths.push(
    ...folderMetadataPaths(Path.join(projectDir, "People"), ".person")
  );
  // ProjectDocuments loads these two folders the same way, reading each file's
  // .meta sidecar serially.
  paths.push(
    ...metaSidecarPaths(Path.join(projectDir, "DescriptionDocuments"))
  );
  paths.push(...metaSidecarPaths(Path.join(projectDir, "OtherDocuments")));
  return paths;
}

// Fire off hydration for every cloud-only file in `paths`, in parallel, without
// awaiting completion. Returns the number of files for which hydration was
// requested (0 if none / no fetching provider / breaker tripped).
export function prefetchCloudFiles(paths: string[]): number {
  const provider = getCloudFileProvider();
  // No real provider that can deliver placeholders: nothing to prefetch.
  if (!provider.capabilities.canFetch) {
    return 0;
  }
  // The provider already failed to deliver a file during this load; don't
  // hammer a broken/rate-limited provider. The normal serial reads will fail
  // softly and surface a single "couldn't reach <provider>" banner.
  if (cloudReadGuard.isTripped) {
    return 0;
  }

  const placeholders = paths.filter((p) => {
    try {
      return provider.getStatus(p) === "cloudOnly";
    } catch {
      return false;
    }
  });

  if (placeholders.length === 0) {
    return 0;
  }

  console.log(
    `☁️  [cloudMetadataPrefetch] Prefetching ${placeholders.length} cloud-only metadata file(s) in parallel so project load doesn't block one-at-a-time`
  );

  for (const p of placeholders) {
    // Fire and forget: resolve/rejection is irrelevant here. setPinned only
    // *initiates* the download; the subsequent serial read is what waits for
    // each file. Swallow errors so one bad path can't reject unhandled.
    provider.setPinned(p, true).catch(() => {
      /* the serial read will surface any real failure */
    });
  }

  return placeholders.length;
}

// Convenience wrapper used by Project loading: collect the project's metadata
// file paths and prefetch the cloud-only ones. Returns the number requested.
export function prefetchCloudMetadata(projectDir: string): number {
  return prefetchCloudFiles(collectMetadataFilePaths(projectDir));
}
