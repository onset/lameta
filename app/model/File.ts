import * as xml2js from "xml2js";
import * as fs from "fs";
import * as Path from "path";
import * as filesize from "filesize";
import { observable } from "mobx";
import * as assert from "assert";
import * as camelcase from "camelcase";
import * as imagesize from "image-size";
import * as musicmetadata from "musicmetadata";
import { Field, FieldType } from "./field/Field";
import { FieldSet } from "./field/FieldSet";
import * as xmlbuilder from "xmlbuilder";

export class File {
  protected fullpath: string;
  public get path(): string {
    return this.fullpath;
  }

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
    this.fullpath = path;
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

    if (fs.existsSync(path + ".meta")) {
      this.readMetadataFile(path + ".meta");
    }
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
          console.log(
            "Skippping " + key + " which was " + JSON.stringify(value)
          );
          continue;
        }
      }
      const fixedKey = camelcase(key);
      // if it's already defined, let the existing field parse this into whatever structure (e.g. date)
      if (this.properties.containsKey(fixedKey)) {
        const v = this.properties.getValue(fixedKey);
        v.setValueFromString(value);
      } else {
        console.log("extra");
        // otherwise treat it as a string
        this.addTextProperty(fixedKey, value);
      }
    }
  }

  public computeProperties() {
    switch (this.type) {
      case "Audio":
        if (this.path.match(/\.((mp3)|(ogg))$/i)) {
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
        const dimensions = imagesize(this.path);
        this.addTextProperty("width", dimensions.width.toString());
        this.addTextProperty("height", dimensions.height.toString());
        break;
    }
  }
  public readMetadataFile(path: string) {
    const xml: string = fs.readFileSync(path, "utf8");

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
    const root = xmlbuilder.create("Blah")
                    .element("notes", this.getTextProperty("notes"))
                        
                        .up();

    const xml = root.end({ pretty: true });
    console.log(xml);
    fs.writeFileSync(this.path + "meta", xml);
  }
}
