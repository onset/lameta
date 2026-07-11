import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "fs";
import * as Path from "path";
import {
  collectMetadataFilePaths,
  prefetchCloudFiles,
  prefetchCloudMetadata
} from "./cloudMetadataPrefetch";
import {
  setMacStatReaderForTests,
  setMaterializerForTests,
  setCloudSyncRootsForTests
} from "./cloudFileStatus";
import { cloudReadGuard } from "./cloudReadGuard";

// A unique temp project directory for the tests that need real Sessions/People
// folders on disk (collectMetadataFilePaths enumerates directories via fs).
const scratchRoot = Path.join(
  process.env.TMPDIR || "/tmp",
  "cloudMetadataPrefetch-spec"
);

function touch(filePath: string) {
  fs.mkdirSync(Path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, "");
}

function makeProject(name: string, sessionDirs: string[], personDirs: string[]) {
  const projectDir = Path.join(scratchRoot, name);
  fs.rmSync(projectDir, { recursive: true, force: true });
  fs.mkdirSync(Path.join(projectDir, "Sessions"), { recursive: true });
  fs.mkdirSync(Path.join(projectDir, "People"), { recursive: true });
  for (const s of sessionDirs) {
    fs.mkdirSync(Path.join(projectDir, "Sessions", s), { recursive: true });
  }
  for (const p of personDirs) {
    fs.mkdirSync(Path.join(projectDir, "People", p), { recursive: true });
  }
  return projectDir;
}

const dataless = { isFile: true, size: 100, blocks: 0 };
const hydrated = { isFile: true, size: 100, blocks: 8 };

describe("collectMetadataFilePaths", () => {
  afterEach(() => {
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  });

  it("returns the .sprj plus each session's .session and each person's .person", () => {
    const projectDir = makeProject("Proj1", ["s1", "s2"], ["p1"]);
    const paths = collectMetadataFilePaths(projectDir);
    expect(paths).toEqual([
      Path.join(projectDir, "Proj1.sprj"),
      Path.join(projectDir, "Sessions", "s1", "s1.session"),
      Path.join(projectDir, "Sessions", "s2", "s2.session"),
      Path.join(projectDir, "People", "p1", "p1.person")
    ]);
  });

  it("includes .meta media sidecars in session and person folders", () => {
    const projectDir = makeProject("Proj2", ["s1"], ["p1"]);
    touch(Path.join(projectDir, "Sessions", "s1", "s1_Careful.mp3.meta"));
    touch(Path.join(projectDir, "Sessions", "s1", "s1_Photo.jpg.meta"));
    // A non-.meta file must not be collected.
    touch(Path.join(projectDir, "Sessions", "s1", "s1_Careful.mp3"));
    touch(Path.join(projectDir, "People", "p1", "p1_Consent.pdf.meta"));

    const paths = collectMetadataFilePaths(projectDir);

    expect(paths).toContain(
      Path.join(projectDir, "Sessions", "s1", "s1_Careful.mp3.meta")
    );
    expect(paths).toContain(
      Path.join(projectDir, "Sessions", "s1", "s1_Photo.jpg.meta")
    );
    expect(paths).toContain(
      Path.join(projectDir, "People", "p1", "p1_Consent.pdf.meta")
    );
    // The folder's own metadata file is still there.
    expect(paths).toContain(
      Path.join(projectDir, "Sessions", "s1", "s1.session")
    );
    // The media file itself (no .meta suffix) is not collected.
    expect(paths).not.toContain(
      Path.join(projectDir, "Sessions", "s1", "s1_Careful.mp3")
    );
  });

  it("includes .meta sidecars in DescriptionDocuments and OtherDocuments", () => {
    const projectDir = makeProject("Proj3", [], []);
    touch(Path.join(projectDir, "DescriptionDocuments", "readme.txt.meta"));
    touch(Path.join(projectDir, "OtherDocuments", "budget.xls.meta"));
    touch(Path.join(projectDir, "OtherDocuments", "notes.txt")); // not .meta

    const paths = collectMetadataFilePaths(projectDir);

    expect(paths).toContain(
      Path.join(projectDir, "DescriptionDocuments", "readme.txt.meta")
    );
    expect(paths).toContain(
      Path.join(projectDir, "OtherDocuments", "budget.xls.meta")
    );
    expect(paths).not.toContain(
      Path.join(projectDir, "OtherDocuments", "notes.txt")
    );
  });

  it("tolerates a project with no Sessions/People/doc folders (just the .sprj)", () => {
    const projectDir = Path.join(scratchRoot, "Empty");
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.mkdirSync(projectDir, { recursive: true });
    expect(collectMetadataFilePaths(projectDir)).toEqual([
      Path.join(projectDir, "Empty.sprj")
    ]);
  });
});

describe("prefetchCloudFiles", () => {
  beforeEach(() => {
    cloudReadGuard.reset();
  });
  afterEach(() => {
    setMacStatReaderForTests(undefined);
    setMaterializerForTests(undefined);
    setCloudSyncRootsForTests(undefined);
    cloudReadGuard.reset();
  });

  it("requests hydration for cloud-only files and skips already-local ones", () => {
    setCloudSyncRootsForTests([
      { path: "/Users/me/OneDrive/Proj", providerName: "OneDrive" }
    ]);
    const materialize = vi.fn().mockResolvedValue(undefined);
    setMaterializerForTests(materialize);

    const cloudFile = "/Users/me/OneDrive/Proj/Sessions/s1/s1.session";
    const localFile = "/Users/me/OneDrive/Proj/Sessions/s2/s2.session";
    setMacStatReaderForTests((p) => (p === localFile ? hydrated : dataless));

    const n = prefetchCloudFiles([cloudFile, localFile]);

    expect(n).toBe(1);
    expect(materialize).toHaveBeenCalledTimes(1);
    expect(materialize).toHaveBeenCalledWith(cloudFile);
  });

  it("returns 0 and fires nothing when there are no cloud-only files", () => {
    setCloudSyncRootsForTests([
      { path: "/Users/me/OneDrive/Proj", providerName: "OneDrive" }
    ]);
    const materialize = vi.fn().mockResolvedValue(undefined);
    setMaterializerForTests(materialize);
    setMacStatReaderForTests(() => hydrated);

    const n = prefetchCloudFiles([
      "/Users/me/OneDrive/Proj/Sessions/s1/s1.session"
    ]);

    expect(n).toBe(0);
    expect(materialize).not.toHaveBeenCalled();
  });

  it("skips paths that are not under any cloud sync root", () => {
    setCloudSyncRootsForTests([
      { path: "/Users/me/OneDrive/Proj", providerName: "OneDrive" }
    ]);
    const materialize = vi.fn().mockResolvedValue(undefined);
    setMaterializerForTests(materialize);
    setMacStatReaderForTests(() => dataless);

    const n = prefetchCloudFiles(["/Users/me/Elsewhere/x.session"]);

    expect(n).toBe(0);
    expect(materialize).not.toHaveBeenCalled();
  });

  it("does nothing when the cloud circuit breaker is tripped", () => {
    setCloudSyncRootsForTests([
      { path: "/Users/me/OneDrive/Proj", providerName: "OneDrive" }
    ]);
    const materialize = vi.fn().mockResolvedValue(undefined);
    setMaterializerForTests(materialize);
    setMacStatReaderForTests(() => dataless);

    cloudReadGuard.recordFailure("/Users/me/OneDrive/Proj/whatever.session");
    expect(cloudReadGuard.isTripped).toBe(true);

    const n = prefetchCloudFiles([
      "/Users/me/OneDrive/Proj/Sessions/s1/s1.session"
    ]);

    expect(n).toBe(0);
    expect(materialize).not.toHaveBeenCalled();
  });
});

describe("prefetchCloudMetadata (end-to-end over a temp project)", () => {
  beforeEach(() => {
    cloudReadGuard.reset();
  });
  afterEach(() => {
    setMacStatReaderForTests(undefined);
    setMaterializerForTests(undefined);
    setCloudSyncRootsForTests(undefined);
    cloudReadGuard.reset();
    fs.rmSync(scratchRoot, { recursive: true, force: true });
  });

  it("collects and prefetches every cloud-only metadata file in the project", () => {
    const projectDir = makeProject("MyProject", ["s1", "s2"], ["p1", "p2"]);

    setCloudSyncRootsForTests([
      { path: projectDir, providerName: "OneDrive" }
    ]);
    const materialize = vi.fn().mockResolvedValue(undefined);
    setMaterializerForTests(materialize);
    // Every metadata file is a cloud-only placeholder.
    setMacStatReaderForTests(() => dataless);

    const n = prefetchCloudMetadata(projectDir);

    // 1 .sprj + 2 .session + 2 .person = 5
    expect(n).toBe(5);
    expect(materialize).toHaveBeenCalledTimes(5);
    const requested = materialize.mock.calls.map((c) => c[0]).sort();
    expect(requested).toEqual(
      [
        Path.join(projectDir, "MyProject.sprj"),
        Path.join(projectDir, "Sessions", "s1", "s1.session"),
        Path.join(projectDir, "Sessions", "s2", "s2.session"),
        Path.join(projectDir, "People", "p1", "p1.person"),
        Path.join(projectDir, "People", "p2", "p2.person")
      ].sort()
    );
  });

  it("does not fire when the metadata files are already local", () => {
    const projectDir = makeProject("AllLocal", ["s1"], ["p1"]);
    setCloudSyncRootsForTests([
      { path: projectDir, providerName: "OneDrive" }
    ]);
    const materialize = vi.fn().mockResolvedValue(undefined);
    setMaterializerForTests(materialize);
    setMacStatReaderForTests(() => hydrated);

    const n = prefetchCloudMetadata(projectDir);

    expect(n).toBe(0);
    expect(materialize).not.toHaveBeenCalled();
  });
});
