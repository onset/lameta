import * as React from "react";
import { observer, inject } from "mobx-react";
import { TextField } from "../model/Fields";
const titleCase = require("title-case");
//const styles = require("./Sessions.scss");

export interface IProps {
  text: TextField;
}

// automatically update when the value changes
@observer
// the React.HTMLAttributes<HTMLDivElement> allows the use of "className=" on these fields
export default class TextFieldEdit extends React.Component<
  IProps & React.HTMLAttributes<HTMLDivElement>
> {
  constructor(props: IProps) {
    super(props);
    //this.onChange = this.onChange.bind(this);
    this.getLabel = this.getLabel.bind(this);
  }

  // this way gave us the wrong "this" (e.g 1st session when we were on the second
  // private onChange(event: React.FormEvent<HTMLInputElement>) {
  //   console.log("PolytextFiled setting field of " + this.props.text.default);
  //   this.props.text.setDefault(event.currentTarget.value);
  //   console.log("PolytextFiled now " + this.props.text.default);
  // }

  private static onChange(
    event: React.FormEvent<HTMLInputElement>,
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
        <input
          name={this.props.text.englishLabel} //what does this do? Maybe accessibility?
          value={TextFieldEdit.getValue(this.props.text)}
          onChange={event => TextFieldEdit.onChange(event, this.props.text)}
        />
      </div>
    );
  }
}
