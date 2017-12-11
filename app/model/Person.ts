import { observable } from "mobx";
import { Folder } from "./Folder";
import { File } from "./File";

export class Person extends Folder {
  public get metadataFileExtensionWithDot(): string {
    return ".person";
  }

  public constructor(directory: string, files: File[]) {
    super(directory, files);
    const manditoryTextProperies = [
      "primaryLanguage",
      "primaryLanguageLearnedIn",
      "otherLanguage0",
      "fathersLanguage",
      "mothersLanguage",
      "otherLanguage1",
      "birthYear",
      "gender",
      "education",
      "primaryOccupation"
    ];

    manditoryTextProperies.forEach(key => this.manditoryTextProperty(key, ""));
  }
  public static fromDirectory(path: string): Person {
    const files = this.loadChildFiles(path, ".person");
    return new Person(path, files);
  }
  public static save() {
    //console.log("saving " + person.getString("title"));
    //fs.writeFileSync(person.path + ".test", JSON.stringify(person), "utf8");
  }
}
