import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
//import SessionsPage from "../containers/SessionsPage";
import { ComponentTab } from "./ComponentTab";
import { IFolderSelection } from "../model/Folder";
import { observer } from "mobx-react";
import { Session } from "../model/Project/Session/Session";
import { Person } from "../model/Project/Person/Person";
import { Project } from "../model/Project/Project";
import { ProjectTab } from "./project/ProjectTab";
import { AuthorityLists } from "../model/Project/AuthorityLists/AuthorityLists";
const styles = require("./Home.scss");
//import sessionIcon from "../../artwork/session.svg";
// const sessionIcon = require("../../artwork/Female_Selected.png");
//import * as sessionIcon from "./test.svg";
import { SessionIcon } from "./SessionIcon";
import { ProjectIcon } from "./ProjectIcon";
import { PeopleIcon } from "./PeopleIcon";
import { PeopleTab } from "./PeopleTab";
import { SessionsTab } from "./SessionsTab";

export interface IProps {
  project: Project;
  authorityLists: AuthorityLists;
}

@observer
export default class Home extends React.Component<IProps> {
  public render() {
    return (
      <div className={styles.container} data-tid="container">
        <Tabs className={"home"} defaultIndex={2}>
          <TabList>
            <Tab className={"react-tabs__tab tab-project"}>
              <div className={"icon-and-label"}>
                <ProjectIcon />
                <span>Project</span>
              </div>
            </Tab>
            <Tab className={"react-tabs__tab tab-sessions"}>
              <div className={"icon-and-label"}>
                {/* <div dangerouslySetInnerHTML={{ __html: sessionIcon }} />
              <div dangerouslySetInnerHTML={{ __html: sessionIcon.data }} /> */}
                {/* <img src={sessionIcon} /> */}
                <SessionIcon />
                {/* <SessionIcon /> */}
                <span>Sessions</span>
              </div>
            </Tab>
            <Tab className={"react-tabs__tab tab-people"}>
              <div className={"icon-and-label"}>
                <PeopleIcon />
                <span>People</span>
              </div>
            </Tab>
          </TabList>
          <TabPanel className={"tab-panel-project"}>
            <ProjectTab
              project={this.props.project}
              authorityLists={this.props.authorityLists}
            />
          </TabPanel>
          <TabPanel className={"tab-panel-sessions"}>
            <SessionsTab
              project={this.props.project}
              authorityLists={this.props.authorityLists}
            />
          </TabPanel>
          <TabPanel className={"tab-panel-people"}>
            <PeopleTab
              project={this.props.project}
              authorityLists={this.props.authorityLists}
            />
          </TabPanel>
        </Tabs>
      </div>
    );
  }
}
