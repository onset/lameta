import { Project } from "../model/Project/Project";
import { Folder } from "../model/Folder";
const moment = require("moment");
//import nodeArchiver = require("archiver");
import * as nodeArchiver from "archiver";
import * as fs from "fs";
import { FieldDefinition } from "../model/field/Field";
const kEol: string = require("os").EOL;

let currentKnownFields: FieldDefinition[];

export default class CsvExporter {
  private project: Project;

  public constructor(project: Project) {
    this.project = project;
  }

  public makeZipFile(path: string) {
    const output = fs.createWriteStream(path);
    const archive = nodeArchiver.create("zip");
    // listen for all archive data to be written
    // 'close' event is fired only when a file descriptor is involved
    output.on("close", () => {});

    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on("warning", err => {
      if (err.code === "ENOENT") {
        console.log("csv makeZipFile Warning: " + err);
      } else {
        // throw error
        throw err;
      }
    });

    // good practice to catch this error explicitly
    archive.on("error", err => {
      console.log("csv makeZipFile error: " + err);
      alert("csv makeZipFile error: " + err);
    });

    // pipe archive data to the file
    archive.pipe(output);

    archive.append(this.makeCsvForProject(), { name: "project.csv" });
    archive.append(this.makeCsvForSessions(), { name: "sessions.csv" });
    archive.append(this.makeCsvForPeople(), { name: "people.csv" });

    archive.finalize();
  }

  private getKeys(folders: Folder[]): string[] {
    const foundFields: string[] = [];
    folders.forEach(folder => {
      folder.properties.keys().forEach(key => {
        if (foundFields.indexOf(key) < 0) {
          foundFields.push(key);
        }
      });
    });
    return foundFields;
  }

  // folders: a set of person folders, or a set of session folders
  private getCsv(folders: Folder[]): string {
    if (folders.length === 0) {
      // without even one folder (one person, or one session), this code can't even determine the fields, so just bail
      return "";
    }
    currentKnownFields = folders[0].knownFields;
    const blacklist = ["modifiedDate", "size", "type"];
    const foundFields = this.getKeys(folders)
      .filter(k => blacklist.indexOf(k) === -1)
      .sort(this.sortFields);
    const header = foundFields.join(",");
    const lines = folders
      .map(folder => {
        const line = foundFields
          .map(key => {
            const value = folder.properties.getTextStringOrEmpty(key);
            return CsvExporter.csvEncode(value);
          })
          .join(",");
        return line;
      })
      .join(kEol);

    return header + kEol + lines;
  }

  private sortFields(a: string, b: string): number {
    let ai = currentKnownFields.findIndex(f => f.key === a);
    let bi = currentKnownFields.findIndex(f => f.key === b);
    // unlisted fields go to the end
    ai = ai === -1 ? 1000 : ai;
    bi = bi === -1 ? 1000 : bi;
    if (ai !== bi) {
      console.log(
        `a:${a} ${ai}  b:${b} ${bi}  result:${ai > bi ? 1 : ai < bi ? -1 : 0}`
      );
      return ai > bi ? 1 : ai < bi ? -1 : 0;
    }
    return a > b ? 1 : a < b ? -1 : 0;
  }

  public static csvEncode(value: string): string {
    let needsQuotes = false;
    needsQuotes = value.indexOf(",") > -1;

    // mac,linux, windows all have an \r, so that's
    // enough, even though windows also has \n.
    needsQuotes = needsQuotes || value.indexOf("\r") > -1;

    // the rfc spec seems astonishingly inconsistent on the question of
    // whether quotes should be escaped if the entire field is not surrounded in quotes

    value = value.replace(/"/g, '""');

    if (needsQuotes) {
      // If double-quotes are used to enclose fields, then a double-quote
      // appearing inside a field must be escaped by preceding it with
      //  another double quote.
      //value = value.replace(/"/g, '""');
      return '"' + value + '"';
    }
    return value;
  }

  public makeCsvForProject(): string {
    return this.getCsv([this.project]);
  }
  public makeCsvForPeople(): string {
    return this.getCsv(this.project.persons);
  }

  public makeCsvForSessions(): string {
    return this.getCsv(this.project.sessions);
  }
}
