import { css } from "@emotion/react";
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
import "./ProjectTab.css";
import userSettings from "../../other/UserSettings";
import { ThemeProvider } from "@mui/material";
import { useState, useEffect, useRef } from "react";
import { createProjectTheme } from "../../containers/theme";
import { ParadisecView } from "../ParadisecView";
import { LametaXmlView } from "../lametaXmlView";
import { GetOtherConfigurationSettings } from "../../model/Project/OtherConfigurationSettings";
import { RoCrateView } from "../RoCrate/RoCrateView";
import { MultilingualTextMigrationPanel } from "./MultilingualTextMigrationPanel";

// Remember the last selected tab within the Project tab (not persisted between runs)
let lastProjectTabIndex = 0;

interface IProps {
  project: Project;
  authorityLists: AuthorityLists;
  reload: () => void;
}
export const ProjectTab: React.FunctionComponent<IProps> = observer((props) => {
  const [theme] = useState(createProjectTheme());
  
  // Track if we've already navigated to Languages tab for this project load
  const hasNavigatedToLanguages = useRef(false);

  // Currently this is worthless... every config is going to have a Title, which will cause this to appear.
  // Leaving it for now to show how to turn tabs on an off in case we learn that there is a variation in
  // institutional preferences that will need it.
  const showCollectionTab = props.project.properties.values().some((p) => {
    return (
      p.definition &&
      p.definition.form === "collection" &&
      p.definition.visibility === "always"
    );
  });

  // Calculate the Languages tab index (depends on whether Collection tab is shown)
  const languagesTabIndex = showCollectionTab ? 3 : 2;

  // Determine initial tab: if multilingualConversionPending, go to Languages tab
  const getInitialTabIndex = () => {
    if (props.project.multilingualConversionPending && !hasNavigatedToLanguages.current) {
      hasNavigatedToLanguages.current = true;
      return languagesTabIndex;
    }
    return lastProjectTabIndex;
  };

  const [tabIndex, setTabIndex] = useState(getInitialTabIndex);

  // Also navigate to Languages tab if multilingualConversionPending becomes true after mount
  useEffect(() => {
    if (props.project.multilingualConversionPending && !hasNavigatedToLanguages.current) {
      hasNavigatedToLanguages.current = true;
      setTabIndex(languagesTabIndex);
      lastProjectTabIndex = languagesTabIndex;
    }
  }, [props.project.multilingualConversionPending, languagesTabIndex]);

  return (
    <ThemeProvider theme={theme}>
      <Tabs
        className={"project"}
        selectedIndex={tabIndex}
        onSelect={(index) => {
          setTabIndex(index);
          lastProjectTabIndex = index;
          props.project.saveFolderMetaData();
        }}
        css={css`
          // selection doesn't work if we these on the tabs themselves
          .tab-project-funding-project,
          .tab-project-collection-languages,
          .tab-project-collection-location {
            margin-left: 15px;
          }
        `}
      >
        <TabList>
          {/* <Tab className={"tab-project-about"} data-testid="project-about">
            <Trans>About This Project</Trans>
          </Tab> */}
          <Tab
            className={"tab-project-archive-configuration"}
            data-testid="project-configuration-tab"
          >
            <Trans>Archive</Trans>
          </Tab>
          {showCollectionTab && (
            <Tab
              className={"tab-project-collection"}
              data-testid="project-collection-tab"
            >
              <Trans>Collection</Trans>
            </Tab>
          )}
          <Tab
            className={"tab-project-funding-project"}
            data-testid="project-funding-project-tab"
          >
            <Trans>Funding Project</Trans>
          </Tab>
          <Tab
            className={"tab-project-collection-languages"}
            data-testid="project-collection-languages-tab"
          >
            <Trans>Languages</Trans>
          </Tab>{" "}
          <Tab
            className={"tab-project-collection-location"}
            data-testid="project-collection-location-tab"
          >
            <Trans>Location</Trans>
          </Tab>
          <Tab className={"tab-project-description-docs"}>
            <Trans>Description Documents</Trans>
          </Tab>
          <Tab className={"tab-project-other-docs"}>
            <Trans>Other Documents</Trans>
          </Tab>
          {GetOtherConfigurationSettings().archiveUsesImdi ? (
            <Tab className={"tab-project-imdi"}>
              IMDI {/* don't translate  */}
            </Tab>
          ) : (
            <></>
          )}
          {GetOtherConfigurationSettings().archiveUsesParadisec ? (
            <Tab className={"tab-project-paradisec"}>
              PARADISEC {/* don't translate  */}
            </Tab>
          ) : (
            <></>
          )}
          {userSettings.DeveloperMode ? (
            <Tab className={"tab-project-lameta"}>
              LaMeta {/* don't translate  */}
            </Tab>
          ) : (
            <></>
          )}
          {userSettings.DeveloperMode ? (
            <Tab className={"tab-project-rocrate"}>
              Ro-Crate {/* don't translate  */}
            </Tab>
          ) : (
            <></>
          )}
        </TabList>
        {/* <TabPanel>
          <AutoForm
            form="primary"
            formClass="project"
            folder={props.project}
            authorityLists={props.authorityLists}
            languageFinder={props.project.languageFinder}
            rowStyle={true}
          />
        </TabPanel> */}
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
          <AutoForm
            form="fundingProject"
            formClass="project"
            folder={props.project}
            authorityLists={props.authorityLists}
            languageFinder={props.project.languageFinder}
            rowStyle={true}
          />
        </TabPanel>
        <TabPanel>
          <AutoForm
            form="languages"
            formClass="project"
            folder={props.project}
            authorityLists={props.authorityLists}
            languageFinder={props.project.languageFinder}
            rowStyle={true}
            insertAfterField={{
              fieldKey: "collectionWorkingLanguages",
              content: (
                <MultilingualTextMigrationPanel project={props.project} />
              )
            }}
          />
        </TabPanel>{" "}
        <TabPanel>
          <AutoForm
            form="collectionLocation"
            formClass="project"
            folder={props.project}
            authorityLists={props.authorityLists}
            languageFinder={props.project.languageFinder}
            rowStyle={true}
          />
        </TabPanel>
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
        {GetOtherConfigurationSettings().archiveUsesImdi ? (
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
        {GetOtherConfigurationSettings().archiveUsesParadisec ? (
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
        {/* if in developer mode, show LametaXmlView */}
        {userSettings.DeveloperMode ? (
          <TabPanel>
            <LametaXmlView
              target={props.project}
              project={props.project}
              folder={props.project}
            />
          </TabPanel>
        ) : (
          <></>
        )}
        {/* if in developer mode, show RoCrate Export */}
        {userSettings.DeveloperMode ? (
          <TabPanel>
            <RoCrateView
              project={props.project}
              folder={props.project}
              doValidate={true}
            />
          </TabPanel>
        ) : (
          <></>
        )}
      </Tabs>
    </ThemeProvider>
  );
});
