import * as React from "react";
//import { RouteComponentProps } from "react-router";
import Home from "../components/Home";

export class HomePage extends React.Component<any> {
  render() {
    return (
      <Home sessions={[
          {title:"Community Members",date:"11-10-17",
          files:[
            {name:"Community Members", type:"Session",date:"11-10-17",size:"690 B"},
            {name:"community_members.eaf",type:"ELAN",date:"11-10-17",size:"111 KB"},
            {name:"community_members.mp3",type:"Audio",date:"11-10-17", size:"47 KB"}]},
          {title:"Flowers", date:"18-9-17",               files:[
            {name:"Flowers", type:"Session",date:"12-13-17",size:"670 B"},
            {name:"Flowers.eaf",type:"ELAN",date:"12-12-17",size:"222 KB"},
            {name:"Flowers.jpg",type:"Image",date:"12-11-17", size:"99 KB"}]},
      ]}/>
    );
  }
}

export default HomePage;
//export default (HomePage as any as React.StatelessComponent<RouteComponentProps<any>>);
