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
import { ThemeProvider } from "@mui/material";
import { useState } from "react";
import { createProjectTheme } from "../../containers/theme";

interface IProps {
  project: Project;
  authorityLists: AuthorityLists;
  reload: () => void;
}
export const ProjectTab: React.FunctionComponent<IProps> = observer((props) => {
  const [theme] = useState(createProjectTheme());
  const kFirstTabToOpen = 0;

  const showCollectionTab = props.project.properties.values().some((p) => {
    console.log(`${p.key}`);
    if (
      p.definition &&
      p.definition.form === "collection" &&
      p.definition.visibility === "always"
    ) {
      console.log(`SHOWING COllection for ${p.key}`);
    }
    return (
      p.definition &&
      p.definition.form === "collection" &&
      p.definition.visibility === "always"
    );
  });

  return (
    <ThemeProvider theme={theme}>
      <Tabs
        className={"project"}
        defaultIndex={kFirstTabToOpen}
        onSelect={() => props.project.saveFolderMetaData()}
      >
        <TabList>
          <Tab className={"tab-project-about"} data-testid="project-about">
            <Trans>About This Project</Trans>
          </Tab>
          <Tab
            className={"tab-project-archive-configuration"}
            data-testid="project-configuration-tab"
          >
            <Trans>Archive Configuration</Trans>
          </Tab>
          {showCollectionTab && (
            <Tab
              className={"tab-project-collection"}
              data-testid="project-collection-tab"
            >
              <Trans>Collection</Trans>
            </Tab>
          )}
          <Tab className={"tab-project-description-docs"}>
            <Trans>Description Documents</Trans>
          </Tab>
          <Tab className={"tab-project-other-docs"}>
            <Trans>Other Documents</Trans>
          </Tab>
          {Project.OtherConfigurationSettings.showImdi ? (
            <Tab className={"tab-project-imdi"}>
              IMDI {/* don't translate  */}
            </Tab>
          ) : (
            <></>
          )}
          {Project.OtherConfigurationSettings.showParadisec ? (
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
            folder={props.project}
            authorityLists={props.authorityLists}
            languageFinder={props.project.languageFinder}
            rowStyle={true}
          />
        </TabPanel>
        <TabPanel>
          <ArchiveConfigurationForm
            archiveConfigurationField={props.project.properties.getTextField(
              "archiveConfigurationName"
            )}
            customChoicesField={props.project.properties.getTextField(
              "customAccessChoices"
            )}
            authorityLists={props.authorityLists}
            onChange={() => {
              props.project.metadataFile!.wasChangeThatMobxDoesNotNotice();
              props.project.saveFolderMetaData();
              props.reload();
            }}
          />
        </TabPanel>
        {showCollectionTab && (
          <TabPanel>
            <AutoForm
              form="collection"
              formClass="project"
              folder={props.project}
              authorityLists={props.authorityLists}
              languageFinder={props.project.languageFinder}
              rowStyle={true}
            />
          </TabPanel>
        )}
        <TabPanel>
          <FolderPane
            project={props.project}
            folder={props.project.descriptionFolder}
            folderTypeStyleClass={"project-documents"}
            showStandardMetaTabs={false}
            authorityLists={props.authorityLists}
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
            project={props.project}
            folder={props.project.otherDocsFolder}
            folderTypeStyleClass={"project-documents"}
            showStandardMetaTabs={false}
            authorityLists={props.authorityLists}
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
        {Project.OtherConfigurationSettings.showImdi ? (
          <TabPanel>
            <ImdiView
              target={props.project}
              project={props.project}
              folder={props.project}
            />
          </TabPanel>
        ) : (
          <></>
        )}
        {Project.OtherConfigurationSettings.showParadisec ? (
          <TabPanel>
            <ParadisecView
              target={props.project}
              project={props.project}
              folder={props.project}
            />
          </TabPanel>
        ) : (
          <></>
        )}
      </Tabs>
    </ThemeProvider>
  );
});
