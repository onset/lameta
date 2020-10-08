import * as React from "react";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import NotificationBar from "./NotificationsBar/NotificationBar";
import { observer } from "mobx-react";
import * as mobx from "mobx";
import { Project } from "../model/Project/Project";
import { ProjectTab } from "./project/ProjectTab";
import { AuthorityLists } from "../model/Project/AuthorityLists/AuthorityLists";
const styles = require("./Workspace.scss");
import { SessionIcon } from "./session/SessionIcon";
import { ProjectIcon } from "./project/ProjectIcon";
import { PeopleIcon } from "./people/PeopleIcon";
import { PeopleTab } from "./people/PeopleTab";
import { SessionsTab } from "./session/SessionsTab";
import SayLessMenu from "../menu";
import SMErrorBoundary from "./SMErrorBoundary";
import { Trans } from "@lingui/react";
import { i18n } from "../localization";
import { t } from "@lingui/macro";
import { analyticsLocation } from "../analytics";
import RegistrationReminder from "./RegistrationReminder";
import { SaveNotifier } from "./SaveNotifier";

export interface IProps {
  project: Project;
  authorityLists: AuthorityLists;
  menu: SayLessMenu;
}

@observer
export default class Home extends React.Component<IProps> {
  private kFirstTabToOpen = 0;
  private notificationBar: NotificationBar | null;
  // private currentTabIndex: number = this.kFirstTabToOpen;

  public constructor(props: IProps) {
    super(props);

    //review: I'm not sure this is the cleanest way to handle this...
    //at this time, electron doesn't appear to have a way to compute
    //menu enabled-ness at the last moment. So if we add or delete a
    // person or session, we need to update the corresponding menu
    // because this may be the first person/session, or there may
    // now be no persons/sessions.
    mobx.observe(this.props.project.selectedSession, (change) => {
      this.UpdateMenus(1); // assume we are in the session tab at the moment
    });
    mobx.observe(this.props.project.selectedPerson, (change) => {
      this.UpdateMenus(2); // assume we are in the people tab at the moment
    });
  }

  // NB: we have to actually reload menus because (as of this writing) electron menus
  // don't take an enabled function. They only take and enabled value. So you have
  // to reload the whole menu to control the enabled state of anything;
  // https://github.com/electron/electron/issues/528 is somewhat related
  private UpdateMenus(currentTabIndex: number) {
    let enableMenu = currentTabIndex === 1;
    const sessionMenu = {
      label: "&" + i18n._(t`Session`),
      submenu: [
        {
          label: i18n._(t`New Session`),
          enabled: enableMenu,
          click: () => {
            if (this.props.project) {
              this.props.project.addSession();
            }
          },
        },
        {
          label: i18n._(t`Duplicate Session`),
          enabled: enableMenu && this.props.project.haveSelectedSession(),
          accelerator: "Ctrl+D",
          click: () => {
            if (this.props.project) {
              this.props.project.duplicateCurrentSession();
            }
          },
        },
        { type: "separator" },
        {
          label: i18n._(t`Delete Session...`),
          enabled: enableMenu && this.props.project.haveSelectedSession(),
          click: () => {
            if (this.props.project) {
              this.props.project.deleteCurrentSession();
            }
          },
        },
      ],
    };
    enableMenu = currentTabIndex === 2;
    const peopleMenu = {
      label: "&" + i18n._(t`People`),
      submenu: [
        {
          label: i18n._(t`New Person`),
          enabled: enableMenu,
          click: () => {
            if (this.props.project) {
              this.props.project.addPerson();
            }
          },
        },
        {
          label: i18n._(t`Duplicate Person`),
          enabled: enableMenu && this.props.project.haveSelectedPerson(),
          click: () => {
            if (this.props.project) {
              this.props.project.duplicateCurrentPerson();
            }
          },
        },
        { type: "separator" },
        {
          label: i18n._(t`Delete Person...`),
          enabled: enableMenu && this.props.project.haveSelectedPerson(),
          click: () => {
            if (this.props.project) {
              this.props.project.deleteCurrentPerson();
            }
          },
        },
      ],
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
    // by preventing re-use of the Tabs element, it causes us to reset to the first tab when the project changes
    const tabsKey = this.props.project.directory;

    return (
      <div
        id="topLevelOfOpenProjectScreen"
        className={styles.container}
        data-tid="container"
      >
        <SaveNotifier />
        <RegistrationReminder />
        <div id="tabContainer">
          <Tabs
            key={tabsKey}
            className={"tabComponent"}
            defaultIndex={this.kFirstTabToOpen}
            onSelect={(index: number) => {
              this.props.project.saveAllFilesInFolder();
              this.UpdateMenus(index);
              analyticsLocation(["Project", "Sessions", "People"][index]);
            }}
          >
            <TabList>
              <Tab className={"react-tabs__tab tab-project"}>
                <div className={"icon-and-label"}>
                  <ProjectIcon />
                  <Trans>Project</Trans>
                </div>
              </Tab>
              <Tab className={"react-tabs__tab tab-sessions"}>
                <div className={"icon-and-label"}>
                  <SessionIcon />
                  <Trans>Sessions</Trans>
                </div>
              </Tab>
              <Tab className={"react-tabs__tab tab-people"}>
                <div className={"icon-and-label"}>
                  <PeopleIcon />
                  <Trans>People</Trans>
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
              <SMErrorBoundary>
                <SessionsTab
                  project={this.props.project}
                  authorityLists={this.props.authorityLists}
                />
              </SMErrorBoundary>
            </TabPanel>
            <TabPanel className={"tab-panel-people"}>
              <PeopleTab
                project={this.props.project}
                authorityLists={this.props.authorityLists}
              />
            </TabPanel>
          </Tabs>
          {/* gets placed on top right of the tabs */}
          {/* <NotificationIndicator
            onClick={() => {
              if (this.notificationBar) {
                this.notificationBar.toggle();
              }
            }}
          /> */}
        </div>
        {/* <NotificationBar ref={r => (this.notificationBar = r)} /> */}
      </div>
    );
  }
}
