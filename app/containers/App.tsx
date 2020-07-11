import { default as React, useState, useEffect } from "react";
import HomePage from "./HomePage";
import { hot } from "react-hot-loader";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog/ConfirmDeleteDialog";
import LanguagePickerDialog from "../components/LanguagePickerDialog/LanguagePickerDialog";
import * as ReactModal from "react-modal";
import RenameFileDialog from "../components/RenameFileDialog/RenameFileDialog";
import { I18nProvider } from "@lingui/react";
import { catalogs, currentUILanguage } from "../localization";
import RegistrationDialog from "../components/registration/RegistrationDialog";
import ButterToast from "butter-toast";
import userSettingsSingleton from "../UserSettings";
import { observer } from "mobx-react";

// being an "observer" make us refresh when mobx things change (namely, the uiFontZoom)
export const App: React.FunctionComponent = observer(() => {
  useEffect(() => {
    ReactModal!.defaultStyles!.overlay!.backgroundColor = "rgba(0,0,0,.5)";
  }, []); // just once

  // We need to set the base font size all the way up on body because tooltips and other special elements
  // are direct children of it. Note, I didn't find a way to dynamically change the font-size of the electron
  // browser, which would have made it possible to use rem units. So we do this and then stick with em units.
  useEffect(() => {
    document.body.style.fontSize = `${userSettingsSingleton.uiFontZoom * 13}px`;
  }, [userSettingsSingleton.FontZoom]);

  return (
    <div
      id="app"
      onWheel={(e) => {
        if (e.ctrlKey) {
          userSettingsSingleton.ZoomFont(e.deltaY < 0 ? 1 : -1);
        }
      }}
    >
      <I18nProvider language={currentUILanguage} catalogs={catalogs}>
        <HomePage />
        <ButterToast className={"notificationTray"} />
        <ConfirmDeleteDialog />
        <LanguagePickerDialog />
        <RenameFileDialog />
        <RegistrationDialog />
      </I18nProvider>
    </div>
  );
});

// This restores hot module replacement *while preserving state*, which was lost when
// react-hot-loader dropped its react-hot-loader/webpack loader
// See https://github.com/gaearon/react-hot-loader/issues/923
declare const module: any;
export default hot(module)(App);
