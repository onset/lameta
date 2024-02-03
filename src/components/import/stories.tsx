import { css } from "@emotion/react";

import React from "react";
import * as fs from "fs-extra";
import { Story, Meta } from "@storybook/react";
import * as XLSX from "xlsx";
import Spreadsheet from "react-spreadsheet";
export default {
  title: "Sheet"
} as Meta;

export const ReactSpreadsheet: Story = () => {
  const raw = [
    [
      "date",
      "title",
      "filename",
      "description",
      "location_region",
      "location_continent",
      "location_country",
      "location_local",
      "archive_repository",
      "genre",
      "subgenre",
      "topic",
      "keywords",
      "involvement",
      "planning",
      "social_context",
      "subject_languages",
      "working_languages",
      "access_AILCA",
      "access_AILLA",
      "access_ANLA",
      "access_ELAR",
      "access_PARADISEC",
      "access_TLA",
      "access_REAP",
      "access_custom",
      "access_explanation",
      "video",
      "microphone",
      "audio",
      "other_equipment",
      "recording_conditions",
      "participant_1_full_name",
      "participant_1_role",
      "participant_2_full_name",
      "participant_2_role",
      "participant_3_full_name",
      "participant_3_role",
      "participant_4_full_name",
      "participant_4_role",
      "participant_5_full_name",
      "participant_5_role"
    ],
    ["2021-06-10T06:00:00.000Z", "Take California", "take.mp3"]
  ];

  const data = raw.map((r) => r.map((c) => ({ value: c })));

  return (
    <Spreadsheet
      data={data}
      css={css`
        * {
          font-family: roboto;
        }
      `}
    ></Spreadsheet>
  );
};
