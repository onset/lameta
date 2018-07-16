import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
//import SessionsPage from "../containers/SessionsPage";
import { ComponentTab } from "./componentTab/ComponentTab";
import { IFolderSelection } from "../model/Folder";
import { observer } from "mobx-react";
import * as mobx from "mobx";
import { Session } from "../model/Project/Session/Session";
import { Person } from "../model/Project/Person/Person";
import { Project } from "../model/Project/Project";
import { ProjectTab } from "./project/ProjectTab";
import { AuthorityLists } from "../model/Project/AuthorityLists/AuthorityLists";
const styles = require("./Home.scss");
//import sessionIcon from "../../artwork/session.svg";
// const sessionIcon = require("../../artwork/Female_Selected.png");
//import * as sessionIcon from "./test.svg";
import { SessionIcon } from "./session/SessionIcon";
import { ProjectIcon } from "./project/ProjectIcon";
import { PeopleIcon } from "./people/PeopleIcon";
import { PeopleTab } from "./people/PeopleTab";
import { SessionsTab } from "./session/SessionsTab";
import SayLessMenu from "../menu";

export interface IProps {
  project: Project;
  authorityLists: AuthorityLists;
  menu: SayLessMenu;
}

@observer
export default class Home extends React.Component<IProps> {
  private kFirstTabToOpen = 2;
  // private currentTabIndex: number = this.kFirstTabToOpen;

  public constructor(props: IProps) {
    super(props);

    //review: I'm not sure this is the cleanest way to handle this...
    //at this time, electron doesn't appear to have a way to compute
    //menu enabled-ness at the last moment. So if we add or delete a
    // person or session, we need to update the corresponding menu
    // becuase this may be the first person/session, or there may
    // now be no persons/sessions.
    mobx.observe(this.props.project.selectedPerson, change => {
      this.UpdateMenus(2); // assume we are in the people tab at the moment
    });
    mobx.observe(this.props.project.selectedSession, change => {
      this.UpdateMenus(1); // assume we are in the people tab at the moment
    });
  }

  // NB: we have to actually reload menus becuase (as of this writing) electron menus
  // don't take an enabled function. They only take and enabled value. So you have
  // to reload the whole menu to control the enabled state of anything;
  // https://github.com/electron/electron/issues/528 is somewhat related
  private UpdateMenus(currentTabIndex: number) {
    let enable = currentTabIndex === 1;
    const sessionMenu = {
      label: "&Session",
      submenu: [
        {
          label: "New Session",
          enabled: enable,
          click: () => {
            if (this.props.project) {
              this.props.project.addSession();
            }
          }
        },
        { type: "separator" },
        {
          label: "Delete Session...",
          enabled: enable && this.props.project.canDeleteCurrentSession(),
          click: () => {
            if (this.props.project) {
              this.props.project.deleteCurrentSession();
            }
          }
        }
      ]
    };
    enable = currentTabIndex === 2;
    const peopleMenu = {
      label: "&People",
      submenu: [
        {
          label: "New Person",
          enabled: enable,
          click: () => {
            if (this.props.project) {
              this.props.project.addPerson();
            }
          }
        },
        { type: "separator" },
        {
          label: "Delete Person...",
          enabled: enable && this.props.project.canDeleteCurrentPerson(),
          click: () => {
            if (this.props.project) {
              this.props.project.deleteCurrentPerson();
            }
          }
        }
      ]
    };
    this.props.menu.updateMainMenu(sessionMenu, peopleMenu);
  }

  // just makes the sessions or person menu initially enabled if we are
  // starting with them. Otherwise they will be disabled until you click
  // on another tab and come back
  public componentDidMount() {
    this.UpdateMenus(this.kFirstTabToOpen);
  }
  public render() {
    return (
      <div
        id="topLevelOfOpenProjectScreen"
        className={styles.container}
        data-tid="container"
      >
        <Tabs
          className={"home"}
          defaultIndex={this.kFirstTabToOpen}
          onSelect={(index: number) => {
            this.props.project.saveAllFilesInFolder();
            this.UpdateMenus(index);
          }}
        >
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
