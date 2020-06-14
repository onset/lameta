import ImdiGenerator from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import {
  setResultXml,
  xexpect as expect,
  count,
  value,
} from "../xmlUnitTestUtils";
import { CustomFieldRegistry } from "../model/Project/CustomFieldRegistry";

let project: Project;
let session: Session;

beforeAll(() => {
  project = Project.fromDirectory("sample data/Edolo sample");
  session = Session.fromDirectory(
    "sample data/Edolo sample/Sessions/ETR009",
    new CustomFieldRegistry()
  );
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
  expect("METATRANSCRIPT/Session/MDGroup/Project/Name").toMatch("Edolo Sample");
});
it("should contain Content", () => {
  expect(count("METATRANSCRIPT/Session/MDGroup/Content")).toBe(1);
  expect("METATRANSCRIPT/Session/MDGroup/Content/Genre").toMatch("Narrative");
});
it("should contain Actors", () => {
  // should get 2 speakers, on one recorder
  expect("METATRANSCRIPT/Session/MDGroup/Actors/Actor").toHaveCount(4);
  expect("METATRANSCRIPT/Session/MDGroup/Actors/Actor[1]/Name").toMatch(
    "Awi Heole"
  );
  expect("METATRANSCRIPT/Session/MDGroup/Actors/Actor[2]/Name").toMatch(
    "Ilawi Amosa"
  );
  expect("METATRANSCRIPT/Session/MDGroup/Actors/Actor[2]/BirthDate").toMatch(
    "1960"
  );
  expect("METATRANSCRIPT/Session/MDGroup/Actors/Actor[2]/Role").toMatch(
    "participant"
  );
  expect("METATRANSCRIPT/Session/MDGroup/Actors/Actor[3]/Name").toMatch(
    "Hatton"
  );
  // the rest of the actor checks are done in actorImdi.spec.ts
});
it("should contain MediaFiles", () => {
  expect(count("METATRANSCRIPT/Session/Resources/MediaFile")).toBe(4);
  expect(
    "METATRANSCRIPT/Session/Resources/WrittenResource/ResourceLink"
  ).toMatch("ETR009/ETR009_Tiny_StandardAudio.wav.annotations.eaf");
});

//https://trello.com/c/GcNAmcOb/107-imdi-category-for-accessdescription-missing-from-imdi-export
it("should have an Access Description if filled in", () => {
  session.properties.setText("accessDescription", "just because");
  setResultXml(
    ImdiGenerator.generateSession(session, project, true /*omit namespace*/)
  );
  // each media file will have one of these, hence 4
  expect(
    count("METATRANSCRIPT/Session/Resources/MediaFile/Access/Description")
  ).toBe(4);
  expect(
    "METATRANSCRIPT/Session/Resources/MediaFile/Access/Description"
  ).toMatch("just because");
});

it("should have an empty Access Description if description is missing", () => {
  session.properties.setText("accessDescription", "");
  setResultXml(
    ImdiGenerator.generateSession(session, project, true /*omit namespace*/)
  );
  // each media file will have one of these, hence 4
  expect(
    count("METATRANSCRIPT/Session/Resources/MediaFile/Access/Description")
  ).toBe(4);
});
