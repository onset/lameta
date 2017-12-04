import * as fs from "fs";
import * as Path from "path";
import * as filesize from "filesize";
import { observable } from "mobx";
import { Field, TextField, DateField } from "./Fields";
import { Dictionary } from "typescript-collections";
import * as assert from "assert";

// tslint:disable-next-line:no-empty-interface
export class FieldSet extends Dictionary<string, Field> {}

export class ComponentFile {
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
  protected addTextProperty(key: string, value: string) {
    this.properties.setValue(key, new TextField(key, value));
  }

  public getTextField(key: string): TextField {
    return this.properties.getValue(key) as TextField;
  }
  public getDateField(key: string): DateField {
    return this.properties.getValue(key) as DateField;
  }

  public constructor(path: string) {
    this.addTextProperty("name", Path.basename(path));
    this.addTextProperty("notes", "");

    const stats = fs.statSync(path);
    this.addTextProperty("size", filesize(stats.size, { round: 0 }));
    this.addDateProperty("date", stats.mtime);

    const typePatterns = [
      ["Session", /\.session$/],
      ["Audio", /\.((mp3)|(wav)|(ogg))$/],
      ["Image", /\.(jpg)|(bmp)|(gif)/]
    ];
    typePatterns.forEach(t => {
      if (path.match(t[1])) {
        this.addTextProperty("type", t[0] as string);
        //break;  alas, there is no break as yet.
      }
    });

    this.ComputeProperties(); //enhance: do this on demand, instead of for every file
  }

  public loadFromObject(data: any) {
    const keys = Object.keys(data);

    for (const key of keys) {
      // if it's already defined, let the existing field parse this into whatever structure (e.g. date)
      if (this.properties.containsKey(key)) {
        const v = this.properties.getValue(key);
        v.setValueFromString(data[key]);
      } else {
        // otherwise treat it as a string
        const textField = new TextField(key, data[key]);
        this.properties.setValue(key, textField);
      }
    }
  }

  public ComputeProperties() {
    switch (this.type) {
      case "Audio":
        this.addTextProperty("duration", "pretend");
        break;
    }
  }
}
