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
    this.setAccessProtocol("ELAR");
  }

  public setAccessProtocol(protocolName: string) {
    const protocol = accessProtocols.find(
      (o: any) => o.protocol === protocolName
    );
    this.accessChoices = protocol.choices;
  }
}
