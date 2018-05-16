import { Folder } from "../../Folder";
import { File, FolderMetdataFile } from "../../file/File";
import * as Path from "path";
import { IChoice } from "../../field/Field";
import mobx from "mobx";
const knownFieldDefinitions = require("../../field/fields.json");
const genres = require("./genres.json");

export class Session extends Folder {
  public get metadataFileExtensionWithDot(): string {
    return ".session";
  }

  public get displayName(): string {
    return this.properties.getTextStringOrEmpty("title");
  }

  public constructor(directory: string, metadataFile: File, files: File[]) {
    super(directory, metadataFile, files);
    this.safeFileNameBase = this.properties.getTextStringOrEmpty("id");
  }
  public static fromDirectory(directory: string): Session {
    const metadataFile = new FolderMetdataFile(
      directory,
      "Session",
      ".session"
    );
    // const genreNames = genres.map((g: any) => g.label);
    // const genreFieldDefinition = knownFieldDefinitions.session.find(
    //   (o: any) => o.key === "genre"
    // );
    const genreChoices = genres.map((g: any) => {
      return g as IChoice;
    });
    const genreFieldDefinition = knownFieldDefinitions.session.find(
      (o: any) => o.key === "genre"
    );

    genreFieldDefinition.complexChoices = genreChoices;
    const files = this.loadChildFiles(
      directory,
      metadataFile,
      knownFieldDefinitions.session
    );

    //start autosave
    // mobx.autorunAsync(
    //   () => this.save(),
    //   10 * 1000 /* min 10 seconds in between */
    // );

    return new Session(directory, metadataFile, files);
  }
  // override
  protected fieldContentThatControlsFolderName(): string {
    return this.properties.getTextStringOrEmpty("id").trim();
  }
}
