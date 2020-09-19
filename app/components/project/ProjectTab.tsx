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
import { Trans } from "@lingui/react";
import userSettings from "../../UserSettings";
import { ParadisecView } from "../ParadisecView";

interface IProps {
  project: Project;
  authorityLists: AuthorityLists;
}

@observer
export class ProjectTab extends React.Component<IProps> {
  public render() {
    const kFirstTabToOpen = 0;
    return (
      <Tabs
        className={"project"}
        defaultIndex={kFirstTabToOpen}
        onSelect={() => this.props.project.saveFolderMetaData()}
      >
        <TabList>
          <Tab className={"tab-project-about"}>
            <Trans>About This Project</Trans>
          </Tab>
          <Tab className={"tab-project-access"}>
            <Trans>Access Protocol</Trans>
          </Tab>
          <Tab className={"tab-project-description-docs"}>
            <Trans>Description Documents</Trans>
          </Tab>
          <Tab className={"tab-project-other-docs"}>
            <Trans>Other Documents</Trans>
          </Tab>
          {userSettings.IMDIMode ? (
            <Tab className={"tab-project-imdi"}>
              IMDI {/* don't translate  */}
            </Tab>
          ) : (
            <></>
          )}
          {userSettings.ParadisecMode ? (
            <Tab className={"tab-project-paradisec"}>
              PARADISEC {/* don't translate  */}
            </Tab>
          ) : (
            <></>
          )}
        </TabList>
        <TabPanel>
          <AutoForm
            form="primary"
            formClass="project"
            folder={this.props.project}
            authorityLists={this.props.authorityLists}
            languageFinder={this.props.project.languageFinder}
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
              <Trans>
                Add documents here that describe the projects and corpus.
              </Trans>
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
              <Trans>
                Add documents here that don't seem to fit anywhere else. An
                example would be documents explaining how the project was
                funded.
              </Trans>
            </strong>
            <br />
            <br />
          </FolderPane>
        </TabPanel>
        {userSettings.IMDIMode ? (
          <TabPanel>
            <ImdiView
              target={this.props.project}
              project={this.props.project}
              folder={this.props.project}
            />
          </TabPanel>
        ) : (
          <></>
        )}
        {userSettings.ParadisecMode ? (
          <TabPanel>
            <ParadisecView
              target={this.props.project}
              project={this.props.project}
              folder={this.props.project}
            />
          </TabPanel>
        ) : (
          <></>
        )}
      </Tabs>
    );
  }
}
