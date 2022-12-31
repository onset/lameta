import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import * as React from "react";
import { t, Trans } from "@lingui/macro";
import { i18n } from "../../other/localization";

export const ExportChoices: React.FunctionComponent<{
  exportFormat: string;
  setExportFormat: (format: string) => void;
  whichSessionsOption: string;
  setWhichSessionsOption: (session: string) => void;
  countOfMarkedSessions: number;
  setCountOfMarkedSessions: (n: number) => void;
}> = (props) => {
  return (
    <div>
      <fieldset>
        <legend>
          <Trans>Choose an export format:</Trans>
        </legend>
        <label>
          <input
            type="radio"
            name="format"
            value="csv"
            checked={props.exportFormat === "csv"}
            onChange={(e) => props.setExportFormat(e.target.value)}
          />
          <Trans>Zip of CSVs</Trans>
        </label>
        <p>
          <Trans>
            A single zip archive that contains one comma-separated file for each
            of Project, Sessions, and People.
          </Trans>
        </p>
        <label>
          <input
            type="radio"
            name="format"
            value="paradisec"
            checked={props.exportFormat === "paradisec"}
            onChange={(e) => props.setExportFormat(e.target.value)}
          />
          <Trans>Paradisec CSV</Trans>
        </label>
        <p>
          <Trans>
            A single comma-separated file with project information followed by
            one row per session. Many lameta fields are omitted.
          </Trans>
        </p>
        {/* <label>
                <input
                  type="radio"
                  name="format"
                  value="spreadsheet"
                  checked={true}
                  disabled={true}
                />
                Spreadsheet (not implemented yet)
              </label>
              <p>
                A single file with sheets for each of Project, Session, and
                People
              </p> */}
        <label>
          <input
            type="radio"
            name="format"
            value="imdi"
            checked={props.exportFormat === "imdi"}
            onChange={(e) => props.setExportFormat(e.target.value)}
          />
          <Trans>IMDI Only</Trans>
        </label>
        <p>
          <Trans>
            A folder with an IMDI file for the project and each session.
          </Trans>
        </p>
        <label>
          <input
            type="radio"
            name="format"
            value="imdi-plus-files"
            checked={props.exportFormat === "imdi-plus-files"}
            onChange={(e) => props.setExportFormat(e.target.value)}
          />
          <Trans>IMDI + Files</Trans>
        </label>
        <p>
          <Trans>
            A folder containing both the IMDI files and all the project's
            archivable files.
          </Trans>
        </p>
      </fieldset>
      <div id="whichSessions">
        <label>
          <Trans>Choose which Sessions to export:</Trans>
        </label>
        <select
          name={"Which sessions to export"}
          value={props.whichSessionsOption}
          onChange={(event) => {
            props.setWhichSessionsOption(event.target.value);
          }}
        >
          <option key={"all"} value={"all"}>
            {t`All Sessions`}
          </option>
          <option
            key={"marked"}
            value={"marked"}
            disabled={props.countOfMarkedSessions === 0}
          >
            {t`${props.countOfMarkedSessions} Marked Sessions`}
          </option>
        </select>
      </div>
    </div>
  );
};
