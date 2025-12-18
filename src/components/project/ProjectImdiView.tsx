import * as React from "react";
import { css } from "@emotion/react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { Project } from "../../model/Project/Project";
import { ImdiView } from "../ImdiView";
import { DocumentFolderImdiView } from "./DocumentFolderImdiView";
import { ConsentImdiView } from "./ConsentImdiView";

interface IProps {
  project: Project;
}

/**
 * A tabbed IMDI view for the project tab that shows:
 * - Project IMDI (the corpus-level IMDI)
 * - Description Documents IMDI
 * - Other Documents IMDI
 * - Consent Documents IMDI
 */
export const ProjectImdiView: React.FunctionComponent<IProps> = (props) => {
  const [tabIndex, setTabIndex] = React.useState(0);

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        height: 100%;
        overflow: hidden;
      `}
    >
      <Tabs
        selectedIndex={tabIndex}
        onSelect={(index) => setTabIndex(index)}
        css={css`
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          overflow: hidden;

          .react-tabs__tab-list {
            margin: 0 0 10px 0;
            padding: 0;
            border-bottom: 1px solid #ccc;
          }

          .react-tabs__tab {
            display: inline-block;
            padding: 6px 12px;
            cursor: pointer;
            border: 1px solid transparent;
            border-bottom: none;
            position: relative;
            bottom: -1px;
            list-style: none;
          }

          .react-tabs__tab--selected {
            background: #fff;
            border-color: #ccc;
            border-bottom-color: #fff;
            border-radius: 4px 4px 0 0;
          }

          .react-tabs__tab-panel {
            display: none;
            flex-grow: 1;
            overflow: hidden;
          }

          .react-tabs__tab-panel--selected {
            display: flex;
            flex-direction: column;
          }
        `}
      >
        <TabList>
          <Tab>Project</Tab>
          <Tab>Description Documents</Tab>
          <Tab>Other Documents</Tab>
          <Tab>Consent Documents</Tab>
        </TabList>

        <TabPanel>
          <ImdiView
            target={props.project}
            project={props.project}
            folder={props.project}
          />
        </TabPanel>

        <TabPanel>
          <DocumentFolderImdiView
            project={props.project}
            folder={props.project.descriptionFolder}
            name="DescriptionDocuments"
            title="Description Documents"
            description="This bundle contains descriptive documents about the documentation project."
          />
        </TabPanel>

        <TabPanel>
          <DocumentFolderImdiView
            project={props.project}
            folder={props.project.otherDocsFolder}
            name="OtherDocuments"
            title="Other Documents"
            description="This bundle contains other project documents."
          />
        </TabPanel>

        <TabPanel>
          <ConsentImdiView project={props.project} />
        </TabPanel>
      </Tabs>
    </div>
  );
};
