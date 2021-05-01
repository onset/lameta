import { Project } from "../model/Project/Project";
import * as fs from "fs-extra";
import * as temp from "temp";
import {
  makeParadisecSessionCsv,
  makeParadisecProjectFieldsCsv,
  parseNameIntoFirstAndLast,
} from "./ParadisecCsvExporter";
// tslint:disable-next-line:no-submodule-imports
//const parseSync = require("csv-parse/lib/sync");
// tslint:disable-next-line:no-submodule-imports
import parseSync from "csv-parse/lib/sync";
temp.track(); // cleanup on exit: doesn't work

let project: Project;
let projectMatrix: any;
let sessionMatrix: any;
let projectCsv: string;
let sessionCsv: string;
const kEol: string = require("os").EOL;

describe("Paradisec project csv export", () => {
  beforeAll(() => {
    project = Project.fromDirectory("sample data/Edolo sample");
    projectCsv = makeParadisecProjectFieldsCsv(project);
    projectMatrix = parseSync(projectCsv);
  });
  it("should contain right number of rows", () => {
    expect(projectMatrix.length).toBe(5);
  });
  it("should parse depositor name", () => {
    expect(parseNameIntoFirstAndLast("jill smith")).toStrictEqual({
      first: "jill",
      last: "smith",
    });
    expect(parseNameIntoFirstAndLast("smith, jill")).toStrictEqual({
      first: "jill",
      last: "smith",
    });
    expect(parseNameIntoFirstAndLast("jill jane smith")).toStrictEqual({
      first: "jill jane",
      last: "smith",
    });
  });
});

describe("Paradisec session csv export", () => {
  beforeAll(() => {
    project = Project.fromDirectory("sample data/Edolo sample");
    sessionCsv = makeParadisecSessionCsv(project, (f) => true);
    //console.log(sessionCsv);
    sessionMatrix = parseSync(sessionCsv, { relax_column_count: true });
  });
  it("should contain right number of rows", () => {
    expect(sessionMatrix.length).toBe(
      1 /* for header */ + project.sessions.length
    );
  });

  it("should contain contributions", () => {
    const first = sessionMatrix[1] as string[];
    const baseColumnsPerSession = 14;
    const contributions = 4;
    const columnsPerContribution = 3;
    expect(first.length).toBe(
      baseColumnsPerSession + contributions * columnsPerContribution
    );
    expect(first).toContain("Heole");
  });
});
