const accessProtocols = require("./AccessProtocols/AccessProtocols.json");

export interface IAccessChoice {
  label: string;
  description: string;
}
export interface IAccessProtocolChoice {
  protocol: string;
  description: string;
  choices: IAccessChoice[];
}

export class AuthorityLists {
  public accessProtocolChoices: IAccessProtocolChoice[];
  public accessChoices: IAccessChoice[];

  public constructor() {
    this.accessProtocolChoices = accessProtocols;
    this.accessChoices = [];
  }

  public setAccessProtocol(protocolName: string, customChoices: string) {
    if (protocolName === "custom") {
      // tslint:disable-next-line:arrow-return-shorthand
      this.accessChoices = customChoices.split(",").map(c => {
        return { label: c, description: "" };
      });
    } else {
      const protocol = accessProtocols.find(
        (o: any) => o.protocol === protocolName
      );
      this.accessChoices = protocol.choices;
    }
  }
}
