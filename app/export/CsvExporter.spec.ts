import CsvExporter from "./CsvExporter";
import { Project } from "../model/Project/Project";
import * as fs from "fs-extra";

// tslint:disable-next-line:no-submodule-imports
const parseSync = require("csv-parse/lib/sync");

let project: Project;
let peopleCsv: string;
let peopleMatrix: any;
let sessionsCsv: string;
let sessionMatrix: any;

const kEol: string = require("os").EOL;

beforeAll(() => {
  project = Project.fromDirectory("sample data/Edolo sample");
  peopleCsv = new CsvExporter(project).makeCsvForPeople();
  fs.writeFileSync("d:/temp/peoplecsv.txt", peopleCsv);
  peopleMatrix = parseSync(peopleCsv, { relax_column_count: false });

  sessionsCsv = new CsvExporter(project).makeCsvForSessions();
  sessionMatrix = parseSync(sessionsCsv, { relax_column_count: false });
});

describe("csv exporter", () => {
  it("should not quotes if not needed", () => {
    expect(CsvExporter.csvEncode("one two")).toBe("one two");
  });
  it("should add quotes if there are commas", () => {
    expect(CsvExporter.csvEncode("one,two")).toBe('"one,two"');
  });
  it("should add quotes if there is a mac newline", () => {
    expect(CsvExporter.csvEncode("one\rtwo")).toBe('"one\rtwo"');
  });
  it("should add quotes if there is a windows newline", () => {
    expect(CsvExporter.csvEncode("one\r\ntwo")).toBe('"one\r\ntwo"');
  });
  it("should double quotes if there are quotes", () => {
    expect(CsvExporter.csvEncode('no, call me "John"')).toBe(
      '"no, call me ""John"""'
    );
  });
});

describe("people csv export", () => {
  it("should contain right number of people", () => {
    expect(peopleMatrix.length).toBe(1 + 4);
  });
  it("should contain expected primaryLanguage", () => {
    expect(people(1, "primaryLanguage")).toBe("Edolo");
  });
  it("should contain expected notes", () => {
    expect(people(1, "notes")).toBe("");
  });
  it("should contain expected notes", () => {
    expect(people(1, "education")).toBe("Grade 2");
  });
  it("should not contain internal fields", () => {
    expect(peopleMatrix[0]).not.toContainEqual("size");
    expect(peopleMatrix[0]).not.toContainEqual("Size");
    expect(peopleMatrix[0]).not.toContainEqual("modifiedDate");
    expect(peopleMatrix[0]).not.toContainEqual("type");
  });
  it("check Igali", () => {
    expect(people(2, "name")).toBe("Igali Sagali (Joseph)");
    expect(people(2, "education")).toBe("Grade 1");
    expect(people(2, "birthYear")).toBe("1972");
    expect(people(2, "gender")).toBe("Male");
    expect(people(2, "otherLanguage0")).toBe("Huli");
    expect(people(2, "otherLanguage1")).toBe("Tok Pisin");
  });
});

describe("sessions csv export", () => {
  it("should contain right number of sessions", () => {
    expect(sessionMatrix.length).toBe(1 + 1);
  });
  it("should contain id", () => {
    expect(session(1, "id")).toBe("ETR009");
  });
  it("should contain date", () => {
    expect(session(1, "date")).toBe("2010-06-06");
  });
  it("should contain location", () => {
    expect(session(1, "location")).toBe("Huya");
  });
  it("should contain customFields", () => {
    expect(session(1, "topic")).toBe("fishing");
  });
});

function people(line: number, key: string) {
  expect(peopleMatrix[0]).toContainEqual(key);
  const i = peopleMatrix[0].indexOf(key);
  return peopleMatrix[line][i];
}
function session(line: number, key: string) {
  expect(sessionMatrix[0]).toContainEqual(key);
  const i = sessionMatrix[0].indexOf(key);
  return sessionMatrix[line][i];
}
