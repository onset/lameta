import * as React from "react";
import { observer } from "mobx-react";
import { Field } from "../model/field/Field";
import { RadioGroup, Radio } from "react-radio-group";
import "./StatusControl.scss";
import { translateChoice } from "../other/localization";
import { locate } from "../other/crossPlatformUtilities";

export interface IProps {
  statusField: Field;
}

class StatusControl extends React.Component<IProps> {
  public render() {
    return (
      <div className="statusControl">
        <RadioGroup
          id="statusRadioGroup"
          name="status"
          className="radioGroup"
          selectedValue={this.props.statusField.text}
          onChange={(value) => {
            this.props.statusField.setValueFromString(value);
          }}
        >
          {this.props.statusField.choices.map((s) => {
            const translated = translateChoice(s);
            return (
              <div key={s}>
                <img src={locate(`assets/status-${s}.png`)} />
                <label>
                  <Radio value={s} />
                  {/* saymore windows classic used "In_Progress" as the key */}
                  {translated.replace("_", " ")}
                </label>
              </div>
            );
          })}
        </RadioGroup>
      </div>
    );
  }
}

export default observer(StatusControl);
