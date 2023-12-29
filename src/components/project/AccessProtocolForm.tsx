import { css } from "@emotion/react";
import * as React from "react";
import ReactMarkdown from "react-markdown";
import { Trans } from "@lingui/macro";
import { observer } from "mobx-react";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { Field } from "../../model/field/Field";
import { Dictionary } from "typescript-collections";
import { TextFieldEdit } from "../TextFieldEdit";
import "./AccessProtocolForm.scss";
import { runInAction } from "mobx";

import ailca from "./AccessProtocolDocumentation/ailca.md?raw";
import ailla from "./AccessProtocolDocumentation/ailla.md?raw";
import anla from "./AccessProtocolDocumentation/anla.md?raw";
import elar from "./AccessProtocolDocumentation/elar.md?raw";
import reap from "./AccessProtocolDocumentation/reap.md?raw";
import tla from "./AccessProtocolDocumentation/tla.md?raw";
import paradisec from "./AccessProtocolDocumentation/paradisec.md?raw";

// enhance: this is kinda lame... we could do this dynamically after we
// figure out how to get certain the files packaged and accessible at runtime.
// Doing it this way, it's taken care of by webpack at build time.
// Also, it's lame to have all this html, but I got it free from the c# saymore.
// Should re-do as markdown or just build required fields into the
// main AccessProtocols.json file.
const doc: Dictionary<string, string> = new Dictionary<string, string>();
doc.setValue("ailca", ailca);
doc.setValue("ailla", ailla);
doc.setValue("anla", anla);
doc.setValue("elar", elar);
doc.setValue("reap", reap);
doc.setValue("tla", tla);
doc.setValue("paradisec", paradisec);

interface IProps {
  protocolField: Field;
  customChoicesField: Field;
  authorityLists: AuthorityLists;
  onChange: () => void;
}

class AccessProtocolForm extends React.Component<IProps> {
  public render() {
    const protocol = this.props.protocolField.text.toLowerCase();
    let documentationMarkdown = doc.getValue(protocol);
    if (documentationMarkdown === undefined) {
      documentationMarkdown = ""; // will be empty for CUSTOM
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
      <div
        css={css`
          display: flex;
          flex-direction: row;
        `}
      >
        <label
          css={css`
            width: 120px;
            min-width: 120px;
          `}
        >
          {this.props.protocolField.labelInUILanguage}{" "}
        </label>
        <div
          css={css`
            margin-left: 20px;
          `}
        >
          <select
            name={this.props.protocolField.labelInUILanguage} //what does this do? Maybe accessibility?
            value={this.props.protocolField.text}
            onChange={(event) => {
              runInAction(() => {
                this.props.protocolField.text = event.currentTarget.value;
                this.props.onChange();
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

          <ReactMarkdown
            // note: the gfm plugin actually did worse that standard... it turned 2nd level bullets into <pre>
            css={css`
              max-width: 400px;
              h1 {
                font-size: 1em;
                font-weight: 700;
                margin-top: 1em;
              }
            `}
            children={documentationMarkdown}
          />

          {customStuff}
        </div>
      </div>
    );
  }
}
const x = observer(AccessProtocolForm);
export { x as AccessProtocolForm };
