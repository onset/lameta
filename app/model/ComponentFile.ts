import * as fs from "fs";
import * as Path from "path";
import * as filesize from "filesize";
import { observable } from "mobx";
import { Polytext } from "./BaseModel";

export class ComponentFile {
  @observable public properties: Polytext[] = new Array<Polytext>();
  public name: string;
  public type: string = "";
  public date: Date;
  public size: string;
  [key: string]: any;
  public get(key: string): string {
    return this[key].toString();
  }
  public constructor(path: string) {
    this.name = Path.basename(path);
    const stats = fs.statSync(path);
    this.size = filesize(stats.size, { round: 0 });
    this.date = stats.mtime;

    //{"session"}

    const typePatterns = [
      ["Session", /\.session$/],
      ["Audio", /\.((mp3)|(wav)|(ogg))$/],
      ["Image", /\.(jpg)|(bmp)|(gif)/]
    ];
    typePatterns.forEach(t => {
      if (this.name.match(t[1])) {
        this.type = t[0] as string;
        //break;  alas, there is no break as yet.
      }
    });

    this.ComputeProperties(); //enhance: do this on demand, instead of for every file
  }

  public ComputeProperties() {
    this.properties.push(new Polytext("name", this.name));
    switch (this.type) {
      case "Audio":
        this.properties.push(new Polytext("duration", "pretend"));
        break;
    }
  }
}
