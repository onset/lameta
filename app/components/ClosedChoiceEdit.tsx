import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../model/field/Field";
const titleCase = require("title-case");

export interface IProps {
  includeLabel: boolean;
  field: Field;
}

@observer
export default class ClosedChoiceEdit extends React.Component<
  IProps & React.HTMLAttributes<HTMLDivElement>
> {
  constructor(props: IProps) {
    super(props);
    this.getLabel = this.getLabel.bind(this);
  }

  private static onChange(
    event: React.FormEvent<HTMLSelectElement>,
    text: Field
  ) {
    text.text = event.currentTarget.value;
  }

  private getLabel() {
    if (this.props.field === undefined) {
      return "Null Text";
    }
    return titleCase(this.props.field.englishLabel);
  }

  private static getValue(text: Field): string {
    if (text === undefined) {
      return "Null Text";
    }
    return text.text;
  }

  public render() {
    const v = ClosedChoiceEdit.getValue(this.props.field);
    return (
      <div className={"field " + this.props.className}>
        {this.props.includeLabel ? <label>{this.getLabel()}</label> : ""}
        <select
          name={this.props.field.englishLabel} //what does this do? Maybe accessibility?
          value={v}
          onChange={event => {
            ClosedChoiceEdit.onChange(event, this.props.field);
          }}
        >
          {//NB: an error about keys here means that the choices were not unique
          this.props.field.choices.map(s => (
            <option key={s} value={s}>
              {s === "unspecified" ? "" : s}
            </option>
          ))}
        </select>
      </div>
    );
  }
}
