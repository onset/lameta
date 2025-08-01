import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import * as React from "react";
import userSettings from "../other/UserSettings";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import NotificationBar from "./NotificationsBar/NotificationBar";
import { observer } from "mobx-react";
import * as mobx from "mobx";
import { Project } from "../model/Project/Project";
import { ProjectTab } from "./project/ProjectTab";
import { AuthorityLists } from "../model/Project/AuthorityLists/AuthorityLists";
import { SessionIcon } from "./session/SessionIcon";
import { ProjectIcon } from "./project/ProjectIcon";
import { PeopleIcon } from "./people/PeopleIcon";
import { PeopleTab } from "./people/PeopleTab";
import { SessionsTab } from "./session/SessionsTab";
import LametaMenu from "../other/menu";
import { t, Trans } from "@lingui/macro";
import { analyticsLocation } from "../other/analytics";
import RegistrationReminder from "./RegistrationReminder";
import { SaveNotifier } from "./SaveNotifier";
import { CopyingStatus } from "./CopyingStatus";
import { ShowMessageDialog } from "./ShowMessageDialog/MessageDialog";
import { showSpreadsheetImportDialog } from "../components/import/SpreadsheetImportDialog";
import { IFolderType } from "../model/Folder/Folder";
import { MediaFolderDialog } from "./MediaFolderDialog";
import { ErrorBoundary } from "./ErrorBoundary";
import { lameta_blue, lameta_green, lameta_orange } from "../containers/theme";
export interface IProps {
  project: Project;
  authorityLists: AuthorityLists;
  menu: LametaMenu;
  reload: () => void;
}

class Home extends React.Component<IProps> {
  private kFirstTabToOpen = userSettings.DeveloperMode ? 0 : 0;

  public constructor(props: IProps) {
    super(props);

    // console.log("semver valid " + valid("v0.91-alpha.1"));
    // const x = new SemVer("V0.92-alpha");
    // console.log("semver x " + x);
    // console.log("semver compare " + compare("0.9.1-ALpha", "v0.9.1-Alpha"));
    //review: I'm not sure this is the cleanest way to handle this...
    //at this time, electron doesn't appear to have a way to compute
    //menu enabled-ness at the last moment. So if we add or delete a
    // person or session, we need to update the corresponding menu
    // because this may be the first person/session, or there may
    // now be no persons/sessions.
    mobx.observe(this.props.project.sessions, (change) => {
      this.UpdateMenus(1); // assume we are in the session tab at the moment
    });
    mobx.observe(this.props.project.persons, (change) => {
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
      id: "session",
      label: "&" + t`Session`,
      submenu: [
        {
          label: t`New Session`,
          enabled: enableMenu,
          click: () => {
            if (this.props.project) {
              this.props.project.addSession();
            }
          }
        },
        {
          label: t`Duplicate Session`,
          enabled: enableMenu && this.props.project.haveSelectedSession(),
          accelerator: "Ctrl+D",
          click: () => {
            if (this.props.project) {
              this.props.project.duplicateCurrentSession();
            }
          }
        },
        { type: "separator" },
        {
          id: "import_spreadsheet",
          label: "&" + t`Import Spreadsheet of Sessions` + "...",
          accelerator: "CmdOrCtrl+I",
          enabled: enableMenu,
          click: () => {
            showSpreadsheetImportDialog("session");
          }
        },
        { type: "separator" },
        {
          label: t`Delete Session...`,

          enabled: enableMenu && this.props.project.haveSelectedSession(),
          click: () => {
            if (this.props.project) {
              this.props.project.deleteCurrentSession();
            }
          }
        },
        {
          label: t`Delete Session`,
          accelerator: "Ctrl+Alt+K",
          enabled:
            enableMenu &&
            this.props.project.haveSelectedSession() &&
            userSettings.DeveloperMode,
          click: () => {
            if (this.props.project) {
              this.props.project.deleteFolder(
                this.props.project.sessions.items[
                  this.props.project.sessions.selectedIndex
                ]
              );
            }
          }
        },
        this.getDeleteMarkedMenuItem(
          "session",
          t`Delete All Marked Sessions...`,
          enableMenu
        )
      ]
    };
    enableMenu = currentTabIndex === 2;
    const peopleMenu = {
      label: "&" + t`People`,
      submenu: [
        {
          label: t`New Person`,
          enabled: enableMenu,
          click: () => {
            if (this.props.project) {
              this.props.project.addPerson();
            }
          }
        },
        {
          label: t`Duplicate Person`,
          enabled: enableMenu && this.props.project.haveSelectedPerson(),
          click: () => {
            if (this.props.project) {
              this.props.project.duplicateCurrentPerson();
            }
          }
        },
        { type: "separator" },
        {
          label: "&" + t`Import Spreadsheet of People` + "...",
          accelerator: "CmdOrCtrl+Alt+I",
          enabled: enableMenu,
          click: () => {
            showSpreadsheetImportDialog("person");
          }
        },
        { type: "separator" },
        {
          label: t`Delete Person...`,
          enabled: enableMenu && this.props.project.haveSelectedPerson(),
          click: () => {
            if (this.props.project) {
              this.props.project.deleteCurrentPerson();
            }
          }
        },
        this.getDeleteMarkedMenuItem(
          "person",
          t`Delete All Marked People...`,
          enableMenu
        )
      ]
    };
    this.props.menu.updateMainMenu(sessionMenu, peopleMenu);
  }
  private getDeleteMarkedMenuItem(
    folderType: IFolderType,
    label: string,
    enabled: boolean
  ): object {
    return {
      // this doesn't work because the count falls out of date (these menus cannot be updated on the fly)
      //label: t`Delete ${this.props.project.countOfMarkedSessions()} Marked Sessions...`,
      label: label,
      enabled: enabled, // doesn't work (see explanation above): && this.props.project.countOfMarkedSessions() > 0,
      click: () => {
        if (this.props.project) {
          if (
            (
              this.props.project.getFolderArrayFromType(folderType) as any
            ).countOfMarkedFolders() === 0
          ) {
            ShowMessageDialog({
              title: ``,
              text: `To select the items that you want to delete, first tick one or more boxes.`,
              buttonText: "Close"
            });
          } else this.props.project.deleteMarkedFolders(folderType);
        }
      }
    };
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
        data-tid="container"
        css={css`
          display: flex;
          flex-direction: row;
          height: 100%;
          left: 10px;
        `}
      >
        <div
          css={css`
            position: absolute;
            top: 0;
            right: 0;
            display: flex;
            * {
              margin: 10px;
            }
          `}
        >
          <CopyingStatus /> <RegistrationReminder />
        </div>
        <SaveNotifier />
        {/* MediaFolderDialog belongs here instead of at app because it relies on there being a current project */}
        <MediaFolderDialog />
        <div
          id="tabContainer"
          css={css`
            flex: 1; //grow to fill as much as is can (up to edge of notification bar)
            width: 100%; // else it goes beyond its parent
          `}
        >
          <Tabs
            key={tabsKey}
            defaultIndex={this.kFirstTabToOpen}
            onSelect={(index: number) => {
              this.props.project.saveAllFilesInFolder();
              this.UpdateMenus(index);
              analyticsLocation(["Project", "Sessions", "People"][index]);
            }}
            css={css`
              overflow: auto; // if scroll bars show, something is wrong, this is should size to the window
              height: 100%;
              flex: 1;
              display: flex;
              flex-direction: column;

              & > .react-tabs__tab-panel--selected {
                padding: 8px;
                height: 100%;
                display: flex;
                flex-direction: column;
                overflow: auto; // keeps it from growing beyond its parent
              }
              .tab-panel-project {
                background-color: ${lameta_orange};
              }
              .tab-panel-sessions {
                background-color: ${lameta_green};
              }
              .tab-panel-people {
                background-color: ${lameta_blue};
              }
              .icon-and-label {
                display: flex;
                align-items: center;

                img {
                  height: 24px;
                  margin-right: 8px;
                }
              }
            `}
          >
            <TabList style={{ margin: 0 }}>
              <Tab
                className={"react-tabs__tab tab-project"}
                data-testid="project-tab"
              >
                <div className={"icon-and-label"}>
                  <ProjectIcon />
                  <Trans>Project</Trans>
                </div>
              </Tab>
              <Tab
                className={"react-tabs__tab tab-sessions"}
                data-testid="sessions-tab"
              >
                <div className={"icon-and-label"}>
                  <SessionIcon />
                  <Trans>Sessions</Trans>
                </div>
              </Tab>
              <Tab
                className={"react-tabs__tab tab-people"}
                data-testid="people-tab"
              >
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
                reload={this.props.reload}
              />
            </TabPanel>
            <TabPanel className={"tab-panel-sessions"}>
              <ErrorBoundary>
                <SessionsTab
                  project={this.props.project}
                  authorityLists={this.props.authorityLists}
                />
              </ErrorBoundary>
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

export default observer(Home);
