import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../model/field/Field";
import { Creatable, Option, OptionValues } from "react-select";
// tslint:disable-next-line:no-duplicate-imports
import ReactSelect from "react-select";
import { observable } from "mobx";

const titleCase = require("title-case");

export interface IProps {
  name: string;
  getPeopleNames: () => string[];
  onChange: (name: string) => void;
}

@observer
export default class PersonChooser extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    const choices = this.props.getPeopleNames().map(c => {
      return new Object({
        value: c,
        label: c
      });
    });
    return (
      <ReactSelect
        name={this.props.name}
        value={this.props.name}
        //onChange={v => this.props.onChange(v ? v[0].value : "")}
        onChange={v => {
          const s: string = v as any;
          this.props.onChange(s ? s : "");
        }}
        options={choices}
        simpleValue
      />
    );
  }
}
