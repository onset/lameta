import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import { kMediaStatsCacheKey } from "../model/file/File";
import {
  setResultXml,
  xexpect as expect,
  count,
  value
} from "../other/xmlUnitTestUtils";
import temp from "temp";
import * as fs from "fs-extra";
import assert from "assert";
import { describe, it, vi, beforeAll, afterAll } from "vitest";

temp.track(); // cleanup on exit: doesn't work

let rootDirectory: string;
let project: Project;
describe("Imdi generation for images", () => {
  afterAll(() => {
    // fs.emptyDirSync(rootDirectory);
    // fs.removeSync(rootDirectory);
  });
  beforeAll(() => {
    project = Project.fromDirectory("sample data/Edolo sample");
    // // including "fssync" in the path tells our file copy thing to just do the copy synchronously
    // rootDirectory = temp.mkdirSync("ImdiGeneratorTest-Image");
  });
  it("Can get imdi of image file in session", () => {
    const session = project.sessions.items[0];

    const gen = new ImdiGenerator(IMDIMode.RAW_IMDI, session, project);
    const f = session.files.find((f) => f.isImage);
    assert(f !== undefined);
    const xml = gen.mediaFile(f!);
    setResultXml(xml!);
    expect(count("MediaFile")).toBe(1);
    expect(value("MediaFile/Type")).toBe("Image");
    expect(value("MediaFile/Format")).toBe("image/jpeg");
    expect(count("MediaFile/Access")).toBe(1);
    expect(value("MediaFile/Access/Availability")).toBe("Open");
  });
  it("Can get imdi of audio even if session not have an access field", () => {
    const session = project.sessions.items[0];
    session.properties.remove("access");
    const gen = new ImdiGenerator(IMDIMode.RAW_IMDI, session, project);
    const f = session.files.find((f) => f.isImage);
    assert(f !== undefined);
    const xml = gen.mediaFile(f!);
    setResultXml(xml!);
    expect(count("MediaFile")).toBe(1);
    expect(count("MediaFile/Access")).toBe(1);
  });

  it("Can get imdi of image file in person, which does not have an access", () => {
    const person = project.persons.items[0];
    const gen = new ImdiGenerator(IMDIMode.RAW_IMDI, person, project);
    const f = person.files.find((f) => f.isImage);
    assert(f !== undefined);
    const xml = gen.mediaFile(f!);
    setResultXml(xml!);
    expect(count("MediaFile")).toBe(1);
    expect(value("MediaFile/Type")).toBe("Image");
    expect(value("MediaFile/Format")).toBe("image/jpeg");
    expect(count("MediaFile/Access")).toBe(1);
  });

  it("Can get imdi of an audio file", () => {
    const p = project.sessions.items[0];
    const gen = new ImdiGenerator(IMDIMode.RAW_IMDI, p, project);
    const f = p.files.find((f) => f.type === "Audio");
    assert(f !== undefined);
    const xml = gen.mediaFile(f!);
    setResultXml(xml!);
    expect(value("MediaFile/Type")).toBe("Audio");
    expect(value("MediaFile/Format")).toBe("audio/mpeg");
  });

  // Regression test: mediaStatsCache is internal bookkeeping (probed
  // ffprobe/ExifReader results + the size/mtime used to invalidate them),
  // not archival metadata, and must never show up in IMDI output.
  it("does not leak the internal mediaStatsCache field into IMDI Keys", () => {
    const session = project.sessions.items[0];
    const gen = new ImdiGenerator(IMDIMode.RAW_IMDI, session, project);
    const f = session.files.find((file) => file.type === "Audio");
    assert(f !== undefined);

    f!.setCachedMediaStats(
      { Length: "42s", Format: "MPEG Audio" },
      { sizeBytes: f!.getSizeInBytes(), mtimeMs: f!.getMtimeMs() }
    );
    expect(f!.getCachedMediaStats()).toBeTruthy();

    const xml = gen.mediaFile(f!);
    setResultXml(xml!);

    // Check case-insensitively: the Keys writer runs the raw property key
    // through capitalCase() for the @Name attribute, so a literal-casing
    // check on "mediaStatsCache" would miss a leak.
    expect(xml!.toLowerCase()).not.toContain(kMediaStatsCacheKey.toLowerCase());
    // And check that the actual cached values don't show up anywhere either.
    expect(xml).not.toContain("MPEG Audio");
    expect(xml).not.toContain("42s");
  });
});
