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

export const App: React.FunctionComponent = () => {
  const [fontZoom, setFontZoom] = useState(1.0);
  useEffect(() => {
    ReactModal!.defaultStyles!.overlay!.backgroundColor = "rgba(0,0,0,.5)";
  }, []); // just once

  // We need to set the base font size all the way up on body because tooltips and other special elements
  // are direct children of it. Note, I didn't find a way to dynamically change the font-size of the electron
  // browser, which would have made it possible to use rem units. So we do this and then stick with em units.

  useEffect(() => {
    document.body.setAttribute(
      "style",
      document.body.getAttribute("style") + `;font-size:${fontZoom * 13}px`
    );
  }, [fontZoom]);

  return (
    <div
      id="app"
      onWheel={(e) => {
        if (e.ctrlKey) {
          setFontZoom(Math.max(1.0, fontZoom + e.deltaY * -0.001));
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
};

// This restores hot module replacement *while preserving state*, which was lost when
// react-hot-loader dropped its react-hot-loader/webpack loader
// See https://github.com/gaearon/react-hot-loader/issues/923
declare const module: any;
export default hot(module)(App);
