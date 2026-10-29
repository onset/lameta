import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Project } from "../Project";
import * as mobx from "mobx";
import temp from "temp";
import fs from "fs";

mobx.configure({
  enforceActions: "never"
});

beforeAll(() => {
  temp.track();
});
afterAll(() => {
  temp.cleanupSync();
});

describe("Project.addPerson", () => {
  it("writes the new person's name to its metadata file right away", () => {
    const project = Project.fromDirectory(
      temp.mkdirSync("lameta addPerson test")
    );
    const person = project.addPerson();
    const xml = fs.readFileSync(person.metadataFile!.metadataFilePath, "utf8");
    expect(xml).toContain(person.properties.getTextStringOrEmpty("name"));
  });
});
