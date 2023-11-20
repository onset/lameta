import * as React from "react";
import { Trans } from "@lingui/macro";
import { RadioGroup, Radio } from "react-radio-group";

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
