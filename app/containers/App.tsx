import * as React from "react";
import HomePage from "./HomePage";
import { hot } from "react-hot-loader";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog/ConfirmDeleteDialog";
import LanguagePickerDialog from "../components/LanguagePickerDialog/LanguagePickerDialog";
import * as ReactModal from "react-modal";
import RenameFileDialog from "../components/RenameFileDialog/RenameFileDialog";
import { I18nProvider } from "@lingui/react";
import { catalogs, currentUILanguage } from "../localization";
import RegistrationDialog from "../components/registration/RegistrationDialog";
import { SettingsContext, UserSettings } from "../UserSettings";
import * as mobx from "mobx-react";

@mobx.observer
export class App extends React.Component {
  public componentDidMount() {
    //ReactModal.setAppElement("#app");
    ReactModal!.defaultStyles!.overlay!.backgroundColor = "rgba(0,0,0,.5)";
  }

  private userSettings = new UserSettings();
  public render() {
    return (
      <div id="app">
        <SettingsContext.Provider value={this.userSettings}>
          <I18nProvider language={currentUILanguage} catalogs={catalogs}>
            <div id="registrationType">{this.userSettings.HowUsing}</div>

            <HomePage />
            <ConfirmDeleteDialog />
            <LanguagePickerDialog />
            <RenameFileDialog />
            <RegistrationDialog />
          </I18nProvider>
        </SettingsContext.Provider>
      </div>
    );
  }
}

// This restores hot module replacement *while preserving state*, which was lost when
// react-hot-loader dropped its react-hot-loader/webpack loader
// See https://github.com/gaearon/react-hot-loader/issues/923
declare const module: any;
export default hot(module)(App);
