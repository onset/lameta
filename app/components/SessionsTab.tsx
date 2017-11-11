
import * as React from "react";
import { SessionList } from "./SessionList";
import {ISession} from "./SessionModel";
import { SingleSessionPane } from "./SingleSessionPane";
let styles = require("./Sessions.scss");

export interface SessionTabProps {
  sessions: ISession[];
  selectedSessionIndex: number;
}

export class SessionsTab extends React.Component<SessionTabProps> {
  render() {
    return (
        <div className={styles.sessionsTab}>
          <SessionList sessions={this.props.sessions} selectedSessionIndex={this.props.selectedSessionIndex}/>
          <SingleSessionPane session={this.props.sessions[this.props.selectedSessionIndex]}/>
        </div>
      );
    }
}