import * as React from "react";
import { Trans } from "@lingui/macro";
import { observer } from "mobx-react";
import { Project } from "../../model/Project/Project";
//import { DocumentsPane } from "./DocumentsPane";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import AutoForm from "../AutoForm";
import { FolderPane } from "../FolderPane";
import { AuthorityLists } from "../../model/Project/AuthorityLists/AuthorityLists";
import { ArchiveConfigurationForm } from "./ArchiveConfigurationForm";
import { ImdiView } from "../ImdiView";
import "./ProjectTab.scss";
import userSettings from "../../other/UserSettings";
import { ParadisecView } from "../ParadisecView";

interface IProps {
  project: Project;
  authorityLists: AuthorityLists;
  reload: () => void;
}

export const ProjectTab = observer(
  class ProjectTab extends React.Component<IProps> {
    public render() {
      const kFirstTabToOpen = 1;
      return (
        <Tabs
          className={"project"}
          defaultIndex={kFirstTabToOpen}
          onSelect={() => this.props.project.saveFolderMetaData()}
        >
          <TabList>
            <Tab className={"tab-project-about"} data-testid="project-about">
              <Trans>About This Project</Trans>
            </Tab>
            <Tab className={"tab-project-archive-configuration"}>
              <Trans>Archive Configuration</Trans>
            </Tab>
            <Tab className={"tab-project-collection"}>
              <Trans>Collection</Trans>
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
              rowStyle={true}
            />
          </TabPanel>
          <TabPanel>
            <ArchiveConfigurationForm
              archiveConfigurationField={this.props.project.properties.getTextField(
                "archiveConfigurationName"
              )}
              // customChoicesField={this.props.project.properties.getTextField(
              //   "customAccessChoices"
              // )}
              authorityLists={this.props.authorityLists}
              onChange={() => {
                window.alert(
                  "lameta will now reload to show any changes associate with this archive."
                );
                this.props.project.saveFolderMetaData();
                this.props.reload();
              }}
            />
          </TabPanel>
          <TabPanel>
            <AutoForm
              form="collection"
              formClass="project"
              folder={this.props.project}
              authorityLists={this.props.authorityLists}
              languageFinder={this.props.project.languageFinder}
              rowStyle={true}
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
);
