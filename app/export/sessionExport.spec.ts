import ImdiGenerator from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import {
  setResultXml,
  xexpect as expect,
  count,
  value
} from "./xmlUnitTestUtils";

let project: Project;
let session: Session;

beforeAll(() => {
  project = Project.fromDirectory("sample data/Edolo sample");
  session = Session.fromDirectory("sample data/Edolo sample/Sessions/ETR009");
  setResultXml(
    ImdiGenerator.generateSession(session, project, true /*omit namespace*/)
  );
});
beforeEach(() => {});

describe("session imdi export", () => {
  it("should contain METATRANSCRIPT/Session", () => {
    expect(count("METATRANSCRIPT/Session")).toBe(1);
  });
  it("should contain Session/Name", () => {
    expect(count("METATRANSCRIPT/Session/Name")).toBe(1);
  });
  it("should contain Session/Name", () => {
    expect(value("METATRANSCRIPT/Session/Name")).toBe("ETR009");
  });
  it("should contain Session/Title", () => {
    expect(count("METATRANSCRIPT/Session/Title")).toBe(1);
  });
  it("should contain Session/Description", () => {
    expect(count("METATRANSCRIPT/Session/Description")).toBe(1);
  });
  it("should contain Continent", () => {
    expect("METATRANSCRIPT/Session/MDGroup/Location/Continent").toMatch(
      "Oceania"
    );

    expect(
      "METATRANSCRIPT/Session/MDGroup/Location/Continent"
    ).toDeclareVocabulary("http://www.mpi.nl/IMDI/Schema/Continents.xml");

    expect("METATRANSCRIPT/Session/MDGroup/Location/Continent").toBeClosed();
  });
});

it("should contain Country", () => {
  expect("METATRANSCRIPT/Session/MDGroup/Location/Country").toMatch(
    "Papua New Guinea"
  );

  expect("METATRANSCRIPT/Session/MDGroup/Location/Country").toDeclareVocabulary(
    "http://www.mpi.nl/IMDI/Schema/Countries.xml"
  );

  expect("METATRANSCRIPT/Session/MDGroup/Location/Country").toBeOpen();
});
it("should contain Project", () => {
  expect(count("METATRANSCRIPT/Session/MDGroup/Project")).toBe(1);
  expect("METATRANSCRIPT/Session/MDGroup/Project/Title").toMatch(
    "Edolo Sample"
  );
});
it("should contain Content", () => {
  expect(count("METATRANSCRIPT/Session/MDGroup/Content")).toBe(1);
  expect("METATRANSCRIPT/Session/MDGroup/Content/Genre").toMatch("narrative");
});
it("should contain MediaFiles", () => {
  expect(count("METATRANSCRIPT/Session/Resources/MediaFile")).toBe(4);
  expect(
    "METATRANSCRIPT/Session/Resources/WrittenResource/ResourceLink"
  ).toMatch("ETR009.session");
});
