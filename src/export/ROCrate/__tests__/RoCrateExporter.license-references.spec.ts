import { describe, it, expect } from "vite-plus/test";
import { Project } from "../../../model/Project/Project";
import { getRoCrate } from "../RoCrateExporter";

describe("RO-Crate license references", () => {
  it("defines every license that an entity points at", async () => {
    const project = Project.fromDirectory("sample data/Edolo sample");
    const crate: any = await getRoCrate(project, project);
    const graph: any[] = crate["@graph"];
    const definedIds = new Set(graph.map((e) => e["@id"]));

    const referencedIds = graph
      .flatMap((e) => (Array.isArray(e.license) ? e.license : e.license ? [e.license] : []))
      .map((l) => l["@id"]);

    expect(referencedIds.length).toBeGreaterThan(0);
    expect(referencedIds.filter((id) => !definedIds.has(id))).toEqual([]);
  });
});
