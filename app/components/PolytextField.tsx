import * as React from "react";
import { observer, inject } from "mobx-react";
import { Polytext } from "../model/BaseModel";
const titleCase = require("title-case");
//const styles = require("./Sessions.scss");

export interface IProps {
  text: Polytext;
}

// automatically update when the value changes
@observer
// the React.HTMLAttributes<HTMLDivElement> allows the use of "className=" on these fields
export default class PolytextField extends React.Component<
  IProps & React.HTMLAttributes<HTMLDivElement>
> {
  constructor(props: IProps) {
    super(props);
    this.onChange = this.onChange.bind(this);
    this.getLabel = this.getLabel.bind(this);
  }

  private onChange(event: React.FormEvent<HTMLInputElement>) {
    this.props.text.setDefault(event.currentTarget.value);
  }

  private getLabel() {
    if (this.props.text === undefined) {
      return "Null Polytext";
    }
    return titleCase(this.props.text.englishLabel);
  }

  private getValue() {
    if (this.props.text === undefined) {
      return "Null Polytext";
    }
    return this.props.text.default();
  }

  public render() {
    return (
      <div className={"field " + this.props.className}>
        <label>{this.getLabel()}</label>
        <input
          type="text"
          name={this.props.property}
          value={this.getValue()}
          onChange={this.onChange}
        />
      </div>
    );
  }
}
