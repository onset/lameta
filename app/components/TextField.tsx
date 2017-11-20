import * as React from "react";
import { observer } from "mobx-react";
import { ISession } from "./SessionModel";
//let styles = require("./Sessions.scss");

export interface IProps {
    data: ISession;
    key?:string; // key is optional if it equals label.tolower()
    label:string;
}

@observer
export default class TextField  extends React.Component<IProps> {
    constructor(props : IProps) {
        super();
        this.onChange = this.onChange.bind(this);
    }
    updateProperty (key:string, value:string) {
        this.props.data.setString(key, value);
        console.log(key+" = "+value);
      }

      onChange (event: React.FormEvent<HTMLInputElement>) {
        console.log(event);
        this.updateProperty(event.currentTarget.name, event.currentTarget.value);
      }

      render() {
        return (
            <div className={"field"}>
                <label>{this.props.label}</label>
                <input type="text"
                    name={this.props.key?this.props.key:this.props.label.toLowerCase()}
                    value={this.props.data.getString(this.props.key?this.props.key:this.props.label.toLowerCase())}
                    onChange={this.onChange}/>
            </div>
        );}
}