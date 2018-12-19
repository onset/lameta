import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../model/field/Field";
// tslint:disable-next-line:no-duplicate-imports
import ReactSelectClass from "react-select";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { Trans } from "@lingui/react";
import { translateAccessProtocol } from "../../localization";

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
        label:
          translateAccessProtocol(c.label) +
          (c.description.length > 0
            ? ":  " + c.description // not localized yet
            : "")
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
