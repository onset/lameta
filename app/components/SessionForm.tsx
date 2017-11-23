import * as React from "react";
import { DateInput } from "@blueprintjs/datetime";
import { Session } from "../model/SessionModel";
import { observer, Provider } from "mobx-react";
import TextField from "./TextField";
const styles = require("./Sessions.scss");

export interface IProps {
  session: Session;
}
@observer
export default class SessionForm extends React.Component<IProps> {
  //  renderField = (field: any) => (
  //   <div className="input-row">
  //     <input {...field.input} type="text"/>
  //   </div>
  // )

  constructor(props: IProps) {
    super(props);
    this.onChange = this.onChange.bind(this);
    console.log(this.props.session.getString("title"));
  }

  private renderDatePicker = () => (
    <div>
      <DateInput />
    </div>
  );

  private updateProperty(key: string, value: string) {
    this.props.session.setString(key, value);
    console.log(key + " = " + value);
  }

  private onChange(event: React.FormEvent<HTMLInputElement>) {
    this.updateProperty(event.currentTarget.name, event.currentTarget.value);
  }

  public render() {
    return (
      // the mobx.Provider makes the object available without having to list it for every field
      <Provider data={this.props.session}>
        <form className={styles.sessionForm}>
          <TextField property="title" />
          <TextField property="people" />
          <TextField property="genre" />
          <TextField property="situation" className={"text-block"} />
          <TextField property="date" />
          <TextField property="setting" />
          <TextField property="location" />
          <TextField property="access" />
          <TextField property="description" className={"text-block"} />
        </form>
      </Provider>
      // <form className={styles.sessionForm}>

      //   <div className={"field"}>
      //     <label htmlFor="genre">Genre</label>
      //     <Field name="genre"  component="select">
      //       <option>Drama</option>
      //       <option>Formulaic Discourse</option>
      //       <option>Interactive Discourse</option>
      //       <option>Etc..</option>
      //     </Field>
      //   </div>
      //   <div className={"field text-block"}>
      //     <label htmlFor="situation">Situation</label>
      //     <Field name="situation" type="text" component="input"/>
      //   </div>
      //   <div className={"field"}>
      //     <label htmlFor="date">Date</label>
      //     {<Field name="date" type="date" component={this.renderDatePicker}/>}
      //   </div>
      //   <div className={"field"}>
      //     <label htmlFor="setting">Setting</label>
      //     <Field name="setting" type="text" component="input"/>
      //   </div>
      //   <div className={"field"}>
      //     <label htmlFor="location">Location</label>
      //     <Field name="location" type="text" component="input"/>
      //   </div>
      //   <div className={"field"}>
      //     <label htmlFor="access">Access</label>
      //     <Field name="access" type="text" component="select">
      //       <option>All users can access</option>
      //       <option>Etc...</option>
      //     </Field>
      //   </div>
      //   <div className={"field text-block"}>
      //     <label htmlFor="description">Description</label>
      //     <Field name="description" type="text" component="input"/>
      //   </div>
      // </form>
    );
  }
}

// export default reduxForm({
//   // a unique name for the form
//   form: "sessionDetails"
// })(SessionForm);

//export default connect(mapStateToProps,mapDispatchToProps)
// export default connect()
// (reduxForm({
//   // a unique name for the form
//   form: "sessionDetails"
// })(SessionDetails);
