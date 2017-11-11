import * as React from "react";
import { bindActionCreators } from "redux";
import { connect, Dispatch } from "react-redux";
import { SessionsTab, IProps } from "../components/SessionsTab";
import * as SessionActions from "../actions/sessionActions";
import { IState } from "../reducers";

function mapStateToProps(state: IState): Partial<IProps> {
  return {
    //counter: state.counter
  };
}

function mapDispatchToProps(dispatch: Dispatch<IState>): Partial<IProps> {
  return bindActionCreators(SessionActions as any, dispatch);
}

export default (connect(mapStateToProps, mapDispatchToProps)(SessionsTab) as any as React.StatelessComponent<any>);
