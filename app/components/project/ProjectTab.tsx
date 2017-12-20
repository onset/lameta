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
            showStandardMetaTabs={false}
          >
            <strong>
              Add documents here that describe the projects and corpus.
            </strong>
            <br />
            <a>How these are archived</a>
            <br /> <br />
            <br />
          </FolderPane>
        </TabPanel>
        <TabPanel>
          <FolderPane
            folder={this.props.project.otherDocsFolder}
            folderTypeStyleClass={"project-documents"}
            showStandardMetaTabs={false}
          >
            {" "}
            <strong>
              Add documents here that don't seem to fit anywhere else. An
              example would be documents explaining how the project was funded.
            </strong>
            <br />
            <a>How these are archived</a>
            <br />
            <br />
            <br />
          </FolderPane>
        </TabPanel>
      </Tabs>
    );
  }
}
