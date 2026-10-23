import { describe, it, expect, beforeAll, afterAll } from "vite-plus/test";
import * as fs from "fs-extra";
import * as Path from "path";
import * as temp from "temp";
import { Project } from "../../../model/Project/Project";
import { getRoCrate } from "../RoCrateExporter";
import { startCollectingWarnings, stopCollectingWarnings } from "../../ExportWarningCollector";
import { setMediaFolderOrEmptyForThisProjectAndMachine } from "../../../model/Project/MediaFolderAccess";

// a listed file can be missing at export time: a link whose media folder is not on this
// machine, or a file deleted (in Explorer, or remotely by a sync service) after lameta loaded it
async function exportEdoloAfterRemoving(
  tmpFolder: string,
  addBeforeLoading: Record<string, string>,
  removeAfterLoading: string[],
): Promise<{ graph: any[]; warnings: string[] }> {
  const dir = Path.join(tmpFolder, "Edolo sample");
  fs.copySync("sample data/Edolo sample", dir);
  Object.entries(addBeforeLoading).forEach(([p, contents]) =>
    fs.writeFileSync(Path.join(dir, p), contents),
  );
  const project = Project.fromDirectory(dir);
  const mediaFolder = Path.join(tmpFolder, "media");
  fs.outputFileSync(Path.join(mediaFolder, "recordings", "still here.wav"), "audio");
  setMediaFolderOrEmptyForThisProjectAndMachine(mediaFolder);
  removeAfterLoading.forEach((p) => fs.removeSync(Path.join(dir, p)));

  startCollectingWarnings();
  let crate: any;
  let warnings: string[];
  try {
    crate = await getRoCrate(project, project);
  } finally {
    warnings = stopCollectingWarnings();
  }
  return { graph: crate["@graph"], warnings };
}

const decodedIds = (graph: any[]) =>
  graph
    .map((e) => e["@id"])
    .filter((id): id is string => typeof id === "string")
    .map(decodeURIComponent);

describe("RO-Crate export of listed files that are not on disk", () => {
  // a linked file is listed under the name of the file that it links to
  const missing = [
    "Sessions/ETR009/does-not-exist.wav",
    "Sessions/ETR009/gone.wav",
    "Sessions/ETR009/still here.wav",
    "Sessions/ETR009/ETR009_AText.txt",
    "DescriptionDocuments/pretend description.txt",
    "OtherDocuments/some other doc.txt",
  ];
  let tmpFolder: string;
  let ids: string[];
  let warnings: string[];

  beforeAll(async () => {
    tmpFolder = temp.mkdirSync("rocrate missing files");
    const result = await exportEdoloAfterRemoving(
      tmpFolder,
      {
        "Sessions/ETR009/far away.wav.link": "recordings/does-not-exist.wav",
        "Sessions/ETR009/gone link.wav.link": "recordings/gone.wav",
        "Sessions/ETR009/removed link to a file that is there.wav.link":
          "recordings/still here.wav",
      },
      [
        "Sessions/ETR009/gone link.wav.link",
        "Sessions/ETR009/removed link to a file that is there.wav.link",
        "Sessions/ETR009/ETR009_AText.txt",
        "DescriptionDocuments/pretend description.txt",
        "OtherDocuments/some other doc.txt",
      ],
    );
    ids = decodedIds(result.graph);
    warnings = result.warnings;
  });

  afterAll(() => {
    setMediaFolderOrEmptyForThisProjectAndMachine("");
    fs.removeSync(tmpFolder);
  });

  it("leaves the missing files out of the crate", () => {
    missing.forEach((p) => expect(ids).not.toContain(p));
  });

  it("still lists the files that are there", () => {
    expect(ids).toContain("Sessions/ETR009/ETR009_Careful.mp3");
  });

  it("warns once for each missing file", () => {
    expect(warnings.length).toBe(missing.length);
  });
});

describe("RO-Crate export of a session whose folder is gone", () => {
  let tmpFolder: string;
  let graph: any[];

  beforeAll(async () => {
    tmpFolder = temp.mkdirSync("rocrate missing session folder");
    graph = (await exportEdoloAfterRemoving(tmpFolder, {}, ["Sessions/ETR009"])).graph;
  });

  afterAll(() => {
    setMediaFolderOrEmptyForThisProjectAndMachine("");
    fs.removeSync(tmpFolder);
  });

  it("defines the session directory that the session points at", () => {
    const definedIds = new Set(graph.map((e) => e["@id"]));
    const session = graph.find((e) => e["@id"] === "#session-ETR009");
    expect(session.subjectOf?.["@id"]).toBeTruthy();
    expect(definedIds.has(session.subjectOf["@id"])).toBe(true);
  });
});
