import { vi, describe, it, beforeAll, beforeEach, expect } from "vitest";
import { Project } from "../model/Project/Project";
import * as temp from "temp";
import {
  makeParadisecSessionCsv,
  makeParadisecProjectFieldsCsv,
  parseNameIntoFirstAndLast
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
      last: "smith"
    });
    expect(parseNameIntoFirstAndLast("smith, jill")).toStrictEqual({
      first: "jill",
      last: "smith"
    });
    expect(parseNameIntoFirstAndLast("jill jane smith")).toStrictEqual({
      first: "jill jane",
      last: "smith"
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
      1 /* for header */ + project.sessions.items.length
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

  it("should flatten line separators in item descriptions", () => {
    const projectWithLineBreaks = Project.fromDirectory("sample data/Edolo sample");
    const sessionWithLineBreaks = projectWithLineBreaks.sessions.items[0];
    const description =
      "On spine: Mon intervent 1/12/77\nOn back cover: Solomon Is.\u2028On reel: N 1";

    sessionWithLineBreaks.properties.setText("description", description);

    const csv = makeParadisecSessionCsv(projectWithLineBreaks, (f) => true);
    const parsed = parseSync(csv, { relax_column_count: true });
    const descriptionColumn = parsed[0].indexOf("Item Description");
    const itemDescription = parsed[1][descriptionColumn];

    expect(descriptionColumn).toBeGreaterThan(-1);
    expect(itemDescription).toContain(
      "On spine: Mon intervent 1/12/77 On back cover: Solomon Is. On reel: N 1"
    );
    expect(itemDescription).not.toContain("| description:");
    expect(itemDescription).not.toMatch(/[\r\n\u0085\u2028\u2029]/);
  });

  it("should not duplicate the description field in item descriptions", () => {
    const projectWithDescription = Project.fromDirectory("sample data/Edolo sample");
    const sessionWithDescription = projectWithDescription.sessions.items[0];

    sessionWithDescription.properties.setText(
      "description",
      "Sticker on cover: 3-2/59"
    );

    const csv = makeParadisecSessionCsv(projectWithDescription, (f) => true);
    const parsed = parseSync(csv, { relax_column_count: true });
    const descriptionColumn = parsed[0].indexOf("Item Description");
    const itemDescription = parsed[1][descriptionColumn];

    expect(itemDescription).toContain("Sticker on cover: 3-2/59");
    expect(itemDescription).not.toContain("| description: Sticker on cover: 3-2/59");
  });
});
