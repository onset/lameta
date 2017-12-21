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

// enhance: this is kinda lame... we could do this dynamically after we
// figure out how to get certain the files packaged and accessible at runtime.
// Doing it this way, it's taken care of by webpack at build time.
// Also, it's lame to have all this html, but I got it free from the c# saymore.
// Should re-do as markdown or just build required fields into the
// main AccessProtocols.json file.
const doc: Dictionary<string, string> = new Dictionary<string, string>();
doc.setValue("ailca", require("./AccessProtocolDocumenation/ailca.html"));
doc.setValue("ailla", require("./AccessProtocolDocumenation/ailla.html"));
doc.setValue("anla", require("./AccessProtocolDocumenation/anla.html"));
doc.setValue("elar", require("./AccessProtocolDocumenation/elar.html"));
doc.setValue("reap", require("./AccessProtocolDocumenation/reap.html"));
doc.setValue("tla", require("./AccessProtocolDocumenation/tla.html"));

interface IProps {
  field: Field;
  authorityLists: AuthorityLists;
}

@observer
export class AccessProtocolForm extends React.Component<IProps> {
  public render() {
    const documentationHtml = doc.getValue(this.props.field.text.toLowerCase());

    return (
      <div>
        <select
          name={this.props.field.englishLabel} //what does this do? Maybe accessibility?
          value={this.props.field.text}
          onChange={event => {
            this.props.field.text = event.currentTarget.value;
          }}
        >
          {//NB: an error about keys here means that the choices were not unique
          this.props.authorityLists.accessProtocolChoices.map(s => (
            <option key={s.protocol}>{s.protocol}</option>
          ))}
        </select>
        <div dangerouslySetInnerHTML={{ __html: documentationHtml }} />
      </div>
    );
  }
}
