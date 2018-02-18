import * as xml2js from "xml2js";
import * as fs from "fs";
import * as Path from "path";
import * as filesize from "filesize";
import { observable } from "mobx";
import * as assert from "assert";
import * as camelcase from "camelcase";
import * as imagesize from "image-size";
import * as musicmetadata from "musicmetadata";
import { Field, FieldType } from "../field/Field";
import { FieldSet } from "../field/FieldSet";
import * as xmlbuilder from "xmlbuilder";
const moment = require("moment");
///export  enum Type {Project, Session, Person, Other }

export class Contribution {
  public name: string;
  public role: string;
  public date: string;
  public comments: string;
}

export abstract class File {
  // can be changed to Session, Project, or Person in constructor
  //protected xmlRootName: string = "MetaData";

  // In the case of folder objects (project, session, people) this will just be the metadata file,
  // and so describedFilePath === metadataPath.
  // In all other cases (mp3, jpeg, elan, txt), this will be the file we are storing metadata about.
  public describedFilePath: string;

  //does this need to be saved?
  private dirty: boolean;
  public isDirty(): boolean {
    return this.dirty;
  }
  public considerDirty() {
    if (this.dirty) {
      console.log(`Already dirty: ${this.metadataFilePath}`);
    } else {
      console.log(`Considered dirty: ${this.metadataFilePath}`);
    }
    this.dirty = true;
  }

  // This file can be *just* metadata for a folder, in which case it has the fileExtensionForFolderMetadata.
  // But it can also be paired with a file in the folder, such as an image, sound, video, elan file, etc.,
  // in which case the metadata will be stored in afile with the same name as the described file, but
  // with an extension of ".meta", as in "banquet.jpg.meta";
  public metadataFilePath: string;

  private xmlRootName: string;
  private fileExtensionForMetadata: string;

  @observable public properties = new FieldSet();

  @observable public contributions = new Array<Contribution>();

  get type(): string {
    const x = this.properties.getValue("type") as Field;
    return x ? x.text : "???";
  }
  private checkType(key: string, value: any) {
    if (this.properties.containsKey(key)) {
      const a = typeof this.properties.getValue(key);
      const b = typeof value;
      assert(a === b, `Cannot change type of ${key} from ${a} to ${b}`);
    }
  }
  protected addDatePropertyFromString(key: string, dateString: string) {
    // get a little paranoid with the date format
    assert(moment(dateString).isValid()); //todo: handle bad data
    const date = new Date(Date.parse(dateString));
    this.checkType(key, date);
    const dateWeTrust = date.toISOString();
    this.properties.setValue(key, new Field(key, FieldType.Date, dateWeTrust));
  }
  protected addDateProperty(key: string, date: Date) {
    this.checkType(key, date);
    this.properties.setValue(
      key,
      new Field(key, FieldType.Date, date.toISOString())
    );
  }
  public addTextProperty(key: string, value: string, persist: boolean = true) {
    //console.log("setting " + key + " to " + value);
    this.properties.setValue(
      key,
      new Field(
        key,
        FieldType.Text,
        value,
        undefined,
        undefined,
        undefined,
        persist
      )
    );
    assert(value === this.properties.getTextField(key).text);
  }
  public setTextProperty(key: string, value: string) {
    //many SayMore 1/2/3.x xml files used a mix of upper and lower case
    //We can read the upper case ones, but then we convert them to lower case initial
    const correctedKey = camelcase(key);
    this.properties.setValue(
      key,
      new Field(correctedKey, FieldType.Text, value)
    );
  }
  public getTextProperty(key: string, ifMissing: string = "MISSING"): string {
    const p = this.properties.getValue(key); //as Field;
    if (!p) {
      return ifMissing;
    }
    return p.text;
  }

  public getTextField(key: string): Field {
    return this.properties.getValue(key) as Field;
  }

  public constructor(
    describedFilePath: string,
    metadataFilePath: string,
    xmlRootName: string,
    fileExtensionForMetadata: string
  ) {
    this.describedFilePath = describedFilePath;
    this.metadataFilePath = metadataFilePath;
    this.xmlRootName = xmlRootName;
    this.fileExtensionForMetadata = fileExtensionForMetadata;
    this.addTextProperty("filename", Path.basename(describedFilePath), false);
    this.addTextProperty("notes", "");

    const stats = fs.statSync(describedFilePath);
    this.addTextProperty("size", filesize(stats.size, { round: 0 }), false);
    this.addDateProperty("date", stats.mtime);

    const typePatterns = [
      ["Session", /\.session$/i],
      ["Person", /\.person$/i],
      ["Audio", /\.((mp3)|(wav)|(ogg))$/i],
      ["Video", /\.((mp4))$/i],
      ["Image", /\.(jpg)|(bmp)|(gif)|(png)/i],
      ["Text", /\.(txt)/i]
    ];
    typePatterns.forEach(t => {
      if (describedFilePath.match(t[1])) {
        this.addTextProperty("type", t[0] as string, false);
        //break;  alas, there is no break as yet.
      }
    });

    this.readMetadataFile();

    this.computeProperties(); //enhance: do this on demand, instead of for every file

    this.contributions.push(new Contribution());
    this.contributions[0].name = Path.basename(this.describedFilePath);
    // TODO read the .meta file that describes this file, if it exists
  }

  public loadProperties(propertiesFromXml: any) {
    const keys = Object.keys(propertiesFromXml);

    for (const key of keys) {
      let value = propertiesFromXml[key];
      if (value === undefined) {
        value = "";
      } else if (typeof value === "object") {
        if (value.$ && value.$.type && value.$.type === "string") {
          value = value._;
        } else {
          //console.log(            "Skippping " + key + " which was " + JSON.stringify(value)          );
          continue;
        }
      }
      const textValue: string = value;
      const fixedKey = camelcase(key);
      // if it's already defined, let the existing field parse this into whatever structure (e.g. date)
      if (this.properties.containsKey(fixedKey)) {
        const v = this.properties.getValue(fixedKey);
        v.setValueFromString(textValue);
        //console.log("11111" + key);
      } else {
        // bit of a hack, might not keep this
        //console.log("000000 " + key);
        if (key.toLowerCase().indexOf("date") > -1) {
          this.addDatePropertyFromString(fixedKey, textValue);
        } else {
          //console.log("extra" + fixedKey + "=" + value);
          // otherwise treat it as a string
          this.addTextProperty(fixedKey, textValue);
        }
      }
    }
  }

  public computeProperties() {
    switch (this.type) {
      case "Audio":
        if (this.describedFilePath.match(/\.((mp3)|(ogg))$/i)) {
          //TODO: this is killing unrleated unit testing... presumably because the callback happens after the tests are done?
          // musicmetadata(fs.createReadStream(this.path), (err, metadata) => {
          //   if (err) {
          //     console.log("Error:" + err.message);
          //   }
          //   this.addTextProperty(
          //     "duration",
          //     err ? "????" : metadata.duration.toString() // <-- haven't see this work yet. I think we'll give in and ship with ffmpeg eventually
          //   );
          //   // todo bit rate & such, which musicmetadata doesn't give us
          // });
        }
        break;
      case "Image":
        const dimensions = imagesize(this.describedFilePath);
        this.addTextProperty("width", dimensions.width.toString());
        this.addTextProperty("height", dimensions.height.toString());
        break;
    }
  }
  public readMetadataFile() {
    if (!fs.existsSync(this.metadataFilePath)) {
      return;
    }

    const xml: string = fs.readFileSync(this.metadataFilePath, "utf8");

    let xmlAsObject: any = {};
    xml2js.parseString(
      xml,
      { async: false, explicitArray: false },
      (err, result) => {
        if (err) {
          throw err;
        }
        xmlAsObject = result;
      }
    );
    // that will have a root with one child, like "Session" or "Meta". Zoom in on that
    // so that we just have the object with its properties.
    const properties = xmlAsObject[Object.keys(xmlAsObject)[0]];
    this.loadProperties(properties);
  }

  public save() {
    if (!this.dirty) {
      //console.log(`skipping save of ${this.metadataFilePath}, not dirty`);
      return;
    }
    console.log(`Saving ${this.metadataFilePath}`);
    //console.log("Save():" + JSON.stringify(this.properties.keys()));

    // let json = `{"root":[`;
    // this.properties.forEach((k, f: Field) => {
    //   json += "{" + f.stringify() + "},";
    // });
    // json = json.replace(/(,$)/g, ""); //remove trailing comma
    // json += "]}";

    // console.log("Save() JSON:" + json);

    // prettier-ignore
    const root = xmlbuilder.create(this.xmlRootName, { version: '1.0', encoding: 'utf-8' });
    this.properties.forEach((k, f: Field) => {
      if (f.persist) {
        const t = f.typeAndValueForXml();
        //console.log(k + " is a " + t[0] + " of value " + t[1]);
        assert(
          k.indexOf("date") === -1 || t[0] === "date",
          "SHOULDN'T " + k + " BE A DATE?"
        );
        if (t[1].length > 0) {
          root.element(k, { type: t[0] }, t[1]).up();
        }
      }
    });
    //    root.element("notes", this.getTextProperty("notes")).up();

    const xml = root.end({ pretty: true });

    if (this.describedFilePath.indexOf("sample data") > -1) {
      // console.log(
      //   "PREVENTING SAVING IN DIRECTORY THAT CONTAINS THE WORDS 'sample data'"
      // );
      console.log("WOULD HAVE SAVED THE FOLLOWING TO " + this.metadataFilePath);
      // console.log(xml);
    } else {
      //console.log("writing:" + xml);
      fs.writeFileSync(this.metadataFilePath, xml);
      this.dirty = false;
    }
  }

  private getUniqueFilePath(intendedPath: string): string {
    let i = 0;
    let path = intendedPath;
    const extension = Path.extname(intendedPath);
    // enhance: there are pathological file names like "foo.mp3.mp3" where this would mess up.
    const pathWithoutExtension = Path.join(
      Path.dirname(intendedPath),
      Path.basename(intendedPath).replace(extension, "")
    );
    while (fs.existsSync(path)) {
      i++;
      path = pathWithoutExtension + " " + i + extension;
    }
    return path;
  }

  // Rename one file on disk and return the new full path.
  // A file is renamed only if it currently contains
  // the folder name. E.g. if we are changing from "jo" to "joe":
  // jo.person  --> joe.person
  // jo_photo.jpg --> joe_photo.jpg
  // group_photo.jpg --> no change
  private internalUpdateNameBasedOnNewBaseName(
    currentFilePath: string,
    newbase: string
  ): string {
    const oldbase = Path.basename(Path.dirname(currentFilePath));
    const oldFilename = Path.basename(currentFilePath);
    if (oldFilename.startsWith(oldbase)) {
      const newFilename = oldFilename.replace(oldbase, newbase);
      let newPath = Path.join(Path.dirname(currentFilePath), newFilename);
      // can't think of a strong scenario for this at the moment,
      // but it makes sure the rename will not fail due to a collision
      newPath = this.getUniqueFilePath(newPath);
      fs.renameSync(currentFilePath, newPath);
      return newPath;
    }
    return currentFilePath;
  }
  private updateFolderOnly(path: string, newFolderName: string): string {
    const filePortion = Path.basename(path);
    const directoryPortion = Path.dirname(path);
    const parentDirectoryPortion = Path.dirname(directoryPortion);
    return Path.join(parentDirectoryPortion, newFolderName, filePortion);
  }
  // Rename the file and change any internal references to the name.
  // Must be called *before* renaming the parent folder.
  public updateNameBasedOnNewFolderName(newFolderName: string) {
    if (
      this.metadataFilePath !== this.describedFilePath &&
      fs.existsSync(this.metadataFilePath)
    ) {
      this.metadataFilePath = this.internalUpdateNameBasedOnNewBaseName(
        this.metadataFilePath,
        newFolderName
      );
      this.metadataFilePath = this.updateFolderOnly(
        this.metadataFilePath,
        newFolderName
      );
    }
    this.describedFilePath = this.internalUpdateNameBasedOnNewBaseName(
      this.describedFilePath,
      newFolderName
    );
    this.describedFilePath = this.updateFolderOnly(
      this.describedFilePath,
      newFolderName
    );
    this.properties.setText("filename", Path.basename(this.describedFilePath));
  }
}

// project, sessions, and person folders have a single metdata file describing their contents, and this ends
// in a special extension (.sprj, .session, .person)
//protected fileExtensionForFolderMetadata: string;
export class FolderMetdataFile extends File {
  constructor(
    directory: string,
    xmlRootName: string,
    fileExtensionForMetadata: string
  ) {
    const name = Path.basename(directory);

    //if the metadata file doesn't yet exist, just make an empty one.
    const metadataPath = Path.join(directory, name + fileExtensionForMetadata);
    if (!fs.existsSync(metadataPath)) {
      fs.writeFileSync(metadataPath, `<${xmlRootName}/>`);
    }
    super(metadataPath, metadataPath, xmlRootName, fileExtensionForMetadata);
  }
}
export class OtherFile extends File {
  constructor(path: string) {
    super(path, path + ".meta", "Meta", ".meta");
  }
}
