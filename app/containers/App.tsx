import * as React from "react";
import HomePage from "./HomePage";
import DevTools from "mobx-react-devtools";
export default class App extends React.Component {
  render() {
    return (
      <div id="app">
        <HomePage/>
        <DevTools />
      </div>
    );
  }
}