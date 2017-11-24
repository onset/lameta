// import * as React from "react";
// import { observer, inject } from "mobx-react";
// import { FormObject } from "../model/BaseModel";
// const titleCase = require("title-case");
// //const styles = require("./Sessions.scss");

// /* TextField is just a label and a text field.
//     There is so much code here just because it is optimized to reduce boilerplate
//    (onchange, label vs. property, etc.)
// */

// export interface IProps {
//   // data isn't actually optional, but because we're using mobx.inject, the compiler won't see that it was provided
//   data?: FormObject; // TODO: currently ISession, will be generalized later
//   property: string;
//   label?: string; // if missing, then we will "title case" the property name and use that for English
// }

// //get the object given by a <Provider> in the parent, and put it into our props (just saves the parent having to list it for every field)
// @inject("data")
// // automatically update when the value changes
// @observer
// // the React.HTMLAttributes<HTMLDivElement> allows the use of "className=" on these fields
// export default class TextField extends React.Component<
//   IProps & React.HTMLAttributes<HTMLDivElement>
// > {
//   constructor(props: IProps) {
//     super(props);
//     this.onChange = this.onChange.bind(this);
//     this.getLabel = this.getLabel.bind(this);
//   }
//   private updateProperty(key: string, value: string) {
//     if (this.props.data) {
//       this.props.data.setString(key, value);
//     }
//     console.log(key + " = " + value);
//   }

//   private onChange(event: React.FormEvent<HTMLInputElement>) {
//     console.log(event);
//     this.updateProperty(event.currentTarget.name, event.currentTarget.value);
//   }

//   private getLabel(property: string) {
//     return titleCase(property);
//   }

//   private getValue(property: string) {
//     return this.props.data ? this.props.data.getString(property) : "ERROR";
//   }

//   public render() {
//     return (
//       <div className={"field " + this.props.className}>
//         <label>
//           {this.props.label
//             ? this.props.label
//             : this.getLabel(this.props.property)}
//         </label>
//         <input
//           type="text"
//           name={this.props.property}
//           value={this.getValue(this.props.property)}
//           onChange={this.onChange}
//         />
//       </div>
//     );
//   }
// }
