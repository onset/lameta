import { Session } from "../model/Project/Session/Session";
import * as builder from "xmlbuilder";
import { Project } from "../model/Project/Project";

export default class ImdiExporter {
  public static export(project: Project) {
    const session = project.sessions[0];

    // prettier-ignore
    const root = builder.create("METATRANSCRIPT")
                .element("Session")
                    .e("Name", session.displayName).up()
                    .e("Title", session.properties.getTextStringOrEmpty("title")).up()
                    .e("Description", session.properties.getTextStringOrEmpty("description")).up()
                    .e("MDGroup")
                        .e("Location").up()
                        .e("Continent").up()
                    .up()
                    .e("Resources")
            .up()
          .up()

    return root.end({ pretty: true });
  }
}
