import * as fs from "fs-extra";
import * as Path from "path";
import * as temp from "temp";
import { describe, it, expect, vi, afterEach } from "vite-plus/test";
import { Session } from "../Project/Session/Session";
import { EncounteredVocabularyRegistry } from "../Project/EncounteredVocabularyRegistry";
import {
  setCloudSyncRootsForTests,
  setICloudSiblingCheckerForTests,
  setMacStatReaderForTests,
  setMaterializerForTests,
} from "../../other/cloudFileStatus";
import { cloudReadGuard } from "../../other/cloudReadGuard";

// iCloud's legacy eviction removes a file and leaves only a hidden
// ".<name>.icloud" sibling. Opening a session folder in that state must ask
// iCloud for the session file, never write an empty one in its place (which
// would show empty metadata and could sync up over the real file).

function useFakeICloud(root: string, evictedPath: () => string | undefined) {
  setCloudSyncRootsForTests([{ path: root, providerName: "iCloud Drive" }]);
  // Every file that exists is fully local; a missing one may be evicted.
  setMacStatReaderForTests((p) => {
    if (!fs.existsSync(p)) return undefined;
    const s = fs.statSync(p);
    return { isFile: s.isFile(), size: s.size, blocks: s.size > 0 ? 8 : 0 };
  });
  setICloudSiblingCheckerForTests((p) => p === evictedPath());
}

describe("a session whose metadata iCloud evicted the legacy way", () => {
  afterEach(() => {
    setCloudSyncRootsForTests(undefined);
    setICloudSiblingCheckerForTests(undefined);
    setMacStatReaderForTests(undefined);
    setMaterializerForTests(undefined);
    cloudReadGuard.reset();
    vi.restoreAllMocks();
  });

  it("requests the file instead of writing an empty one, and reads it once it arrives", () => {
    const root = temp.mkdirSync("evicted-icloud");
    const folder = Path.join(root, "ETR009");
    fs.mkdirSync(folder);
    const sessionFilePath = Path.join(folder, "ETR009.session");
    let evicted: string | undefined = sessionFilePath;
    useFakeICloud(root, () => evicted);
    const materialize = vi.fn(() => Promise.resolve());
    setMaterializerForTests(materialize);
    cloudReadGuard.reset();

    const session = Session.fromDirectory(folder, new EncounteredVocabularyRegistry());
    const file = session.metadataFile!;

    expect(fs.existsSync(sessionFilePath)).toBe(false);
    expect(materialize).toHaveBeenCalledWith(sessionFilePath);
    expect(file.cloudMetadataUnavailable).toBe(true);
    expect(cloudReadGuard.failedReads.map((f) => f.path)).toEqual([sessionFilePath]);
    // Not downloaded yet is not a provider failure.
    expect(cloudReadGuard.isTripped).toBe(false);

    // Saving now must not create the file either.
    session.saveAllFilesInFolder();
    expect(fs.existsSync(sessionFilePath)).toBe(false);

    // iCloud delivers the real file; a Retry reads it.
    evicted = undefined;
    fs.writeFileSync(sessionFilePath, "<Session><title>REAL TITLE</title></Session>");
    file.readMetadataFile();
    expect(file.cloudMetadataUnavailable).toBe(false);
    expect(file.getTextProperty("title")).toBe("REAL TITLE");
    expect(cloudReadGuard.hasFailures).toBe(false);
  });
});
