import ImdiGenerator from "./ImdiGenerator";
import { Project } from "../model/Project/Project";
import { Session } from "../model/Project/Session/Session";
import {
  setResultXml,
  xexpect as expect,
  count,
  value
} from "../other/xmlUnitTestUtils";
import { CustomFieldRegistry } from "../model/Project/CustomFieldRegistry";
vi.mock("@electron/remote", () => ({ exec: vi.fn() })); //See commit msg for info

let project: Project;
let session: Session;

beforeAll(() => {
  project = Project.fromDirectory("sample data/Edolo sample");
  session = Session.fromDirectory(
    "sample data/Edolo sample/Sessions/ETR009",
    new CustomFieldRegistry()
  );
  // a set of tests below rely on this value
  session.properties.setText("accessDescription", "just because");
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

  it("Subject is an OpenVocabularyList, not OpenVocabulary", () => {
    expect("METATRANSCRIPT/Session/MDGroup/Content/Subject").toBeOpenList();
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
  expect("METATRANSCRIPT/Session/Resources/MediaFile/Type").toMatch("Audio"); // ELAR needs upper case
});
it("should give a good record for an ELAN file", () => {
  expect("METATRANSCRIPT/Session/Resources/WrittenResource[2]/Type").toMatch(
    "ELAN"
  );
  expect("METATRANSCRIPT/Session/Resources/WrittenResource[2]/Format").toMatch(
    "text/x-eaf+xml"
  );
});

it("should make separate keys for each topic separated by a comma", () => {
  expect("METATRANSCRIPT/Session/MDGroup/Content/Keys/Key[1]").toMatch(
    "Incoming"
  );
  expect("METATRANSCRIPT/Session/MDGroup/Content/Keys/Key[2]").toMatch(
    "Fishing"
  );
  expect("METATRANSCRIPT/Session/MDGroup/Content/Keys/Key[3]").toMatch(
    "Poison"
  );
});

//https://trello.com/c/GcNAmcOb/107-imdi-category-for-accessdescription-missing-from-imdi-export
it("should have an Access Description if filled in", () => {
  // each media file will have one of these, hence 4
  expect(
    count("METATRANSCRIPT/Session/Resources/MediaFile/Access/Description")
  ).toBe(4);
  expect(
    "METATRANSCRIPT/Session/Resources/MediaFile/Access/Description"
  ).toMatch("just because");
});

/* ------- Notice, this one re-generates the session (which is expensive, like 1.5 seconds) ------------- */

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

// The `Resources` element has xs:sequence, which requires that the resouces be
// in order by type. MediaFile, WrittenResource, LexiconResource,
// LexiconComponent, Source, Anonyms
it("media resources must precede written resources", () => {
  // the etr009 sample data has 4 media and 3 written resources. The
  // naming would intersperse them. Test that instead, the media files are first.

  const kNumberOfMediaFiles = 4;
  const kNumberOfWrittenResources = 3;
  for (var i = 0; i < kNumberOfMediaFiles; i++) {
    expect(
      `METATRANSCRIPT/Session/Resources/*[${i + 1}][name()='MediaFile']`
    ).toHaveCount(1);
  }
  for (
    i = kNumberOfMediaFiles;
    i < kNumberOfMediaFiles + kNumberOfWrittenResources;
    i++
  ) {
    expect(
      `METATRANSCRIPT/Session/Resources/*[${i + 1}][name()='WrittenResource']`
    ).toHaveCount(1);
  }
});

// maybe order is not important, but at least this tests that they are all there
it("written resources to be in alphabetical order", () => {
  expect(count("METATRANSCRIPT/Session/Resources/WrittenResource")).toBe(3);
  expect(
    "METATRANSCRIPT/Session/Resources/WrittenResource[1]/ResourceLink"
  ).toMatch("ETR009/ETR009_AText.txt");
  expect(
    "METATRANSCRIPT/Session/Resources/WrittenResource[2]/ResourceLink"
  ).toMatch("ETR009/ETR009_Tiny_StandardAudio.wav.annotations.eaf");
  expect(
    "METATRANSCRIPT/Session/Resources/WrittenResource[3]/ResourceLink"
  ).toMatch("ETR009/ETR009_XDoc.docx");
});
