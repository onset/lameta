import { Folder } from "./Folder";
import { File } from "./File";
import * as Path from "path";
import * as glob from "glob";

export class Person extends Folder {
  public get metadataFileExtensionWithDot(): string {
    return ".person";
  }

  public get photoPath(): string {
    let pattern = Path.join(
      this.directory,
      this.properties.getTextStringOrEmpty("name") +
        "_Photo.@(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|bmp|BMP)"
    );
    pattern = pattern.split("\\").join("/"); // this glob lib requires forward slashes, even on windows

    const filePaths = glob.sync(pattern); // nocase didn't work { nocase: true });
    console.log("photos length:" + filePaths.length);
    if (filePaths.length > 0) {
      return filePaths[0];
    } else {
      return "";
    }
  }

  public get displayName(): string {
    return this.properties.getTextStringOrEmpty("name");
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

    manditoryTextProperies.forEach(key =>
      this.properties.manditoryTextProperty(key, "")
    );

    this.properties.addTextProperty("name", Path.basename(directory));
  }
  public static fromDirectory(path: string): Person {
    const files = this.loadChildFiles(path, ".person", "Person");
    return new Person(path, files);
  }
  public static save() {
    //console.log("saving " + person.getString("title"));
    //fs.writeFileSync(person.path + ".test", JSON.stringify(person), "utf8");
  }
}
