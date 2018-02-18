import { Session } from "../model/Project/Session/Session";
import * as builder from "xmlbuilder";
import { Project } from "../model/Project/Project";
const titleCase = require("title-case");
import { Moment } from "moment";
const moment = require("moment");

export default class ImdiCorpusGenerator {
  public static generate(project: Project): string {
    // prettier-ignore
    const root = builder.create("METATRANSCRIPT")
       .a("xmlns", "http://www.mpi.nl/IMDI/Schema/IMDI")
      .a("Date", moment(new Date()).format("YYYY-MM-DD"))
      .a("Originator","SayMore Mac")
      .a("Type", "CORPUS")

      .element("Corpus")
          .e("Name", titleCase(project.displayName)).up()
          .e("Title", project.displayName).up()
      .e("Description", project.properties.getTextStringOrEmpty("projectDescription")).up();

    for (const session of project.sessions) {
      root.element("CorpusLink", session.properties.getTextStringOrEmpty("id"));
    }

    return root.end({ pretty: true });
  }
}
