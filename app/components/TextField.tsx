import * as React from "react";
import { observer, inject } from "mobx-react";
import { ISession } from "./SessionModel";
//let styles = require("./Sessions.scss");

//import { titleCase } from "title-case"; why didn't this way work?
var titleCase = require("title-case");

export interface IProps {
    data?: ISession;
    property: string;
    label?:string;// label is optional if it equals property
}

@inject("data") @observer
export default class TextField  extends React.Component<IProps> {
    constructor(props : IProps) {
        super();
        this.onChange = this.onChange.bind(this);
        this.getLabel= this.getLabel.bind(this);
    }
    updateProperty (key:string, value:string) {
        if(this.props.data) {
            this.props.data.setString(key, value);
        }
        console.log(key+" = "+value);
      }

      onChange (event: React.FormEvent<HTMLInputElement>) {
        console.log(event);
        this.updateProperty(event.currentTarget.name, event.currentTarget.value);
      }

      getLabel(property: string) {
          return titleCase(property);
      }

      getValue(property: string) {
        return this.props.data? this.props.data.getString(property) : "ERROR";
    }

      render() {
        return (
            <div className={"field"}>
                <label>{this.props.label?this.props.label : this.getLabel(this.props.property)}</label>
                <input type="text"
                    name={this.props.property}
                    value={this.getValue(this.props.property)}
                    onChange={this.onChange}/>
            </div>
        );}
}