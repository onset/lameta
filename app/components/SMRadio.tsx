import * as React from "react";
import { RadioGroup, Radio } from "react-radio-group";
import { Trans } from "@lingui/react";

export const SMRadioGroup = RadioGroup;

interface IProps {
  value: string;
}
export class SMRadio extends React.Component<IProps> {
  public render() {
    return (
      <div style={{ marginLeft: "2px", marginTop: "3px", marginBottom: "3px" }}>
        <label>
          <Radio style={{ height: "1em" }} value={this.props.value} />
          <span style={{ height: "1em" }}>{this.props.children}</span>
        </label>
      </div>
    );
  }
}
