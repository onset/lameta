import { beforeAll, beforeEach, afterEach, describe, expect, it } from "vitest";
import * as temp from "temp";
import fs from "fs-extra";
import Path from "path";
import { Project } from "./Project";
import { setupLanguageFinderForTests } from "../../languageFinder/LanguageFinder";

let projectDirectory: string;
let projectName: string;

beforeAll(() => {
  setupLanguageFinderForTests();
});

describe("Project name migration", () => {
  beforeEach(() => {
    projectDirectory = temp.mkdirSync("test-project-name-migration");
    projectName = Path.basename(projectDirectory);
    fs.ensureDirSync(Path.join(projectDirectory, "Sessions"));
    fs.ensureDirSync(Path.join(projectDirectory, "People"));
  });

  afterEach(() => {
    temp.cleanupSync();
  });

  it("fills name from title when opening a V2-style project", () => {
    writeProjectFile(`<Title>V2 Project Title</Title>`);

    const project = Project.fromDirectory(projectDirectory);

    expect(project.properties.getTextStringOrEmpty("title")).toBe(
      "V2 Project Title"
    );
    expect(project.properties.getTextStringOrEmpty("name")).toBe(
      "V2 Project Title"
    );
  });

  it("does not overwrite an existing name when title is also present", () => {
    writeProjectFile(`
  <ProjectName>Short Project Name</ProjectName>
  <Title>Long Project Title</Title>`);

    const project = Project.fromDirectory(projectDirectory);

    expect(project.properties.getTextStringOrEmpty("name")).toBe(
      "Short Project Name"
    );
    expect(project.properties.getTextStringOrEmpty("title")).toBe(
      "Long Project Title"
    );
  });

  it("falls back to the folder name when both name and title are empty", () => {
    writeProjectFile("");

    const project = Project.fromDirectory(projectDirectory);

    expect(project.properties.getTextStringOrEmpty("name")).toBe(projectName);
  });
});

function writeProjectFile(projectFields: string): void {
  fs.writeFileSync(
    Path.join(projectDirectory, projectName + ".sprj"),
    `<?xml version="1.0" encoding="utf-8"?>
<Project>
  ${projectFields}
</Project>`
  );
}