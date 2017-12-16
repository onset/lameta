import ImdiExporter from "../../app/export/imdi";
import { File } from "../../app/model/File";
import { Project } from "../../app/model/Project";

describe("imdi export", () => {
  it("should contain METATRANSCRIPT", () => {
    const project = Project.fromDirectory("sample data/Edolo sample");
    const xml = ImdiExporter.export(project);
    expect(xml).toContain("<METATRANSCRIPT>");
  });
});
