import * as React from "react";
import * as mobx from "mobx-react";
import { Field } from "../model/field/Field";
import { InfoAffordance } from "./InfoAffordance";
import { FieldLabel } from "./FieldLabel";

export interface IProps {
  field: Field;
  autoFocus?: boolean;
  hideLabel?: boolean;
  onBlur?: () => void;
  onBlurWithValue?: (currentValue: string) => void;
  // this one will prevent the user from moving on
  validate?: (value: string) => boolean;
  tooltip?: string;
}
interface IState {
  invalid: boolean;
  //validationClass: string;
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
    this.state = { invalid: false };
  }
  private onChange(event: React.FormEvent<HTMLTextAreaElement>, text: Field) {
    // NB: Don't trim here. It is tempting, because at the end of the day we'd
    // like it trimmed, but if you do it here, it's not possible to even
    // type a space.
    // NO: text.text = event.currentTarget.value.trim();
    text.text = event.currentTarget.value;
    this.setState({ invalid: false });
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
        title={this.props.tooltip}
      >
        {this.props.hideLabel ? (
          ""
        ) : (
          <FieldLabel fieldDef={this.props.field.definition} />
        )}

        <textarea
          autoFocus={this.props.autoFocus}
          className={classname} // + " " + this.state.validationClass}
          name={this.props.field.definition.englishLabel} //what does this do? Maybe accessibility?
          value={TextFieldEdit.getValue(this.props.field)}
          onChange={event => this.onChange(event, this.props.field)}
          onKeyDown={event => {
            if (
              !this.props.field.definition.multipleLines &&
              event.keyCode === 13
            ) {
              event.preventDefault();
            }
          }}
          onBlur={(event: React.FocusEvent<HTMLTextAreaElement>) => {
            if (this.props.onBlurWithValue) {
              this.props.onBlurWithValue(event.currentTarget.value);
            }
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
