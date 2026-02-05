import * as React from "react";
import { observer } from "mobx-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import moment from "moment";
import { Field } from "../model/field/Field";

export interface IProps {
  field: Field;
}

// the React.HTMLAttributes<HTMLDivElement> allows the use of "className=" on these fields
const DateFieldEdit: React.FunctionComponent<
  IProps & React.HTMLAttributes<HTMLDivElement>
> = (props) => {
  const label: string = props.field.labelInUILanguage;
  const selectedDate = props.field.text
    ? toDatePickerDate(props.field.text)
    : null;

  const handleChange = (newDate: Date | null) => {
    console.log("today's time and date: " + new Date());

    if (newDate == null) {
      props.field.setValueFromString("");
    } else {
      props.field.setValueFromString(toDateOnlyIsoString(newDate));
    }
  };

  return (
    <div className={"field " + props.className}>
      <label>{label}</label>
      {/* display:grid makes the hint go below the field on Project page */}
      <div style={{ display: "grid" }}>
        <DatePicker
          tabIndex={props.tabIndex}
          className="date-picker"
          dateFormat="yyyy-MM-dd"
          selected={selectedDate}
          //onChange={d => console.log("change " + d)}
          onChange={handleChange}
        />
        <span className="hint">YYYY-MM-DD</span>
      </div>
    </div>
  );
};

// Date-only invariant: this field is a calendar date, not a timestamp.
// We only use the YYYY-MM-DD portion and never apply timezone conversions.
// A date should display and store identically no matter where it is entered or viewed.
export const toDatePickerDate = (dateText: string): Date | null => {
  const isoMatch = dateText.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return null;
    }
    const candidate = new Date(year, month - 1, day);
    if (
      candidate.getFullYear() === year &&
      candidate.getMonth() === month - 1 &&
      candidate.getDate() === day
    ) {
      return candidate;
    }
    return null;
  }
  const m = moment(dateText);
  if (!m.isValid()) {
    return null;
  }
  return new Date(m.year(), m.month(), m.date());
};

// https://github.com/Hacker0x01/react-datepicker/issues/3652
// To test, manually set the computer's timezone to UTC+1, Berlin time
// Without it, the datepicker will show the date as the day before,
// immediately after you have selected a day.
// We intentionally store only YYYY-MM-DD (no time, no timezone) because this is
// a plain date field. That keeps the stored value and the displayed value stable
// across time zones and avoids any off-by-one shifts near midnight.
export const toDateOnlyIsoString = (inputDate: Date) =>
  inputDate.getFullYear() +
  "-" +
  ("0" + (inputDate.getMonth() /* zero based */ + 1)).slice(-2) +
  "-" +
  ("0" + inputDate.getDate()).slice(-2);

export default observer(
  // the React.HTMLAttributes<HTMLDivElement> allows the use of "className=" on these fields
  DateFieldEdit
);
