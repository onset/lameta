import { Project } from "../model/Project/Project";
import * as Path from "path";
import * as temp from "temp";
import * as XLSX from "xlsx";
import { Session } from "../model/Project/Session/Session";

import {
  mapSpreadsheetRecord,
  lingmetaxSessionMap,
  addSessionToProject,
} from "./SpreadsheetImport";

beforeAll(() => {
  //project = Project.fromDirectory("sample data/Edolo sample");
});

describe("csv importer", () => {
  it("handles lingMetaX", () => {
    const workbook = XLSX.readFile("c:/dev/lameta/sample data/LingMetaX.xlsx", {
      cellDates: true,
      // dateNF: "YYYY-MM-DD", doesn't do anything
    });
    const rows: any[] = XLSX.utils.sheet_to_json(
      workbook.Sheets[workbook.SheetNames[0]]
      // header:1 make it give us a matrix
      //{ header: 1 }
    );

    expect(rows).toBe("");
    expect(rows[0].title).toBe("Take California");
  });

  it("handles case where the dest field doesn't exist", () => {});
  it("handles bogus dates", () => {});
  it("handles various forms of language ids", () => {});
  it("handles missing id", () => {
    // I suppose we just make one?
  });
  it("lingMetaX --> SimpleLametaSessionJson", () => {
    const sampleLingMetaXSessionRecord = {
      date: "2020-10-20",
      title: "the title",
      filename: "20200127_RGb",
      description:
        "Ullamco consectetur do nisi est id laboris culpa voluptate veniam dolor id consequat sint aliquip.",
      location_region: "some region",
      location_country: "Papua New Guinea",
      location_local: "Huya",
      archive_repository: "ELAR",
      genre: "drama",
      subgenre: "play",
      topic: "some topic",
      keywords: "alpha particles, beta",
      involvement: "elicited",
      planning: "spontaneous",
      social_context: "public",
      subject_languages: "etr;tpi",
      working_languages: "en",
      access_ELAR: "Open",
      video: "sony 123, zoom 456",
      audio: "zoom silver thing",
      other_equipment: "sun shade",
      recording_conditions: "windy",
      participant_1_full_name: "Joe Strummer",
      participant_1_role: "vocals",
      participant_2_full_name: "Mick Jones",
      participant_2_role: "guitar",
      temperature: "hot!",
    };
    const simpleLametaSessionJson = mapSpreadsheetRecord(
      sampleLingMetaXSessionRecord,
      lingmetaxSessionMap
    );
    expect(Object.keys(simpleLametaSessionJson.custom).length).toBe(5);
    expect(simpleLametaSessionJson.planningType).toBe("spontaneous");
  });

  it("SimpleLametaSessionJson --> Session Objects", () => {
    //finalStageBeforeCreation
    const lametaSessionRecord = {
      id: "1234",
      title: "foo",
      date: "2010-3-10",
      genre: "drama",
      custom: { myCustomColor: "red" },
    };

    const projectDir = temp.mkdirSync("-spreadsheetImporterSpec");
    const session = addSessionToProject(projectDir, lametaSessionRecord);
    expect(session.properties.getTextStringOrEmpty("title")).toBe("foo");
    expect(session.properties.getTextStringOrEmpty("myCustomColor")).toBe(
      "red"
    );
  });
});
