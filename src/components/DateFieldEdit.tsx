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
              console.log("today's time and date: " + new Date());

              if (newDate != null) {
                this.props.field.setValueFromString(
                  toISOIgnoreTimezone(newDate)
                );
              }
            }}
          />
          <span className="hint">YYYY-MM-DD</span>
        </div>
      </div>
    );
  }
}

// https://github.com/Hacker0x01/react-datepicker/issues/3652
// To test, manually set the computer's timezone to UTC+1, Berlin time
// Without it, the datepicker will show the date as the day before,
// immediately after you have selected a day.
function toISOIgnoreTimezone(inputDate: Date) {
  return (
    inputDate.getFullYear() +
    "-" +
    ("0" + (inputDate.getMonth() /* zero based */ + 1)).slice(-2) +
    "-" +
    ("0" + inputDate.getDate()).slice(-2) +
    "T00:00:00.000Z"
  );
}

export default observer(
  // the React.HTMLAttributes<HTMLDivElement> allows the use of "className=" on these fields
  DateFieldEdit
);
