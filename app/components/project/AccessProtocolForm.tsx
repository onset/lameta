import * as React from "react";
import { observer } from "mobx-react";
import { Project } from "../../model/Project/Project";
//import { DocumentsPane } from "./DocumentsPane";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import AutoForm from "../AutoForm";
import { FolderPane } from "../FolderPane";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { Field } from "../../model/field/Field";

interface IProps {
  field: Field;
  authorityLists: AuthorityLists;
}

@observer
export class AccessProtocolForm extends React.Component<IProps> {
  public render() {
    return (
      <div>
        <select
          name={this.props.field.englishLabel} //what does this do? Maybe accessibility?
          value={this.props.field.text}
          onChange={event => {
            this.props.field.text = event.currentTarget.value;
          }}
        >
          {//NB: an error about keys here means that the choices were not unique
          this.props.authorityLists.accessProtocolChoices.map(s => (
            <option key={s.protocol}>{s.protocol}</option>
          ))}
        </select>
      </div>
    );
  }
}
