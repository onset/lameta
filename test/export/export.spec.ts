import ImdiExporter from "../../app/export/imdi";
import { File } from "../../app/model/file/File";
import { Project } from "../../app/model/Project/Project";

describe("imdi export", () => {
  it("should contain METATRANSCRIPT", () => {
    // const project = Project.fromDirectory("sample data/Edolo sample");
    // const xml = ImdiExporter.export(project);
    // expect(xml).toContain("<METATRANSCRIPT>");
  });
});

describe("dummy", () => {
  expect(1).toBe(1);
});
