import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../model/field/Field";
import { Creatable, Option, OptionValues } from "react-select";
// tslint:disable-next-line:no-duplicate-imports
import ReactSelectClass from "react-select";
import { observable } from "mobx";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { Trans } from "@lingui/react";

const titleCase = require("title-case");

export interface IProps {
  field: Field;
  authorityLists: AuthorityLists;
}

@observer
export default class AccessChooser extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    const options = this.props.authorityLists.accessChoices.map(c => {
      return new Object({
        value: c.label,
        label: c.label + (c.description.length > 0 ? ":  " + c.description : "")
      });
    });

    return (
      <div className={"field access-chooser"}>
        <label>
          <Trans>Access</Trans>
        </label>
        <ReactSelectClass
          name={this.props.field.englishLabel}
          value={this.props.field.text}
          onChange={(s: any) => {
            this.props.field.text = (s && s.value ? s.value : "") as string;
          }}
          options={options}
        />
      </div>
    );
  }
}
