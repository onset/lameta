import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs-extra";
import * as Path from "path";
import temp from "temp";
import * as mobx from "mobx";
import XPATH from "xpath";
import { DOMParser } from "@xmldom/xmldom";
import ImdiGenerator, { IMDIMode } from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import { GetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";
import { validateImdiAsyncInternal } from "../mainProcess/validateImdi";
import { NavigationTarget } from "../navigation/NavigationTarget";
import { NavigationState } from "../navigation/NavigationState";
import { selectTarget } from "../navigation/navigate";
import {
  findLametaSource,
  makeLametaSourceComment,
  parseLametaSourceComment,
} from "./lametaSourceComment";

mobx.configure({ enforceActions: "never" });
temp.track();

describe("lameta-source comment text", () => {
  it.each<NavigationTarget>([
    { folderType: "project", fieldKey: "title" },
    { folderType: "session", folderId: "ETR009", fieldKey: "genre" },
    {
      folderType: "person",
      folderId: "Awi--Heole -x- ---",
      fileName: "a--b.mp3",
      fieldKey: "birthYear",
    },
  ])("round trips %j", (target) => {
    const text = makeLametaSourceComment(target);
    expect(text.startsWith("lameta-source ")).toBe(true);
    expect(text.substring("lameta-source".length)).not.toContain("-");
    expect(parseLametaSourceComment(text)).toEqual(target);
    // the pretty printer surrounds comment text with spaces
    expect(parseLametaSourceComment(` ${text} `)).toEqual(target);
  });
  it("ignores other comments", () => {
    expect(parseLametaSourceComment("Could not compute age")).toBeUndefined();
  });
  it("gets through an XML parser intact", () => {
    const target: NavigationTarget = {
      folderType: "person",
      folderId: "Awi--Heole",
    };
    const doc = new DOMParser().parseFromString(
      `<a><!--${makeLametaSourceComment(target)}--><b/></a>`,
    );
    expect(findLametaSource(doc.getElementsByTagName("b")[0])).toEqual(target);
  });
});

describe("lameta-source comments in the IMDI of the Edolo sample", () => {
  let project: Project;
  let session: Session;
  let raw: string;
  let opex: string;
  let doc: Document;
  const select = (xpath: string) => XPATH.select(xpath, doc as any) as unknown as Node[];

  beforeAll(() => {
    // a copy, because navigating saves the folder it leaves
    const dir = Path.join(temp.mkdirSync("lameta-source test"), "Edolo sample");
    fs.copySync("sample data/Edolo sample", dir);
    project = Project.fromDirectory(dir);
    session = project.sessions.items[0] as Session;
    session.properties.setText("accessDescription", "just because");
    raw = ImdiGenerator.generateSession(IMDIMode.RAW_IMDI, session, project);
    opex = ImdiGenerator.generateSession(IMDIMode.OPEX, session, project);
    doc = new DOMParser().parseFromString(
      ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project,
        true /* omit namespaces, to keep xpaths simple */,
      ),
    );
  });

  it("still validates against the schema", async () => {
    const schema = GetOtherConfigurationSettings().imdiSchema;
    for (const xml of [raw, opex]) {
      expect(xml).toContain("<!-- lameta-source ");
      const result = await validateImdiAsyncInternal("", xml, schema);
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    }
  });

  it.each<[string, NavigationTarget]>([
    [
      "METATRANSCRIPT/Session/MDGroup/Content/Genre",
      { folderType: "session", folderId: "ETR009", fieldKey: "genre" },
    ],
    [
      "METATRANSCRIPT/Session/MDGroup/Content/Genre/text()",
      { folderType: "session", folderId: "ETR009", fieldKey: "genre" },
    ],
    [
      "METATRANSCRIPT/Session/MDGroup/Location/Address/text()",
      { folderType: "session", folderId: "ETR009", fieldKey: "location" },
    ],
    [
      "METATRANSCRIPT/Session/MDGroup/Location/Country",
      { folderType: "project", fieldKey: "country" },
    ],
    [
      "METATRANSCRIPT/Session/MDGroup/Actors/Actor[Name='Awi Heole']/BirthDate",
      { folderType: "person", folderId: "Awi Heole", fieldKey: "birthYear" },
    ],
    [
      // a fixed value; reported as the actor's
      "METATRANSCRIPT/Session/MDGroup/Actors/Actor[Name='Awi Heole']/Anonymized",
      { folderType: "person", folderId: "Awi Heole" },
    ],
    [
      "METATRANSCRIPT/Session/MDGroup/Actors/Actor[Name='Hatton']/Role",
      {
        folderType: "session",
        folderId: "ETR009",
        fileName: "ETR009_Careful.mp3",
        fieldKey: "contributions",
      },
    ],
    [
      "METATRANSCRIPT/Session/Resources/MediaFile[ResourceLink='ETR009/ETR009_Careful.mp3']/Access/Description",
      {
        folderType: "session",
        folderId: "ETR009",
        fieldKey: "accessDescription",
      },
    ],
    [
      "METATRANSCRIPT/Session/Resources/MediaFile[ResourceLink='ETR009/ETR009_Careful.mp3']/ResourceLink/@ArchiveHandle",
      {
        folderType: "session",
        folderId: "ETR009",
        fileName: "ETR009_Careful.mp3",
      },
    ],
    [
      "METATRANSCRIPT/Session/Resources/MediaFile[ResourceLink='ETR009/ETR009_Careful.mp3']/Quality",
      {
        folderType: "session",
        folderId: "ETR009",
        fileName: "ETR009_Careful.mp3",
      },
    ],
  ])("%s comes from %j", (xpath, expected) => {
    const nodes = select(xpath);
    expect(nodes.length).toBeGreaterThan(0);
    const target = findLametaSource(nodes[0])!;
    expect(target).toEqual(expected);
    // and lameta can take the user there
    expect(selectTarget(project, target, new NavigationState())).toEqual({
      found: true,
    });
  });
});

describe("lameta-source comments with the ELAR configuration", () => {
  it("still validates against the ELAR schema", async () => {
    const dir = Path.join(temp.mkdirSync("lameta-source elar"), "Edolo sample");
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
    const project = Project.fromDirectory(dir);
    const schema = GetOtherConfigurationSettings().imdiSchema;
    expect(schema).toBe("IMDI_3.0_elar.xsd");
    const session = project.sessions.items[0] as Session;
    for (const mode of [IMDIMode.RAW_IMDI, IMDIMode.OPEX]) {
      const xml = ImdiGenerator.generateSession(mode, session, project);
      expect(xml).toContain("<!-- lameta-source ");
      const result = await validateImdiAsyncInternal("", xml, schema);
      expect(result.errors).toEqual([]);
    }
    const corpus = ImdiGenerator.generateCorpus(IMDIMode.RAW_IMDI, project, ["Edolo/ETR009.imdi"]);
    expect((await validateImdiAsyncInternal("", corpus, schema)).errors).toEqual([]);
  });
});
