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

///export  enum Type {Project, Session, Person, Other }

export abstract class File {
  // can be changed to Session, Project, or Person in constructor
  //protected xmlRootName: string = "MetaData";

  // project, sessions, and person folders have a single metdata file describing their contents, and this ends
  // in a special extension (.sprj, .session, .person)
  //protected fileExtensionForFolderMetadata: string;

  // In the case of folder objects (project, session, people) this will just be the metadata file,
  // and so describedFilePath === metadataPath.
  // In all other cases (mp3, jpeg, elan, txt), this will be the file we are storing metadata about.
  protected describedFilePath: string;

  // This file can be *just* metadata for a folder, in which case it has the fileExtensionForFolderMetadata.
  // But it can also be paired with a file in the folder, such as an image, sound, video, elan file, etc.,
  // in which case the metadata will be stored in afile with the same name as the described file, but
  // with an extension of ".meta", as in "banquet.jpg.meta";
  public abstract get metadataPath(): string;

  protected abstract xmlRootName(): string;
  protected abstract fileExtensionForMetadata(): string;

  @observable public properties = new FieldSet();

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
  protected addDateProperty(key: string, date: Date) {
    this.checkType(key, date);
    this.properties.setValue(
      key,
      new Field(key, FieldType.Text, date.toISOString())
    );
  }
  public addTextProperty(key: string, value: string) {
    //console.log("setting " + key + " to " + value);
    this.properties.setValue(key, new Field(key, FieldType.Text, value));
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
  public getTextProperty(key: string): string {
    const p = this.properties.getValue(key); //as Field;
    return p.text;
  }
  public getTextField(key: string): Field {
    return this.properties.getValue(key) as Field;
  }

  public constructor(path: string) {
    this.describedFilePath = path;
    this.addTextProperty("filename", Path.basename(path));
    this.addTextProperty("notes", "");

    const stats = fs.statSync(path);
    this.addTextProperty("size", filesize(stats.size, { round: 0 }));
    this.addDateProperty("date", stats.mtime);

    const typePatterns = [
      ["Session", /\.session$/i],
      ["Person", /\.person$/i],
      ["Audio", /\.((mp3)|(wav)|(ogg))$/i],
      ["Video", /\.((mp4))$/i],
      ["Image", /\.(jpg)|(bmp)|(gif)|(png)/i]
    ];
    typePatterns.forEach(t => {
      if (path.match(t[1])) {
        this.addTextProperty("type", t[0] as string);
        //break;  alas, there is no break as yet.
      }
    });

    this.readMetadataFile();

    this.computeProperties(); //enhance: do this on demand, instead of for every file

    // TODO read the .meta file that describes this file, if it exists
  }

  public loadProperties(properties: any) {
    const keys = Object.keys(properties);

    for (const key of keys) {
      let value = properties[key];
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
      const fixedKey = camelcase(key);
      // if it's already defined, let the existing field parse this into whatever structure (e.g. date)
      if (this.properties.containsKey(fixedKey)) {
        const v = this.properties.getValue(fixedKey);
        v.setValueFromString(value);
      } else {
        //console.log("extra");
        // otherwise treat it as a string
        this.addTextProperty(fixedKey, value);
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
    if (!fs.existsSync(this.metadataPath)) {
      return;
    }

    const xml: string = fs.readFileSync(this.metadataPath, "utf8");

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
    let json = `{"root":[`;
    this.properties.forEach((k, f: Field) => {
      json += "{" + f.stringify() + "},";
    });
    json = json.replace(/(,$)/g, ""); //remove trailing comma
    json += "]}";

    // prettier-ignore
    const root = xmlbuilder.create(this.xmlRootName())
                    .element("notes", this.getTextProperty("notes"))
                        .up();

    const xml = root.end({ pretty: true });
    if (this.describedFilePath.indexOf("sample data") > -1) {
      // console.log(
      //   "PREVENTING SAVING IN DIRECTORY THAT CONTAINS THE WORDS 'sample data'"
      // );
      // console.log("WOULD HAVE SAVED THE FOLLOWING TO " + this.metadataPath);
      // console.log(xml);
    } else {
      fs.writeFileSync(this.metadataPath, xml);
    }
  }
}

export class ProjectMetdataFile extends File {
  protected xmlRootName(): string {
    return "Project";
  }
  protected fileExtensionForMetadata(): string {
    return ".sprj";
  }
  public get metadataPath(): string {
    return this.describedFilePath;
  }
}
export class PersonMetdataFile extends File {
  protected xmlRootName(): string {
    return "Person";
  }
  protected fileExtensionForMetadata(): string {
    return ".person";
  }
  public get metadataPath(): string {
    return this.describedFilePath;
  }
}
export class SessionMetdataFile extends File {
  protected xmlRootName(): string {
    return "Session";
  }
  protected fileExtensionForMetadata(): string {
    return ".session";
  }
  public get metadataPath(): string {
    return this.describedFilePath;
  }
}
export class OtherMetdataFile extends File {
  protected xmlRootName(): string {
    return "Meta";
  }
  protected fileExtensionForMetadata(): string {
    return ".meta";
  }
  public get metadataPath(): string {
    return this.describedFilePath + ".meta";
  }
}
