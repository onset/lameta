import * as React from "react";
import * as mobx from "mobx-react";
import { Field } from "../model/field/Field";
const titleCase = require("title-case");

export interface IProps {
  field: Field;
  autoFocus?: boolean;
  hideLabel?: boolean;
  onBlur?: () => void;
  validate?: (value: string) => boolean;
}
interface IState {
  invalid: boolean;
}
// automatically update when the value changes
@mobx.observer
// the React.HTMLAttributes<HTMLDivElement> allows the use of "className=" on these fields
export default class TextFieldEdit extends React.Component<
  IProps & React.HTMLAttributes<HTMLDivElement>,
  IState
> {
  constructor(props: IProps) {
    super(props);
    this.getLabel = this.getLabel.bind(this);
    this.state = { invalid: false };
  }

  private onChange(event: React.FormEvent<HTMLTextAreaElement>, text: Field) {
    text.text = event.currentTarget.value.trim();
    this.setState({ invalid: false });
  }

  private getLabel() {
    if (this.props.field === undefined) {
      return "Null Text";
    }
    return this.props.field.englishLabel;
  }

  private static getValue(text: Field): string {
    if (text === undefined) {
      return "Null Text";
    }
    return text.text;
  }

  public render() {
    const classname = this.state.invalid ? "invalid" : "";
    return (
      <div
        className={
          "field " + (this.props.className ? this.props.className : "")
        }
      >
        {this.props.hideLabel ? "" : <label>{this.getLabel()}</label>}
        <textarea
          autoFocus={this.props.autoFocus}
          className={classname}
          name={this.props.field.englishLabel} //what does this do? Maybe accessibility?
          value={TextFieldEdit.getValue(this.props.field)}
          onChange={event => this.onChange(event, this.props.field)}
          onBlur={(event: React.FocusEvent<HTMLTextAreaElement>) => {
            if (
              this.props.validate &&
              !this.props.validate(event.currentTarget.value)
            ) {
              event.preventDefault();
              const textarea = event.currentTarget;
              window.setTimeout(() => {
                textarea.focus();
                this.setState({ invalid: true });
              });
            } else {
              this.setState({ invalid: false });
              if (this.props.onBlur) {
                this.props.onBlur();
              }
            }
          }}
        />
      </div>
    );
  }
}
