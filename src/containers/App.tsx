import { default as React, useState, useEffect } from "react";
import { HomePage } from "./HomePage";
import { ConfirmDeleteDialog } from "../components/ConfirmDeleteDialog/ConfirmDeleteDialog";
import LanguagePickerDialog from "../components/LanguagePickerDialog/LanguagePickerDialog";
import * as ReactModal from "react-modal";
import { RenameFileDialog } from "../components/RenameFileDialog/RenameFileDialog";
import { I18nProvider } from "@lingui/react";
import { i18n } from "../other/localization";
import RegistrationDialog from "../components/registration/RegistrationDialog";
import userSettingsSingleton from "../other/UserSettings";
import { observer } from "mobx-react";
import { ReleasesDialog } from "../components/ReleasesDialog";
import { createLametaTheme } from "./theme";
import { ThemeProvider } from "@material-ui/core";

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

  // use a hook to only create the theme once
  const [theme] = useState(createLametaTheme());

  return (
    <div
      id="app"
      onWheel={(e) => {
        if (e.ctrlKey) {
          userSettingsSingleton.ZoomFont(e.deltaY < 0 ? 1 : -1);
        }
      }}
    >
      <I18nProvider i18n={i18n}>
        <ThemeProvider theme={theme}>
          <HomePage />
          <ConfirmDeleteDialog />
          <LanguagePickerDialog />
          <RenameFileDialog />
          <RegistrationDialog />
          <ReleasesDialog />
        </ThemeProvider>
      </I18nProvider>
    </div>
  );
});
