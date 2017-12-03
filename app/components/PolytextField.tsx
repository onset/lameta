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
    text: Polytext
  ) {
    console.log("PolytextFiled setting field of " + text.english);
    text.english = event.currentTarget.value;
    console.log("PolytextFiled now " + text.english);
  }

  private getLabel() {
    if (this.props.text === undefined) {
      return "Null Polytext";
    }
    return titleCase(this.props.text.englishLabel);
  }

  private static getValue(text: Polytext): string {
    if (text === undefined) {
      return "Null Polytext";
    }
    return text.english;
  }

  public render() {
    return (
      <div className={"field " + this.props.className}>
        <label>{this.getLabel()}</label>
        <input
          name={this.props.text.englishLabel} //what does this do? Maybe accessibility?
          value={PolytextField.getValue(this.props.text)}
          onChange={event => PolytextField.onChange(event, this.props.text)}
        />
      </div>
    );
  }
}

// name={this.props.text.englishLabel} //what does this do? Maybe accessibility?
// value={() => PolytextField.getValue(this.props.text)}
// onChange={x => PolytextField.onChange(x, this.props.text)}
