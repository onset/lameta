import * as React from "react";
import { RouteComponentProps } from "react-router";
import Home from "../components/Home";

export class HomePage extends React.Component<RouteComponentProps<any>, void> {
  render() {
    return (
      <Home sessions={[{title:"Community Members",date:"11-10-17"},{title:"Flowers", date:"18-9-17"}]}/>
    );
  }
}

export default (HomePage as any as React.StatelessComponent<RouteComponentProps<any>>);
