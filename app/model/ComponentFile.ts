import * as fs from "fs";
import * as Path from "path";
import * as filesize from "filesize";
import { observable } from "mobx";
import { Polytext } from "./BaseModel";
import { Dictionary } from "typescript-collections";

export class ComponentFile {
  @observable public properties = new Dictionary<string, Polytext>();

  get type(): string {
    const x = this.properties.getValue("type");
    return x ? x.english : "???";
  }
  public constructor(path: string) {
    this.properties.setValue("name", new Polytext("name", Path.basename(path)));
    const stats = fs.statSync(path);
    this.properties.setValue(
      "size",
      new Polytext("size", filesize(stats.size, { round: 0 }))
    );
    this.properties.setValue(
      "date",
      new Polytext("date", stats.mtime.toDateString())
    ); //todo
    //{"session"}

    const typePatterns = [
      ["Session", /\.session$/],
      ["Audio", /\.((mp3)|(wav)|(ogg))$/],
      ["Image", /\.(jpg)|(bmp)|(gif)/]
    ];
    typePatterns.forEach(t => {
      if (path.match(t[1])) {
        this.properties.setValue("type", new Polytext("type", t[0] as string));
        //break;  alas, there is no break as yet.
      }
    });

    this.ComputeProperties(); //enhance: do this on demand, instead of for every file
  }

  public loadFromObject(data: any) {
    const keys = Object.keys(data);

    for (const key of keys) {
      const p = new Polytext(key, data[key]);
      this.properties.setValue(key, p);
    }
  }

  public ComputeProperties() {
    switch (this.type) {
      case "Audio":
        this.properties.setValue(
          "duration",
          new Polytext("duration", "pretend")
        );
        break;
    }
  }
}
