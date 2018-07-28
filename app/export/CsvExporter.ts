import { Session } from "../model/Project/Session/Session";
import * as XmlBuilder from "xmlbuilder";
import { Project } from "../model/Project/Project";
import { Folder } from "../model/Folder";
const moment = require("moment");
import { File } from "../model/file/File";
import * as Path from "path";
import { Person } from "../model/Project/Person/Person";
import Archiver = require("archiver");
import { showInExplorer } from "../crossPlatformUtilities";
import * as fs from "fs";
import { encode } from "punycode";
const kEol: string = require("os").EOL;

export default class CsvExporter {
  private project: Project;
  public constructor(project: Project) {
    this.project = project;
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
  private getCsv(folders: Folder[]): string {
    const blacklist = ["modifiedDate", "size", "type"];
    const foundFields = this.getKeys(folders).filter(
      k => blacklist.indexOf(k) === -1
    );
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
  // onst lines = folders
  //     .map(folder => {
  //       const line = folder.properties
  //         .keys()
  //         .filter(k => blacklist.indexOf(k) === -1)
  //         .map(key => {
  //           const value = folder.properties.getTextStringOrEmpty(key);
  //           return CsvExporter.csvEncode(value);
  //         })
  //         .join(",");
  //       return line;
  //     })
  //     .join(kEol);

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
  public makeCsvForPeople(): string {
    return this.getCsv(this.project.persons);
  }

  public makeCsvForSessions(): string {
    return this.getCsv(this.project.sessions);
  }
}
