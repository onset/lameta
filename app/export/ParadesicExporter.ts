import CsvExporter from "./CsvExporter";
import { Project } from "../model/Project/Project";
import * as fs from "fs-extra";
import * as temp from "temp";

temp.track(); // cleanup on exit: doesn't work

// tslint:disable-next-line:no-submodule-imports
const parseSync = require("csv-parse/lib/sync");

let project: Project;

let csv: any;
let matrix: any;

const kEol: string = require("os").EOL;

beforeAll(() => {
  project = Project.fromDirectory("sample data/Edolo sample");
  csv = new CsvExporter(project).makeParadesicCsv((f) => true);
  matrix = parseSync(csv, { relax_column_count: false });
});

describe("Pardesic CSV exporter", () => {
  it("should produce the file requested", () => {
    const path = temp.path({ suffix: ".zip" });
    new CsvExporter(project).makeZipFile(path, () => true);
    // on github actions run, this failed once, but I can't see
    // what is async in the makeZipFile() function. So I'm wrapping it
    // in a short delay.
    jest.useFakeTimers();
    setTimeout(() => {
      expect(fs.existsSync(path)).toBe(true);
    }, 1000);
    jest.runAllTimers();
    temp.cleanupSync(); // doesn't work
    fs.removeSync(path); // so we do it manually
  });
});

describe("project csv export", () => {
  it("should contain 1 line for header and 1 line for properties", () => {
    expect(projectMatrix.length).toBe(2);
  });
  it("should NOT contain hasConsent", () => {
    expect(peopleMatrix.join(" ").indexOf("hasConsent")).toBe(-1);
  });
});

function location(key: string) {
  expect(peopleMatrix[0]).toContainEqual(key);
  return peopleMatrix[0].indexOf(key);
}
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
