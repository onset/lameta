import * as fs from "fs";
import * as Path from "path";
import * as filesize from "filesize";
import { observable } from "mobx";
import { Field, TextField, DateField } from "./Field";
import { Dictionary } from "typescript-collections";
import * as assert from "assert";
import * as imagesize from "image-size";
import * as musicmetadata from "musicmetadata";

// tslint:disable-next-line:no-empty-interface
export class FieldSet extends Dictionary<string, Field> {}

export class File {
  protected fullpath: string;
  public get path(): string {
    return this.fullpath;
  }

  @observable public properties = new FieldSet();

  get type(): string {
    const x = this.properties.getValue("type") as TextField;
    return x ? x.english : "???";
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
    this.properties.setValue(key, new DateField(key, date));
  }
  public addTextProperty(key: string, value: string) {
    this.properties.setValue(key, new TextField(key, value));
    console.log("Adding " + key + "=" + value);
  }

  public getTextField(key: string): TextField {
    return this.properties.getValue(key) as TextField;
  }
  public getDateField(key: string): DateField {
    return this.properties.getValue(key) as DateField;
  }

  public constructor(path: string) {
    this.fullpath = path;
    this.addTextProperty("name", Path.basename(path));
    this.addTextProperty("notes", "");

    const stats = fs.statSync(path);
    this.addTextProperty("size", filesize(stats.size, { round: 0 }));
    this.addDateProperty("date", stats.mtime);

    const typePatterns = [
      ["Session", /\.session$/i],
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

    this.ComputeProperties(); //enhance: do this on demand, instead of for every file

    // TODO read the .meta file that describes this file, if it exists
  }

  public loadProperties(properties: any) {
    const keys = Object.keys(properties);

    for (const key of keys) {
      const t = properties[key]._text;
      // if it's already defined, let the existing field parse this into whatever structure (e.g. date)
      if (this.properties.containsKey(key)) {
        const v = this.properties.getValue(key);
        v.setValueFromString(t);
      } else {
        console.log("extra");
        // otherwise treat it as a string
        this.addTextProperty(key, t);
      }
    }
  }

  public ComputeProperties() {
    switch (this.type) {
      case "Audio":
        if (this.path.match(/\.((mp3)|(ogg))$/i)) {
          musicmetadata(fs.createReadStream(this.path), (err, metadata) => {
            if (err) {
              console.log("Error:" + err.message);
            }
            this.addTextProperty(
              "duration",
              err ? "????" : metadata.duration.toString() // <-- haven't see this work yet. I think we'll give in and ship with ffmpeg eventually
            );
            // todo bit rate & such, which musicmetadata doesn't give us
          });
        }
        break;
      case "Image":
        const dimensions = imagesize(this.path);
        this.addTextProperty("width", dimensions.width.toString());
        this.addTextProperty("height", dimensions.height.toString());
        break;
    }
  }
}
