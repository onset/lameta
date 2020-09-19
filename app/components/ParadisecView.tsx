// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import { default as React, useState, useEffect } from "react";
import { Folder } from "../model/Folder/Folder";
import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { makeParadisecProjectFields } from "../export/ParadisecCsvExporter";

//const HtmlTree = require("react-htmltree");

export interface IProps {
  // including the function prevented the react hot loader from giving us new xml
  // when the code changed
  //contentGenerator: (folder: Folder) => string;
  target: any;

  // note, folder will equal project if we're generating at the project level
  // otherwise, folder will be a session or person
  project: Project;

  folder: Folder;
}
interface IState {
  manualRefresh: number;
}

export const ParadisecView: React.FunctionComponent<{
  target: any;

  // note, folder will equal project if we're generating at the project level
  // otherwise, folder will be a session or person
  project: Project;

  folder: Folder;
}> = (props) => {
  // public render() {
  //   let xml = "";

  //   if (this.props.target instanceof Session) {
  //     xml = ImdiGenerator.generateSession(
  //       this.props.target as Session,
  //       this.props.project
  //     );
  //   } else if (this.props.target instanceof Project) {

  //   }

  const rows = makeParadisecProjectFields(props.project);

  return (
    <div>
      <h3>
        This is a preview of what will be export by File:Export
        Project:PARADISEC
      </h3>
      <table
        className={"paradisecView"}
        css={css`
          td {
            vertical-align: text-top;
          }
          td:first-of-type {
            width: 175px;
          }
        `}
      >
        {rows.map((columns) => {
          return (
            <tr>
              {columns.map((c) => (
                <td>{c}</td>
              ))}
            </tr>
          );
        })}
      </table>
    </div>
  );
};
