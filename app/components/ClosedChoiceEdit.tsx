import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../model/field/Field";

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
  }

  private static onChange(
    event: React.FormEvent<HTMLSelectElement>,
    text: Field
  ) {
    text.text = event.currentTarget.value;
  }

  private static getValue(text: Field): string {
    if (text === undefined) {
      return "Null Text";
    }
    return text.text;
  }

  public render() {
    const label: string = this.props.field.labelInUILanguage;
    const v = ClosedChoiceEdit.getValue(this.props.field);
    return (
      <div className={"field " + this.props.className}>
        {this.props.includeLabel ? <label>{label}</label> : ""}
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
