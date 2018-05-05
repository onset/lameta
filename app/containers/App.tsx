import * as React from "react";
import HomePage from "./HomePage";
import { hot } from "react-hot-loader";

export class App extends React.Component {
  public render() {
    return (
      <div id="app">
        <HomePage />
      </div>
    );
  }
}

// This restores hot module replacement *while preserving state*, which was lost when
// react-hot-loader dropped its react-hot-loader/webpack loader
// See https://github.com/gaearon/react-hot-loader/issues/923
declare const module: any;
export default hot(module)(App);
