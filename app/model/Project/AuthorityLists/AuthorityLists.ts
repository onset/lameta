import * as xml2js from "xml2js";
import { IChoice } from "../../field/Field";

const accessProtocols = require("./AccessProtocols/AccessProtocols.json");

export interface IAccessProtocolChoice {
  protocol: string;
  description: string;
  choices: IChoice[];
}

export class AuthorityLists {
  public getPeopleNames: () => string[];
  public accessProtocolChoices: IAccessProtocolChoice[];
  public accessChoices: IChoice[];
  public roleChoices: IChoice[];

  public constructor(getPersons: () => string[]) {
    this.getPeopleNames = getPersons;
    this.accessProtocolChoices = accessProtocols;
    this.accessChoices = [];
    this.roleChoices = loadOLACRoles();
  }

  public setAccessProtocol(protocolName: string, customChoices: string) {
    if (protocolName === "custom") {
      // tslint:disable-next-line:arrow-return-shorthand
      this.accessChoices = customChoices.split(",").map((c) => {
        return { id: c, label: c, description: "" };
      });
    } else {
      const protocol = accessProtocols.find(
        (o: any) => o.protocol === protocolName
      );
      this.accessChoices = protocol ? protocol.choices : [];
    }
  }

  // Was just run once then copied/pasted into AccessProtocols.json. See Readme-l10n
  private convertRolesToCSVForLocalization() {
    this.roleChoices.forEach((p) => {
      console.log(`"role.label.${p.id}", "Contributor Role", "${p.label}"`);
      console.log(
        `"role.description.${p.id}", "Description of contributor role '${p.label}'", "${p.description}"`
      );
    });
  }

  public static convertGenresToCSVForLocalization(genres: any[]) {
    genres.forEach((g) => {
      console.log(`"Genre which is: ${g.definition}", "${g.label}"`);
      console.log(`"Definition of genre '${g.label}'", "${g.definition}"`);
      g.examples.forEach((e) =>
        console.log(`"Example of genre '${g.label}'", "${e}"`)
      );
    });
  }

  // Was just run once then copied/pasted into AccessProtocols.json. See Readme-l10n
  private convertAccessProtocolsToCSVForLocalization() {
    (accessProtocols as IAccessProtocolChoice[]).forEach((p) => {
      console.log(`"${p.protocol}", "Access Protocol Name", "${p.protocol}"`);
      p.choices.forEach((c) => {
        console.log(
          `"${p.protocol}.${c.label}", "${p.protocol} choice", "${c.label}"`
        );
        console.log(
          `"${p.protocol}.${c.label}", "Description of ${p.protocol} choice '${c.label}'", "${c.description}"`
        );
      });
    });
  }
}

export function loadOLACRoles(): IChoice[] {
  const xml: string = require("./olac-roles.xml");

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
  return xmlAsObject.OLAC_doc.body.section[1].term.map((t: any) => ({
    id: t.code,
    label: t.name,
    description: t.definition,
  }));

  //xmlAsObject[Object.keys(xmlAsObject)[0]];
}
