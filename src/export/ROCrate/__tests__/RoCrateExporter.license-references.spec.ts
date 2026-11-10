import { describe, it, expect, beforeAll } from "vite-plus/test";
import { Project } from "../../../model/Project/Project";
import { getRoCrate } from "../RoCrateExporter";

describe("RO-Crate license references", () => {
  let graph: any[];

  beforeAll(async () => {
    const project = Project.fromDirectory("sample data/Edolo sample");
    const crate: any = await getRoCrate(project, project);
    graph = crate["@graph"];
  });

  it("defines every license that an entity points at", () => {
    const definedIds = new Set(graph.map((e) => e["@id"]));

    const referencedIds = graph
      .flatMap((e) => (Array.isArray(e.license) ? e.license : e.license ? [e.license] : []))
      .map((l) => l["@id"]);

    expect(referencedIds.length).toBeGreaterThan(0);
    expect(referencedIds.filter((id) => !definedIds.has(id))).toEqual([]);
  });

  it("gives a project document with no access field the license of the project", () => {
    const root = graph.find((e) => e["@id"] === "./");
    const sprj = graph.find((e) => typeof e["@id"] === "string" && e["@id"].endsWith(".sprj"));

    expect(root.license?.["@id"]).toBeTruthy();
    expect(sprj.license).toEqual(root.license);
  });
});
