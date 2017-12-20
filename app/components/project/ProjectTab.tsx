import * as React from "react";
import { observer } from "mobx-react";
import { Project } from "../../model/Project";
//import { DocumentsPane } from "./DocumentsPane";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import AutoForm from "../AutoForm";
import { FolderPane } from "../FolderPane";

interface IProps {
  project: Project;
}

@observer
export class ProjectTab extends React.Component<IProps> {
  public render() {
    return (
      <Tabs className={"project"}>
        <TabList>
          <Tab>About This Project</Tab>
          <Tab>Access Protocol</Tab>
          <Tab>Description Documents</Tab>
          <Tab>Other Documents</Tab>
        </TabList>
        <TabPanel>
          <AutoForm form="primary" fields={this.props.project.properties} />
        </TabPanel>
        <TabPanel>
          <AutoForm
            form="accessProtocol"
            fields={this.props.project.properties}
          />{" "}
        </TabPanel>
        <TabPanel>
          <FolderPane
            folder={this.props.project.descriptionFolder}
            folderTypeStyleClass={"project-documents"}
          />
        </TabPanel>
        <TabPanel>
          <FolderPane
            folder={this.props.project.otherDocsFolder}
            folderTypeStyleClass={"project-documents"}
          />
        </TabPanel>
      </Tabs>
    );
  }
}
