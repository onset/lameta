import { Project } from "../model/Project/Project";
import * as fs from "fs-extra";
import * as temp from "temp";
import {
  makeCsvForPeople,
  makeCsvForProject,
  makeCsvForSessions,
  csvEncode,
  makeGenericCsvZipFile,
} from "./CsvExporter";
// tslint:disable-next-line:no-submodule-imports
const parseSync = require("csv-parse/lib/sync");

let project: Project;
let peopleCsv: string;
let peopleMatrix: any;
let sessionsCsv: string;
let sessionMatrix: any;
let projectMatrix: any;

const kEol: string = require("os").EOL;

beforeAll(() => {
  project = Project.fromDirectory("sample data/Edolo sample");
  peopleCsv = makeCsvForPeople(project);
  //  fs.writeFileSync("d:/temp/peoplecsv.csv", peopleCsv);
  peopleMatrix = parseSync(peopleCsv, { relax_column_count: false });

  sessionsCsv = makeCsvForSessions(project, (f) => true);
  sessionMatrix = parseSync(sessionsCsv, { relax_column_count: false });
  //fs.writeFileSync("d:/temp/sessionsCsv.csv", sessionsCsv);
  const projectCsv = makeCsvForProject(project);
  projectMatrix = parseSync(projectCsv);
  //fs.writeFileSync("d:/temp/projectCsv.csv", projectCsv);
});

describe("csv exporter", () => {
  it("should produce the file requested", () => {
    // didn't work, though I set this variable in the main.yml
    if (
      process.platform === "win32" &&
      process.env.in_github_action === "true"
    ) {
      // for some reason this fails to ever deliver a file in the windows github action environment
      console.log("Skipping csv exporter test on github-actions on windows.");
    } else {
      temp.track(); // cleanup on exit: doesn't work
      const path = temp.path({ suffix: ".zip" });
      makeGenericCsvZipFile(path, project, () => true);
      // on github actions run, this failed once, but I can't see
      // what is async in the makeZipFile() function. So I'm wrapping it
      // in a delay.
      jest.useFakeTimers();
      setTimeout(() => {
        expect(fs.existsSync(path)).toBe(true);
      }, 20000);
      jest.runAllTimers();
      temp.cleanupSync(); // doesn't work
      fs.removeSync(path); // so we do it manually
    }
  });
});

describe("csv encoding", () => {
  it("should not be surrounded by quotes if not needed", () => {
    expect(csvEncode("one two")).toBe("one two");
  });
  it("should add quotes if there are commas", () => {
    expect(csvEncode("one,two")).toBe('"one,two"');
  });
  it("should add quotes if there is a mac newline", () => {
    expect(csvEncode("one\rtwo")).toBe('"one\rtwo"');
  });
  it("should add quotes if there is a windows newline", () => {
    expect(csvEncode("one\r\ntwo")).toBe('"one\r\ntwo"');
  });
  it("should double quotes if there are quotes", () => {
    expect(csvEncode('please, call me "John"')).toBe(
      '"please, call me ""John"""'
    );
  });
});

describe("people csv export", () => {
  it("should contain right number of people", () => {
    expect(peopleMatrix.length).toBe(1 + 4);
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
    expect(peopleMatrix[0]).not.toContainEqual("filename");
    expect(peopleMatrix[0]).not.toContainEqual("displayname");
  });
  it("check Igali", () => {
    // console.log(peopleMatrix[0]);
    // console.log(peopleMatrix[2]);
    expect(people(2, "name")).toBe("Igali Sagali (Joseph)");
    expect(people(2, "education")).toBe("Grade 1");
    expect(people(2, "birthYear")).toBe("1972");
    expect(people(2, "gender")).toBe("Male");
    expect(people(2, "languages")).toContain(
      "*etr (also mother) (also father)"
    );
    expect(people(2, "languages")).toContain("hui");
    expect(people(2, "languages")).toContain("tpi");
  });
  it("should have name first", () => {
    expect(location("name")).toBe(0);
    expect(location("nickname")).toBe(1);
    expect(location("code")).toBe(2);
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
    expect(session(1, "topic")).toBe("fishing, poison");
  });
  it("should have good contributor list", () => {
    expect(session(1, "contributions")).toBe(
      "participant:Awi Heole|participant:Ilawi Amosa|recorder:Hatton|speaker:Awi Heole"
    );
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
