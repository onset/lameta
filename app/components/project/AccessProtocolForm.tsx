import * as React from "react";
import { observer } from "mobx-react";
import { Project } from "../../model/Project/Project";
//import { DocumentsPane } from "./DocumentsPane";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import AutoForm from "../AutoForm";
import { FolderPane } from "../FolderPane";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { Field } from "../../model/field/Field";
import { Dictionary } from "typescript-collections";
import TextFieldEdit from "../TextFieldEdit";

// enhance: this is kinda lame... we could do this dynamically after we
// figure out how to get certain the files packaged and accessible at runtime.
// Doing it this way, it's taken care of by webpack at build time.
// Also, it's lame to have all this html, but I got it free from the c# saymore.
// Should re-do as markdown or just build required fields into the
// main AccessProtocols.json file.
const doc: Dictionary<string, string> = new Dictionary<string, string>();
doc.setValue("ailca", require("./AccessProtocolDocumenation/ailca.md"));
doc.setValue("ailla", require("./AccessProtocolDocumenation/ailla.md"));
doc.setValue("anla", require("./AccessProtocolDocumenation/anla.md"));
doc.setValue("elar", require("./AccessProtocolDocumenation/elar.md"));
doc.setValue("reap", require("./AccessProtocolDocumenation/reap.md"));
doc.setValue("tla", require("./AccessProtocolDocumenation/tla.md"));

interface IProps {
  protocolField: Field;
  customChoicesField: Field;
  authorityLists: AuthorityLists;
}

@observer
export class AccessProtocolForm extends React.Component<IProps> {
  public render() {
    const protocol = this.props.protocolField.text.toLowerCase();
    const documentationHtml = doc.getValue(protocol);

    const customStuff =
      protocol === "custom" ? (
        <div>
          <h4>Custom Access Choices</h4>
          <p>Enter each choice, separated by commas</p>
          <TextFieldEdit field={this.props.customChoicesField} />
        </div>
      ) : (
        undefined
      );

    return (
      <div className={"field access-protocol"}>
        <label>{this.props.protocolField.englishLabel} </label>
        <div className={"controls"}>
          <select
            name={this.props.protocolField.englishLabel} //what does this do? Maybe accessibility?
            value={this.props.protocolField.text}
            onChange={event => {
              this.props.protocolField.text = event.currentTarget.value;
            }}
          >
            {//NB: an error about keys here means that the choices were not unique
            this.props.authorityLists.accessProtocolChoices.map(s => (
              <option key={s.protocol}>{s.protocol}</option>
            ))}
            <option key={"Custom"} value="custom">
              {"Custom"}
            </option>
          </select>
          <div
            className={"protocol-documentation"}
            dangerouslySetInnerHTML={{ __html: documentationHtml }}
          />
          {customStuff}
        </div>
      </div>
    );
  }
}
