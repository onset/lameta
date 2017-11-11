import * as React from "react";
import { Field, reduxForm, InjectedFormProps  } from "redux-form";
import { DateInput } from "@blueprintjs/datetime";
let styles = require("./Sessions.scss");
export interface IProps {
}

class SessionForm  extends React.Component<InjectedFormProps> {
  //  renderField = (field: any) => (
  //   <div className="input-row">
  //     <input {...field.input} type="text"/>
  //   </div>
  // )

  renderDatePicker = () => (
    <div>
          <DateInput />
    </div>
  )

  render() {

    return (
      <form className={styles.sessionForm}>
        <div className={"field"}>
          <label htmlFor="id">ID</label>
          {/* <Field name="foo" type="text" component={this.renderField}/> */}
          <Field name="id" type="text" component="input"/>
        </div>
        <div className={"field"}>
          <label htmlFor="title">Title</label>
          <Field name="title" type="text" component="input"/>
        </div>
        <div className={"field"}>
          <label htmlFor="People">People</label>
          <Field name="people" type="text" component="input"/>
        </div>
        <div className={"field"}>
          <label htmlFor="genre">Genre</label>
          <Field name="genre"  component="select">
            <option>Drama</option>
            <option>Formulaic Discourse</option>
            <option>Interactive Discourse</option>
            <option>Etc..</option>
          </Field>
        </div>
        <div className={"field text-block"}>
          <label htmlFor="situation">Situation</label>
          <Field name="situation" type="text" component="input"/>
        </div>
        <div className={"field"}>
          <label htmlFor="date">Date</label>
          {<Field name="date" type="date" component={this.renderDatePicker}/>}
        </div>
        <div className={"field"}>
          <label htmlFor="setting">Setting</label>
          <Field name="setting" type="text" component="input"/>
        </div>
        <div className={"field"}>
          <label htmlFor="location">Location</label>
          <Field name="location" type="text" component="input"/>
        </div>
        <div className={"field"}>
          <label htmlFor="access">Access</label>
          <Field name="access" type="text" component="select">
            <option>All users can access</option>
            <option>Etc...</option>
          </Field>
        </div>
        <div className={"field text-block"}>
          <label htmlFor="description">Description</label>
          <Field name="description" type="text" component="input"/>
        </div>
      </form>
    );
  }
}

export default reduxForm({
  // a unique name for the form
  form: "sessionDetails"
})(SessionForm);

//export default connect(mapStateToProps,mapDispatchToProps)
// export default connect()
// (reduxForm({
//   // a unique name for the form
//   form: "sessionDetails"
// })(SessionDetails);
