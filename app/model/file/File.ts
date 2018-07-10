import * as xml2js from "xml2js";
import * as fs from "fs";
import * as Path from "path";
//import * as filesize from "filesize";
const filesize = require("filesize");
import * as mobx from "mobx";
import * as assert from "assert";
const camelcase = require("camelcase");
const imagesize = require("image-size");
import * as musicmetadata from "musicmetadata";
import { Field, FieldType } from "../field/Field";
import { FieldSet } from "../field/FieldSet";
import * as xmlbuilder from "xmlbuilder";
import { locate } from "../../crossPlatformUtilities";
const nodejsUtil = require("util");
const moment = require("moment");

///export  enum Type {Project, Session, Person, Other }

export class Contribution {
  //review this @mobx.observable
  @mobx.observable public name: string;
  @mobx.observable public role: string;
  @mobx.observable public date: string;
  @mobx.observable public comments: string;
}

export abstract class File {
  // can be changed to Session, Project, or Person in constructor
  //protected xmlRootName: string = "MetaData";

  // In the case of folder objects (project, session, people) this will just be the metadata file,
  // and so describedFilePath === metadataPath.
  // In all other cases (mp3, jpeg, elan, txt), this will be the file we are storing metadata about.
  public describedFilePath: string;

  // This file can be *just* metadata for a folder, in which case it has the fileExtensionForFolderMetadata.
  // But it can also be paired with a file in the folder, such as an image, sound, video, elan file, etc.,
  // in which case the metadata will be stored in afile with the same name as the described file, but
  // with an extension of ".meta", as in "banquet.jpg.meta";
  public metadataFilePath: string;

  private xmlRootName: string;
  private fileExtensionForMetadata: string;

  @mobx.observable public properties = new FieldSet();

  @mobx.observable public contributions = new Array<Contribution>();

  get type(): string {
    const x = this.properties.getValue("type") as Field;
    return x ? x.text : "???";
  }
  private checkType(key: string, value: any) {
    if (this.properties.containsKey(key)) {
      const a = typeof this.properties.getValueOrThrow(key);
      const b = typeof value;
      assert.ok(a === b, `Cannot change type of ${key} from ${a} to ${b}`);
    }
  }
  protected addDatePropertyFromString(key: string, dateString: string) {
    // get a little paranoid with the date format
    assert.ok(moment(dateString).isValid()); //todo: handle bad data
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
    assert.ok(value === this.properties.getTextField(key).text);
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
    try {
      const p = this.properties.getValueOrThrow(key); //as Field;
      return p.text;
    } catch {
      return ifMissing;
    }
  }

  public getTextField(key: string): Field {
    return this.properties.getValueOrThrow(key) as Field;
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
      ["ELAN", /\.((eaf))$/i],
      ["Image", /\.(jpg)|(bmp)|(gif)|(png)/i],
      ["Text", /\.(txt)/i]
    ];
    const match = typePatterns.find(t => {
      return !!describedFilePath.match(t[1]);
    });
    const typeName = match
      ? (match[0] as string)
      : Path.extname(describedFilePath);

    this.addTextProperty("type", typeName, false);
    this.readMetadataFile();

    this.computeProperties(); //enhance: do this on demand, instead of for every file
    // TODO read the .meta file that describes this file, if it exists
  }

  private loadProperties(propertiesFromXml: any) {
    const keys = Object.keys(propertiesFromXml);

    for (const key of keys) {
      if (key === "contributions") {
        this.loadContributions(propertiesFromXml[key]);
      } else {
        //console.log("loadProperties key: " + key);
        let value = propertiesFromXml[key];
        if (value === undefined) {
          value = "";
        } else if (typeof value === "object") {
          if (value.$ && value.$.type && value.$.type === "string") {
            value = value._;
          } else {
            console.log(
              "Skippping " + key + " which was " + JSON.stringify(value)
            );
            continue;
          }
        }
        const textValue: string = value;
        const fixedKey = camelcase(key);
        // if it's already defined, let the existing field parse this into whatever structure (e.g. date)
        if (this.properties.containsKey(fixedKey)) {
          const v = this.properties.getValueOrThrow(fixedKey);
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
  }

  private loadContributions(contributionsFromXml: any) {
    if (!contributionsFromXml.contributor) {
      return;
    }
    if (Array.isArray(contributionsFromXml.contributor)) {
      for (const c of contributionsFromXml.contributor) {
        this.loadOneContribution(c);
      }
    } else {
      this.loadOneContribution(contributionsFromXml.contributor);
    }
  }
  private loadOneContribution(contributionFromXml: any) {
    const n = new Contribution();
    n.name = contributionFromXml.name;
    n.role = contributionFromXml.role;
    n.date = contributionFromXml.date;
    n.comments = contributionFromXml.comments;
    this.contributions.push(n);
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
      {
        async: false,
        explicitArray: false //this is good for most things, but if there are sometimes 1 and sometime multiple (array), you have to detect the two scenarios
        //explicitArray: true, this also just... gives you a mess
        //explicitChildren: true this makes even simple items have arrays... what a pain
      },
      (err, result) => {
        if (err) {
          throw err;
        }
        xmlAsObject = result;
      }
    );
    // that will have a root with one child, like "Session" or "Meta". Zoom in on that
    // so that we just have the object with its properties.
    let properties = xmlAsObject[Object.keys(xmlAsObject)[0]];
    if (properties === "") {
      //   Review: This happen if it finds, e.g. <Session/>.
      properties = {};
    }
    // else {
    //   properties = properties.$$; // this is needed if xml2js.parstring() has explicitChildren:true
    // }

    //copies from this object (which is just the xml as an object) into this File object
    this.loadProperties(properties);
    //review: this is looking kinda ugly... not sure what I want to do
    // because contributions is only one array at the moment
    this.properties.addContributionArrayProperty(
      "contributions",
      this.contributions
    );

    this.watchForChange = mobx.reaction(
      // Function to check for a change. Mobx looks at its result, and if it is different
      // than the first run, it will call the second function.
      () => {
        return this.getXml();
      },
      // Function fires when a change is detected
      () => this.changed()
    );
  }

  private getXml(): string {
    const root = xmlbuilder.create(this.xmlRootName, {
      version: "1.0",
      encoding: "utf-8"
    });
    this.properties.forEach((k, f: Field) => {
      if (f.persist) {
        if (f.key === "contributions") {
          const contributionsElement = root.element("contributions", {
            type: "xml"
          });
          this.contributions.forEach(contribution => {
            if (contribution.name && contribution.name.trim().length > 0) {
              let tail = contributionsElement.element("contributor");
              if (contribution.name) {
                //console.log("zzzzz:" + contribution.name);
                tail = tail.element("name", contribution.name).up();
              }
              if (contribution.role) {
                tail = tail.element("role", contribution.role).up();
              }
              this.writeDate(tail, contribution.date);
              if (
                contribution.comments &&
                contribution.comments.trim().length > 0
              ) {
                tail = tail.element("comments", contribution.comments).up();
              }
            }
          });
        } else {
          const t = f.typeAndValueForXml();
          //console.log(k + " is a " + t[0] + " of value " + t[1]);
          if (t[0] === "date") {
            this.writeDate(root, t[1]);
          } else {
            assert.ok(
              k.indexOf("date") === -1 || t[0] === "date",
              "SHOULDN'T " + k + " BE A DATE?"
            );
            if (t[1].length > 0) {
              root.element(k, { type: t[0] }, t[1]).up();
            }
          }
        }
      }
    });

    return root.end({ pretty: true, indent: "  " });
  }

  private writeDate(
    builder: xmlbuilder.XMLElementOrXMLNode,
    dateString: string
  ): xmlbuilder.XMLElementOrXMLNode {
    const ISO_YEAR_MONTH_DATE_DASHES_FORMAT = "YYYY-MM-DD";
    if (dateString) {
      if (moment(dateString).isValid()) {
        const d = moment(dateString);
        return builder
          .element(
            "date",
            { type: "date" },
            d.format(ISO_YEAR_MONTH_DATE_DASHES_FORMAT)
          )
          .up();
      }
    }
    return builder; // we didn't write anything
  }
  public save() {
    // console.log("SAVING DISABLED");
    // return;

    if (!this.dirty) {
      //console.log(`skipping save of ${this.metadataFilePath}, not dirty`);
      return;
    }
    console.log(`Saving ${this.metadataFilePath}`);

    const xml = this.getXml();

    if (this.describedFilePath.indexOf("sample data") > -1) {
      // console.log(
      //   "PREVENTING SAVING IN DIRECTORY THAT CONTAINS THE WORDS 'sample data'"
      // );
      console.log("WOULD HAVE SAVED THE FOLLOWING TO " + this.metadataFilePath);
      // console.log(xml);
    } else {
      //console.log("writing:" + xml);
      fs.writeFileSync(this.metadataFilePath, xml);
      this.clearDirty();
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
    const hasSeparateMetaDataFile =
      this.metadataFilePath !== this.describedFilePath;
    if (hasSeparateMetaDataFile && fs.existsSync(this.metadataFilePath)) {
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
    if (!hasSeparateMetaDataFile) {
      this.metadataFilePath = this.describedFilePath;
    }
    this.properties.setText("filename", Path.basename(this.describedFilePath));
  }

  /* ----------- Change Detection -----------
    Enhance: move to its own class
  */

  private watchForChange: mobx.IReactionDisposer;

  //does this need to be saved?
  private dirty: boolean;
  public isDirty(): boolean {
    return this.dirty;
  }

  // This is/was called whenever a UI shows that has user-changable things.
  // I did this before setting up the mobx.reaction system to actually notice
  // when something changes. Leaving it around, made to do nothing, until I gain
  // confidence in the new system.
  public couldPossiblyBecomeDirty() {
    if (this.dirty) {
      //console.log(`Already dirty: ${this.metadataFilePath}`);
    } else {
      //console.log(`Considered dirty: ${this.metadataFilePath}`);
    }
    //this.dirty = true;
  }
  private clearDirty() {
    this.dirty = false;
    console.log("dirty cleared " + this.metadataFilePath);
  }

  private changed() {
    if (this.dirty) {
      //console.log("changed() but already dirty " + this.metadataFilePath);
    } else {
      this.dirty = true;
      console.log(`Changed and now dirty: ${this.metadataFilePath}`);
    }
  }

  public getIconName(): string {
    const type = this.getTextProperty("type", "unknowntype");
    return locate(`assets/file-icons/${type}.png`);
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
