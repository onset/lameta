import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import * as temp from "temp";
import fs from "fs";
import Path from "path";
import { findPathsThatCannotBeAdded } from "./findPathsThatCannotBeAdded";

let dir: string;

describe("findPathsThatCannotBeAdded", () => {
  beforeEach(() => {
    dir = temp.mkdirSync("addFiles");
  });
  afterEach(() => {
    temp.cleanupSync();
  });

  it("refuses nothing in a selection of ordinary files", () => {
    expect(findPathsThatCannotBeAdded([makeFile("a.wav"), makeFile("b.txt")])).toEqual([]);
  });

  it("names every refused path and why, not only the first", () => {
    const folder = Path.join(dir, "Photos");
    fs.mkdirSync(folder);
    const paths = [
      makeFile("a.wav"),
      makeFile("notes.session"),
      makeFile("Bob.PERSON"),
      makeFile("a.wav.meta"),
      folder,
    ];
    expect(findPathsThatCannotBeAdded(paths)).toEqual([
      { path: paths[1], reason: "lametaFileType" },
      { path: paths[2], reason: "lametaFileType" },
      { path: paths[3], reason: "lametaFileType" },
      { path: folder, reason: "folder" },
    ]);
  });
});

function makeFile(name: string): string {
  const p = Path.join(dir, name);
  fs.writeFileSync(p, "x");
  return p;
}
