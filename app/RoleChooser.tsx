import * as React from "react";
import { observer } from "mobx-react";
import { Creatable, Option, OptionValues } from "react-select";
// tslint:disable-next-line:no-duplicate-imports
import ReactSelectClass from "react-select";
import { observable } from "mobx";
import { IChoice } from "./model/Project/AuthorityLists/AuthorityLists";
import { Contribution } from "./model/file/File";

const titleCase = require("title-case");

export interface IProps {
  contribution: Contribution;
  choices: IChoice[];
}

@observer
export default class RoleChooser extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    const choices = this.props.choices ? this.props.choices : [];

    const options = choices.map(c => {
      return new Object({
        value: c.id,
        label: c.label,
        title: c.description
      });
    });

    return (
      <ReactSelectClass
        // name={this.props.field.englishLabel}
        value={this.props.contribution.role}
        onChange={(s: any) => {
          this.props.contribution.role = (s && s.value
            ? s.value
            : "") as string;
          this.setState({});
        }}
        options={options}
      />
    );
  }
}
