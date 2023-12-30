import React from "react";
import Tooltip from "react-tooltip-lite";

import infoIcon from "@assets/info.svg";
import commaSeparatedIcon from "@assets/comma-separated.svg";
import piiIcon from "@assets/pii.svg";
import willNotBeArchivedIcon from "@assets/not-archive.svg";
import notImportantToArchiveIcon from "@assets/archive-unimportant.svg";
import { Trans } from "@lingui/macro";
import { tooltipBackground } from "../containers/theme";

const iconStyle = { height: "1em", marginLeft: "5px" };
const colors = {
  background: tooltipBackground,
  color: "white"
};

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
        <img src={infoIcon} style={iconStyle} />
      </Tooltip>
    </div>
  );
};

export const CommaSeparatedAffordance: React.FunctionComponent<{
  children;
  className?; // enable emotion css from parent
}> = (props) => {
  return (
    // wrapping with a div helps the tooltip to be positioned correctly in some cases (e.g. Notes tab)
    <div className={props.className}>
      <Tooltip
        styles={{ display: "inline" }}
        {...colors}
        content={props.children}
      >
        <img src={commaSeparatedIcon} style={{ ...iconStyle }} />
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
        {...colors}
        content={
          <Trans>
            This Personally Identifiable Information may not be exported by some
            formats.
          </Trans>
        }
      >
        <img src={piiIcon} style={{ ...iconStyle, height: "1em" }} />
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
        {...colors}
        content={
          <Trans>
            This will not be consumed by the archive. It is only for the use of
            the researcher.
          </Trans>
        }
      >
        <img
          src={willNotBeArchivedIcon}
          style={{ ...iconStyle, height: ".7em" }}
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
        {...colors}
        content={
          <Trans>Not important to the archive, but will be included</Trans>
        }
      >
        <img
          src={notImportantToArchiveIcon}
          style={{ ...iconStyle, height: "8px" }}
        />
      </Tooltip>
    </div>
  );
};
