import * as React from "react";
import { Trans } from "@lingui/macro";
import { observer } from "mobx-react";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { Field } from "../../model/field/Field";
import { Dictionary } from "typescript-collections";
import { TextFieldEdit } from "../TextFieldEdit";
import "./AccessProtocolForm.scss";
import { runInAction } from "mobx";

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
doc.setValue("paradisec", require("./AccessProtocolDocumenation/paradisec.md"));

interface IProps {
  protocolField: Field;
  customChoicesField: Field;
  authorityLists: AuthorityLists;
}

class AccessProtocolForm extends React.Component<IProps> {
  public render() {
    const protocol = this.props.protocolField.text.toLowerCase();
    let documentationHtml = doc.getValue(protocol);
    if (documentationHtml === undefined) {
      documentationHtml = ""; // will be empty for CUSTOM
    }
    const customStuff =
      protocol === "custom" ? (
        <div>
          <h4>
            <Trans>Custom Access Choices</Trans>
          </h4>
          <p>
            <Trans>Enter each choice, separated by commas</Trans>
          </p>
          <TextFieldEdit field={this.props.customChoicesField} />
        </div>
      ) : undefined;

    return (
      <div className={"field access-protocol"}>
        <label>{this.props.protocolField.labelInUILanguage} </label>
        <div className={"controls"}>
          <select
            name={this.props.protocolField.labelInUILanguage} //what does this do? Maybe accessibility?
            value={this.props.protocolField.text}
            onChange={(event) => {
              runInAction(() => {
                this.props.protocolField.text = event.currentTarget.value;
              });
            }}
          >
            {
              //NB: an error about keys here means that the choices were not unique
              this.props.authorityLists.accessProtocolChoices.map((s) => (
                <option key={s.protocol}>{s.protocol}</option>
              ))
            }
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
const x = observer(AccessProtocolForm);
export { x as AccessProtocolForm };
