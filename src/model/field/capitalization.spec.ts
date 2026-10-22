import { describe, it, expect, beforeAll } from "vite-plus/test";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import { Field, FieldType } from "./Field";
import { FieldDefinition } from "./FieldDefinition";
import { capitalizeField } from "./capitalization";
import { Project } from "../Project/Project";
import { Session } from "../Project/Session/Session";

const field = (key: string, text: string, definition: object) => {
  const f = new Field(key, FieldType.Text, text);
  f.definition = new FieldDefinition({ key, ...definition });
  return f;
};

describe("capitalizeField", () => {
  it("puts each language in the field's case", () => {
    const f = field("title", "[[en]]the hunt[[es]]la caza", {
      multilingual: true,
      capitalization: "sentence",
    });
    capitalizeField(f);
    expect(f.getTextAxis("en")).toBe("The hunt");
    expect(f.getTextAxis("es")).toBe("La caza");
  });

  it("puts each item of a comma-separated field in the field's case", () => {
    const f = field("topic", "fishing, life in Berthoud,songs by FAO", {
      capitalization: "ELARTerm",
      separatorWithCommaInstructions: "separate with commas",
    });
    capitalizeField(f);
    expect(f.text).toBe("Fishing, Life in berthoud,Songs by FAO");
  });

  it("leaves alone multilingual text that is still in slash form", () => {
    const f = field("title", "the hunt / la caza", {
      multilingual: true,
      capitalization: "sentence",
    });
    capitalizeField(f);
    expect(f.text).toBe("the hunt / la caza");
  });

  it("leaves alone a field with no capitalization", () => {
    const f = field("title", "the hunt", {});
    capitalizeField(f);
    expect(f.text).toBe("the hunt");
  });

  it("leaves a genre from the list as its id, and fixes one that the person typed", () => {
    const complexChoices = [
      { id: "procedural_discourse", label: "Procedural discourse", description: "" },
      { id: "songs about nasa", label: "songs about NASA", description: "", source: "custom" },
    ];
    const fromTheList = field("genre", "procedural_discourse", {
      capitalization: "ELARTerm",
      complexChoices,
    });
    capitalizeField(fromTheList);
    expect(fromTheList.text).toBe("procedural_discourse");

    const typed = field("genre", "songs about NASA", {
      capitalization: "ELARTerm",
      complexChoices,
    });
    capitalizeField(typed);
    expect(typed.text).toBe("Songs about NASA");
    expect(complexChoices[1].label).toBe("Songs about NASA");
  });
});

describe("a project under ELAR", () => {
  let project: Project;
  beforeAll(() => {
    temp.track();
    const dir = Path.join(temp.mkdirSync("capitalization"), "Edolo sample");
    fs.copySync("sample data/Edolo sample", dir);
    const sprj = Path.join(dir, "Edolo sample.sprj");
    fs.writeFileSync(
      sprj,
      fs
        .readFileSync(sprj, "utf8")
        .replace(
          "<ArchiveConfigurationName>custom</ArchiveConfigurationName>",
          "<ArchiveConfigurationName>ELAR</ArchiveConfigurationName>",
        ),
    );
    project = Project.fromDirectory(dir);
  });

  it("fixes the session that is displayed when it loads", () => {
    // ETR009's topics are "fishing, poison" on disk
    const first = project.sessions.items[0] as Session;
    expect(first.properties.getTextStringOrEmpty("topic")).toBe("Fishing, Poison");
  });

  it("fixes a session when it is displayed, and not before", () => {
    const second = project.addSession();
    project.sessions.selectedIndex = 0;
    second.properties.setText("topic", "life in Berthoud");
    expect(second.properties.getTextStringOrEmpty("topic")).toBe("life in Berthoud");
    project.sessions.selectedIndex = project.sessions.items.indexOf(second);
    expect(second.properties.getTextStringOrEmpty("topic")).toBe("Life in berthoud");
  });
});
