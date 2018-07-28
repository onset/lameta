import * as React from "react";
import HomePage from "./HomePage";
import { hot } from "react-hot-loader";
import ConfirmDeleteDialog from "../components/ConfirmDeleteDialog/ConfirmDeleteDialog";
import ExportDialog from "../components/export/ExportDialog";
import * as ReactModal from "react-modal";

export class App extends React.Component {
  public componentDidMount() {
    //ReactModal.setAppElement("#app");
  }

  public render() {
    return (
      <div id="app">
        <HomePage />
        <ConfirmDeleteDialog />
        <ExportDialog />
      </div>
    );
  }
}

// This restores hot module replacement *while preserving state*, which was lost when
// react-hot-loader dropped its react-hot-loader/webpack loader
// See https://github.com/gaearon/react-hot-loader/issues/923
declare const module: any;
export default hot(module)(App);
