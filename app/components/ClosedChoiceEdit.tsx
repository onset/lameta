import * as React from "react";
import { observer } from "mobx-react";
import { TextField } from "../model/Field";
const titleCase = require("title-case");

export interface IProps {
  text: TextField;
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
    text: TextField
  ) {
    text.english = event.currentTarget.value;
  }

  private getLabel() {
    if (this.props.text === undefined) {
      return "Null Text";
    }
    return titleCase(this.props.text.englishLabel);
  }

  private static getValue(text: TextField): string {
    if (text === undefined) {
      return "Null Text";
    }
    return text.english;
  }

  public render() {
    return (
      <div className={"field " + this.props.className}>
        <label>{this.getLabel()}</label>
        <select
          name={this.props.text.englishLabel} //what does this do? Maybe accessibility?
          value={ClosedChoiceEdit.getValue(this.props.text)}
          onChange={event => ClosedChoiceEdit.onChange(event, this.props.text)}
        >
          {this.props.text.choices.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>
    );
  }
}
