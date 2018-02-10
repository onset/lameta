import * as React from "react";
import { observer } from "mobx-react";
import { Project } from "../../model/Project/Project";
//import { DocumentsPane } from "./DocumentsPane";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import AutoForm from "../AutoForm";
import { FolderPane } from "../FolderPane";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { AccessProtocolForm } from "./AccessProtocolForm";

interface IProps {
  project: Project;
  authorityLists: AuthorityLists;
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
          <AutoForm
            form="primary"
            fields={this.props.project.properties}
            authorityLists={this.props.authorityLists}
          />
        </TabPanel>
        <TabPanel>
          <AccessProtocolForm
            protocolField={this.props.project.properties.getTextField(
              "accessProtocol"
            )}
            customChoicesField={this.props.project.properties.getTextField(
              "customAccessChoices"
            )}
            authorityLists={this.props.authorityLists}
          />
        </TabPanel>
        <TabPanel>
          <FolderPane
            project={this.props.project}
            folder={this.props.project.descriptionFolder}
            folderTypeStyleClass={"project-documents"}
            showStandardMetaTabs={false}
            authorityLists={this.props.authorityLists}
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
            project={this.props.project}
            folder={this.props.project.otherDocsFolder}
            folderTypeStyleClass={"project-documents"}
            showStandardMetaTabs={false}
            authorityLists={this.props.authorityLists}
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
