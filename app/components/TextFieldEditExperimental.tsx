/*import * as React from "react";
import { observer, inject } from "mobx-react";
import { Field } from "../model/field/Field";
import { File } from "../model/file/File";
const titleCase = require("title-case");

export interface IProps {
  file: File;
  fieldKey: string;
}

// automatically update when the value changes
@observer
// the React.HTMLAttributes<HTMLDivElement> allows the use of "className=" on these fields
export default class TextFieldEdit2 extends React.Component<
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
    event: React.FormEvent<HTMLTextAreaElement>,
    file: File,
    key: string
  ) {
    file.getTextField(key).english = event.currentTarget.value;
  }

  private getLabel(file: File, key: string) {
    return titleCase(file.getTextField(key).englishLabel);
  }

  private static getValue(props: IProps): string {
    return props.file.getTextField(props.fieldKey).english;
  }

  public render() {
    return (
      <div className={"field " + this.props.className}>
        <label>{this.getLabel(this.props.file, this.props.fieldKey)}</label>
        <textarea
          name={this.props.file.getTextField(this.props.fieldKey).englishLabel} //what does this do? Maybe accessibility?
          value={TextFieldEdit2.getValue(this.props)}
          onChange={event =>
            TextFieldEdit2.onChange(event, this.props.file, this.props.fieldKey)
          }
        />
      </div>
    );
  }
}
*/
