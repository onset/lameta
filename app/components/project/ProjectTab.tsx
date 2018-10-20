import * as React from "react";
import { observer } from "mobx-react";
import { Project } from "../../model/Project/Project";
//import { DocumentsPane } from "./DocumentsPane";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import AutoForm from "../AutoForm";
import { FolderPane } from "../FolderPane";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { AccessProtocolForm } from "./AccessProtocolForm";
import ImdiView from "../ImdiView";
import "./ProjectTab.scss";

interface IProps {
  project: Project;
  authorityLists: AuthorityLists;
}

@observer
export class ProjectTab extends React.Component<IProps> {
  public render() {
    this.props.project.couldPossiblyBecomeDirty();
    const kFirstTabToOpen = 0;
    return (
      <Tabs
        className={"project"}
        defaultIndex={kFirstTabToOpen}
        onSelect={() => this.props.project.saveFolderMetaData()}
      >
        <TabList>
          <Tab className={"tab-project-about"}>About This Project</Tab>
          <Tab className={"tab-project-access"}>Access Protocol</Tab>
          <Tab className={"tab-project-description-docs"}>
            Description Documents
          </Tab>
          <Tab className={"tab-project-other-docs"}>Other Documents</Tab>
          <Tab className={"tab-project-imdi"}>IMDI</Tab>
        </TabList>
        <TabPanel>
          <AutoForm
            form="primary"
            formClass="project"
            folder={this.props.project}
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
            <strong>
              Add documents here that don't seem to fit anywhere else. An
              example would be documents explaining how the project was funded.
            </strong>
            <br />
            <br />
          </FolderPane>
        </TabPanel>
        <TabPanel>
          <ImdiView target={this.props.project} project={this.props.project} />
        </TabPanel>
      </Tabs>
    );
  }
}
