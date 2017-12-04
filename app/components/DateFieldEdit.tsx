import * as React from "react";
import { observer } from "mobx-react";
import { DateField } from "../model/Fields";
// tslint:disable-next-line:no-submodule-imports
import DatePicker from "react-datepicker";
import { Moment } from "moment";
const moment = require("moment");
// tslint:disable-next-line:no-submodule-imports

//const styles = require("./Sessions.scss");

export interface IProps {
  date: DateField;
}

// automatically update when the value changes
@observer
// the React.HTMLAttributes<HTMLDivElement> allows the use of "className=" on these fields
export default class DateFieldEdit extends React.Component<
  IProps & React.HTMLAttributes<HTMLDivElement>
> {
  constructor(props: IProps) {
    super(props);
    this.getLabel = this.getLabel.bind(this);
  }

  private getLabel() {
    return this.props.date.englishLabel;
  }

  public render() {
    const m: Moment = moment(this.props.date.date);
    return (
      <div className={"field " + this.props.className}>
        <label>{this.getLabel() + this.props.date.date.toDateString()}</label>
        <DatePicker
          selected={m}
          //onChange={d => console.log("change " + d)}
          onChange={newDate => {
            if (newDate != null) {
              // TODO: while this is changing the value, it's not propogating back to our props so you don't see the change immediately
              this.props.date.setDate(newDate.toDate());
            }
          }}
        />
      </div>
    );
  }
}
