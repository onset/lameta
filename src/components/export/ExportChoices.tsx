import { css } from "@emotion/react";
/* removed emotion jsx declaration */

import * as React from "react";
import { t, Trans } from "@lingui/macro";
import { i18n } from "../../other/localization";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { Markdown } from "../Markdown";
import _ from "lodash";

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
            value="opex-plus-files"
            checked={props.exportFormat === "opex-plus-files"}
            onChange={(e) => props.setExportFormat(e.target.value)}
          />
          <Trans>OPEX + Files</Trans>
        </label>
        <p>
          <Trans>
            A folder containing all the project's archivable files, with IMDI
            wrapped for OPEX.
          </Trans>
        </p>
        <label>
          <input
            type="radio"
            name="format"
            value="ro-crate"
            checked={props.exportFormat === "ro-crate"}
            onChange={(e) => props.setExportFormat(e.target.value)}
          />
          <Trans>RO-Crate</Trans>
        </label>
        <p>
          <Markdown>
            {i18n._(
              "A [Research Object Crate (RO-Crate)](https://www.researchobject.org/ro-crate/) metadata file for the project. Targets the [LDAC](https://github.com/Language-Research-Technology/ldac-profile/blob/master/profile/profile.md) profile."
            )}
          </Markdown>
        </p>
      </fieldset>
      <div
        id="whichSessions"
        css={css`
          margin-top: 15px;
        `}
      >
        <FormControl
          fullWidth
          css={css`
            max-width: 300px;
          `}
        >
          <InputLabel id="which-sessions-label">
            <Trans>Choose which Sessions to export:</Trans>
          </InputLabel>
          <Select
            labelId="which-sessions-label"
            value={props.whichSessionsOption}
            label="Choose which Sessions to export"
            onChange={(event) => {
              props.setWhichSessionsOption(event.target.value);
            }}
          >
            <MenuItem value="all">{t`All Sessions`}</MenuItem>
            <MenuItem
              value="marked"
              disabled={props.countOfMarkedSessions === 0}
            >
              {t`${props.countOfMarkedSessions} Marked Sessions`}
            </MenuItem>
          </Select>
        </FormControl>
      </div>
    </div>
  );
};
