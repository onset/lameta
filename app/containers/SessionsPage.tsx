import * as React from "react";
import { bindActionCreators } from "redux";
import { connect, Dispatch } from "react-redux";
import { SessionsTab, SessionTabProps } from "../components/SessionsTab";
import * as SessionActions from "../actions/sessionActions";
import { IState } from "../reducers";

function mapStateToProps(state: IState): Partial<SessionTabProps> {
  return {
  };
}

function mapDispatchToProps(dispatch: Dispatch<IState>): Partial<SessionTabProps> {
  return bindActionCreators(SessionActions as any, dispatch);
}

export default (connect(mapStateToProps, mapDispatchToProps)(SessionsTab) as any as React.StatelessComponent<any>);