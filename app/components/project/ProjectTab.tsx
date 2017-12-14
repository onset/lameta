import * as React from "react";
import { observer } from "mobx-react";
import { Project } from "../../model/Project";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import ProjectAbout from "./ProjectAbout";
import ProjectAccessProtocol from "./ProjectAccessProtocol";

interface IProps {
  project: Project;
}

@observer
export class ProjectTab extends React.Component<IProps> {
  public render() {
    return (
      <Tabs className={"project"}>
        <TabList>
          <Tab>About This Project</Tab>
          <Tab>Access Protocol</Tab>
        </TabList>
        <TabPanel>
          <ProjectAbout
            project={this.props.project}
            fields={this.props.project.properties}
          />
        </TabPanel>
        <TabPanel>
          <ProjectAccessProtocol
            project={this.props.project}
            fields={this.props.project.properties}
          />
        </TabPanel>
      </Tabs>
    );
  }
}
