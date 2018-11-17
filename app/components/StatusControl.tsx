import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../model/field/Field";
import { RadioGroup, Radio } from "react-radio-group";
import "./StatusControl.scss";

export interface IProps {
  statusField: Field;
}

@observer
export default class StatusControl extends React.Component<IProps> {
  public render() {
    return (
      <div className="statusControl">
        <RadioGroup
          id="statusRadioGroup"
          name="status"
          className="radioGroup"
          selectedValue={this.props.statusField.text}
          onChange={value => {
            this.props.statusField.setValueFromString(value);
          }}
        >
          {this.props.statusField.choices.map(s => {
            return (
              <div key={s}>
                <img src={require(`../img/status-${s}.png`)} />
                <label>
                  <Radio value={s} />
                  {/* saymore windows classic used "In_Progress" as the key */}
                  {s.replace("_", " ")}
                </label>
              </div>
            );
          })}
        </RadioGroup>
      </div>
    );
  }
}
