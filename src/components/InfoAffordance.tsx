import React from "react";
import Tooltip from "react-tooltip-lite";

import infoIcon from "@assets/info.png";
import piiIcon from "@assets/pii.svg";
import willNotBeArchivedIcon from "@assets/not-archive.svg";
import notImportantToArchiveIcon from "@assets/archive-unimportant.svg";
import { Trans } from "@lingui/macro";
const tooltipBackground = "#3D5E90";
// just a little 🛈 with a tooltip of whatever children you give it
export const InfoAffordance: React.FunctionComponent<{
  children;
  className?; // enable emotion css from parent
}> = (props) => {
  return (
    // wrapping with a div helps the tooltip to be positioned correctly in some cases (e.g. Notes tab)
    <div className={props.className}>
      <Tooltip
        styles={{ display: "inline" }}
        background={tooltipBackground}
        color={"white"}
        content={props.children}
      >
        <img src={infoIcon} style={{ width: "1em", marginLeft: "5px" }} />
      </Tooltip>
    </div>
  );
};

export const PiiAffordance: React.FunctionComponent<{
  className?; // enable emotion css from parent
}> = (props) => {
  return (
    // wrapping with a div helps the tooltip to be positioned correctly in some cases (e.g. Notes tab)
    <div className={props.className}>
      <Tooltip
        styles={{ display: "inline" }}
        background={tooltipBackground}
        color={"white"}
        content={
          <Trans>
            This Personally Identifiable Information may not be exported by some
            formats.
          </Trans>
        }
      >
        <img src={piiIcon} style={{ height: "12px", marginLeft: "5px" }} />
      </Tooltip>
    </div>
  );
};

export const NotConsumedByArchive: React.FunctionComponent<{
  className?; // enable emotion css from parent
}> = (props) => {
  return (
    // wrapping with a div helps the tooltip to be positioned correctly in some cases (e.g. Notes tab)
    <div className={props.className}>
      <Tooltip
        styles={{ display: "inline" }}
        background={tooltipBackground}
        className="rounded-tooltip"
        color={"white"}
        content={<Trans>Will not be consumed by the archive</Trans>}
      >
        <img
          src={willNotBeArchivedIcon}
          style={{ height: "8px", marginLeft: "5px" }}
        />
      </Tooltip>
    </div>
  );
};

export const NotImportantToArchive: React.FunctionComponent<{
  className?; // enable emotion css from parent
}> = (props) => {
  return (
    // wrapping with a div helps the tooltip to be positioned correctly in some cases (e.g. Notes tab)
    <div className={props.className}>
      <Tooltip
        styles={{ display: "inline" }}
        background={tooltipBackground}
        className="rounded-tooltip"
        color={"white"}
        content={
          <Trans>Not important to the archive, but will be included</Trans>
        }
      >
        <img
          src={notImportantToArchiveIcon}
          style={{ height: "8px", marginLeft: "5px" }}
        />
      </Tooltip>
    </div>
  );
};
