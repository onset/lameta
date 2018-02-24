import * as xml2js from "xml2js";
import * as fs from "fs";

const accessProtocols = require("./AccessProtocols/AccessProtocols.json");

export interface IChoice {
  id: string;
  label: string;
  description: string;
}
export interface IAccessProtocolChoice {
  protocol: string;
  description: string;
  choices: IChoice[];
}

export class AuthorityLists {
  public accessProtocolChoices: IAccessProtocolChoice[];
  public accessChoices: IChoice[];
  public roleChoices: IChoice[];

  public constructor() {
    this.accessProtocolChoices = accessProtocols;
    this.accessChoices = [];
    this.loadRoles();
  }

  public setAccessProtocol(protocolName: string, customChoices: string) {
    if (protocolName === "custom") {
      // tslint:disable-next-line:arrow-return-shorthand
      this.accessChoices = customChoices.split(",").map(c => {
        return { id: c, label: c, description: "" };
      });
    } else {
      const protocol = accessProtocols.find(
        (o: any) => o.protocol === protocolName
      );
      this.accessChoices = protocol ? protocol.choices : [];
    }
  }

  private loadRoles() {
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
    this.roleChoices = xmlAsObject.OLAC_doc.body.section[1].term.map(
      (t: any) => ({ id: t.code, label: t.name, description: t.definition })
    );

    //xmlAsObject[Object.keys(xmlAsObject)[0]];
  }
}
