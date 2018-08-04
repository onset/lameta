import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../../model/field/Field";
import { Creatable, Option, OptionValues } from "react-select";
// tslint:disable-next-line:no-duplicate-imports
import ReactSelect from "react-select";
import { observable } from "mobx";

const titleCase = require("title-case");

export interface IProps {
  field: Field;
  getPeopleNames: () => string[];
}

@observer
export default class PeopleChooser extends React.Component<
  IProps & React.HTMLAttributes<HTMLDivElement>
> {
  constructor(props: IProps) {
    super(props);
    this.getLabel = this.getLabel.bind(this);
  }

  // The label for the field, e.g. "Genre"
  private getLabel() {
    if (this.props.field === undefined) {
      return "Null Text";
    }
    return titleCase(this.props.field.englishLabel);
  }
  private handleSelectChange(value) {
    this.props.field.setValueFromString(value);
  }
  public render() {
    const choices = this.props.getPeopleNames().map(c => {
      return new Object({
        value: c,
        label: c
      });
    });
    //console.log("participants=" + this.props.field.text);
    return (
      <div className={"field " + this.props.className}>
        <label>{this.getLabel()}</label>
        <ReactSelect
          name={this.props.field.englishLabel}
          value={this.props.field.text}
          // onChange={(s: any) => {
          //   this.props.field.text = (s && s.value ? s.value : "") as string;
          // }}
          onChange={v => this.handleSelectChange(v)}
          options={choices}
          multi
          delimiter={";"}
          simpleValue // causes it to be split up by our delimeter
          removeSelected={false}
        />
      </div>
    );
  }
}
