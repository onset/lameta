import * as React from "react";
import { observer } from "mobx-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from "moment";
import { Field } from "../model/field/Field";

export interface IProps {
  field: Field;
}

class // the React.HTMLAttributes<HTMLDivElement> allows the use of "className=" on these fields
DateFieldEdit extends React.Component<
  IProps & React.HTMLAttributes<HTMLDivElement>
> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    const label: string = this.props.field.labelInUILanguage;
    const m: moment.Moment | null = this.props.field.text
      ? moment(this.props.field.text)
      : null;
    return (
      <div className={"field " + this.props.className}>
        <label>{label}</label>
        {/* display:grid makes the hint go below the field on Project page */}
        <div style={{ display: "grid" }}>
          <DatePicker
            tabIndex={this.props.tabIndex}
            className="date-picker"
            dateFormat="yyyy-MM-dd"
            selected={m?.toDate()}
            //onChange={d => console.log("change " + d)}
            onChange={(newDate) => {
              if (newDate != null) {
                // TODO: while this is changing the value, it's not propagating back to our props so you don't see the change immediately
                this.props.field.setValueFromString(newDate.toISOString());
              }
            }}
          />
          <span className="hint">YYYY-MM-DD</span>
        </div>
      </div>
    );
  }
}

export default observer(
  // the React.HTMLAttributes<HTMLDivElement> allows the use of "className=" on these fields
  DateFieldEdit
);
