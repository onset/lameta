import * as React from "react";
import HomePage from "./HomePage";
import { hot } from "react-hot-loader";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog/ConfirmDeleteDialog";
import LanguagePickerDialog from "../components/LanguagePickerDialog/LanguagePickerDialog";
import * as ReactModal from "react-modal";
import RenameFileDialog from "../components/RenameFileDialog/RenameFileDialog";
import { I18nProvider } from "@lingui/react";
import { catalogs, currentUILanguage, setUILanguage } from "../localization";
import RegistrationDialog from "../components/registration/RegistrationDialog";

export class App extends React.Component {
  public componentDidMount() {
    //ReactModal.setAppElement("#app");
    ReactModal!.defaultStyles!.overlay!.backgroundColor = "rgba(0,0,0,.5)";
  }

  public render() {
    return (
      <div id="app">
        <I18nProvider language={currentUILanguage} catalogs={catalogs}>
          <HomePage />
          <ConfirmDeleteDialog />
          <LanguagePickerDialog />
          <RenameFileDialog />
          <RegistrationDialog />
        </I18nProvider>
      </div>
    );
  }
}

// This restores hot module replacement *while preserving state*, which was lost when
// react-hot-loader dropped its react-hot-loader/webpack loader
// See https://github.com/gaearon/react-hot-loader/issues/923
declare const module: any;
export default hot(module)(App);
