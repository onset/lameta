import { Folder } from "../../Folder";
import { File, FolderMetdataFile } from "../../file/File";
import * as Path from "path";
import * as glob from "glob";
const knownFieldDefinitions = require("../../field/fields.json");
import * as fs from "fs-extra";
import { computed } from "mobx";

export class Person extends Folder {
  public get metadataFileExtensionWithDot(): string {
    return ".person";
  }

  // public get photoPath2(): string {
  //   let pattern = Path.join(
  //     this.directory,
  //     this.properties.getTextStringOrEmpty("name") +
  //       "_Photo.@(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|bmp|BMP)"
  //   );
  //   pattern = pattern.split("\\").join("/"); // this glob lib requires forward slashes, even on windows

  //   const filePaths = glob.sync(pattern); // nocase didn't work { nocase: true });
  //   //console.log("photos length:" + filePaths.length);
  //   if (filePaths.length > 0) {
  //     return filePaths[0];
  //   } else {
  //     return "";
  //   }
  // }

  private get mugshotFile(): File | undefined {
    return this.files.find(f => {
      return f.describedFilePath.indexOf("_Photo.") > -1;
    });
  }

  public get mugshotPath(): string {
    const m = this.mugshotFile;
    return m ? m.describedFilePath : "";
  }

  /* Used when the user gives us a mugshot, either the first one or replacement one */
  public set mugshotPath(path: string) {
    console.log("photopath " + path);

    const f = this.mugshotFile;
    if (f) {
      fs.removeSync(f.describedFilePath);
      this.files.splice(this.files.indexOf(f), 1); //remove that one
    }

    const renamedPhotoPath = this.filePrefix + "_Photo" + Path.extname(path);
    fs.copySync(path, renamedPhotoPath);
    this.addOneFile(renamedPhotoPath);
  }

  public get displayName(): string {
    return this.properties.getTextStringOrEmpty("name");
  }

  public constructor(directory: string, metadataFile: File, files: File[]) {
    super(directory, metadataFile, files);
    this.properties.setText("name", Path.basename(directory));
  }
  public static fromDirectory(directory: string): Person {
    const metadataFile = new FolderMetdataFile(directory, "Person", ".person");

    const files = this.loadChildFiles(
      directory,
      metadataFile,
      knownFieldDefinitions.person
    );
    return new Person(directory, metadataFile, files);
  }
  public static save() {
    //console.log("saving " + person.getString("title"));
    //fs.writeFileSync(person.path + ".test", JSON.stringify(person), "utf8");
  }
}
