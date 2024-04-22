import * as fs from "fs-extra";
import JSON5 from "json5";
import * as xml2js from "xml2js";
import { IChoice } from "../../field/Field";

export interface IAccessProtocolChoice {
  protocol: string;
  description?: string;
  choices: IChoice[];
}

export class AuthorityLists {
  public getPeopleNames: () => IChoice[];
  public accessProtocolLists: {
    archiveConfigurationName: string;
    choices: IChoice[];
  }[] = [];
  public accessProtocolChoices: IAccessProtocolChoice[];
  public accessChoicesOfCurrentProtocol: IChoice[];
  public roleChoices: IChoice[];
  public archiveConfigurationChoices: IChoice[];

  public constructor(getPersons: () => IChoice[]) {
    this.getPeopleNames = getPersons;

    this.accessChoicesOfCurrentProtocol = [];
    this.roleChoices = loadOLACRoles();

    this.archiveConfigurationChoices = [];
    const path = locateDependencyForFilesystemCall("archive-configurations");
    fs.readdirSync(path).forEach((directoryName) => {
      // "lameta" is a special case that you can't choose
      if (directoryName === "lameta") {
        return;
      }
      // if the file is not a directory, skip it
      if (!fs.lstatSync(`${path}/${directoryName}`).isDirectory()) {
        return;
      }
      // read in description from the settings.json5 file in the directory, the institutionNaem field
      let description = "";
      let settings: any = {};
      if (fs.existsSync(`${path}/${directoryName}/settings.json5`)) {
        const settingsText = fs.readFileSync(
          `${path}/${directoryName}/settings.json5`,
          "utf8"
        );
        settings = JSON5.parse(settingsText);
        description = settings.configurationFullName || "??";
        delete settings.configurationFullName;
      }

      this.archiveConfigurationChoices.push({
        id: directoryName,
        label: directoryName,
        description: description,
        extra: settings
      });
      // read in vocabularies.json5 from the directory, parse it, and add the accessProtocol member to the accessProtocolChoices array
      const vocabulariesText = fs.readFileSync(
        `${path}/${directoryName}/vocabularies.json5`
      );
      const vocabularies = JSON5.parse(vocabulariesText.toString());
      if (vocabularies.accessProtocol) {
        this.accessProtocolLists.push({
          archiveConfigurationName: directoryName,

          choices: vocabularies.accessProtocol
        });
      }
    });
    this.archiveConfigurationChoices.push({
      id: "default",
      label: "Other",
      description: ""
    });
  }

  public setAccessProtocol(protocolName: string, customChoices: string) {
    if (
      protocolName === "custom" /* lameta <3.0 */ ||
      protocolName === "default"
    ) {
      // tslint:disable-next-line:arrow-return-shorthand
      this.accessChoicesOfCurrentProtocol = customChoices
        .split(",")
        .map((c) => {
          return { id: c.trim(), label: c.trim(), description: "" };
        });
    } else {
      const protocol = this.accessProtocolLists.find(
        (o: any) => o.archiveConfigurationName === protocolName
      );
      this.accessChoicesOfCurrentProtocol = protocol
        ? (protocol.choices as unknown as IChoice[])
        : [];
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
  //   private convertAccessProtocolsToCSVForLocalization() {
  //     (accessProtocols as unknown as IAccessProtocolChoice[]).forEach((p) => {
  //       console.log(`"${p.protocol}", "Access Protocol Name", "${p.protocol}"`);
  //       p.choices.forEach((c) => {
  //         console.log(
  //           `"${p.protocol}.${c.label}", "${p.protocol} choice", "${c.label}"`
  //         );
  //         console.log(
  //           `"${p.protocol}.${c.label}", "Description of ${p.protocol} choice '${c.label}'", "${c.description}"`
  //         );
  //       });
  //     });
  //   }
  // }
}

import olacRolesRawq from "./olac-roles.xml?raw";
import { locateDependencyForFilesystemCall } from "../../../other/locateDependency";
export function loadOLACRoles(): IChoice[] {
  const xml: string = olacRolesRawq;

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
    description: t.definition
  }));

  //xmlAsObject[Object.keys(xmlAsObject)[0]];
}
