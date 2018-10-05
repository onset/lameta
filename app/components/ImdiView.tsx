import * as React from "react";
import { Folder } from "../model/Folder";
import ImdiGenerator from "../export/ImdiGenerator";
import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { Person } from "../model/Project/Person/Person";
import { File } from "../model/file/File";
//import SyntaxHighlighter from 'react-syntax-highlighter';
import "./ImdiView.scss";

import SyntaxHighlighter, {
  registerLanguage
} from "react-syntax-highlighter/light";
import xmlLang from "react-syntax-highlighter/languages/hljs/xml";
import syntaxStyle from "./ImdiSyntaxStyle";
registerLanguage("xml", xmlLang);

//const HtmlTree = require("react-htmltree");

export interface IProps {
  // including the function prevented the react hot loader from giving us new xml
  // when the code changed
  //contentGenerator: (folder: Folder) => string;
  target: any;

  // note, folder will equal project if we're generating at the project level
  // otherwise, folder will be a session or person
  project: Project;
}
interface IState {
  manualRefresh: number;
}
export default class ImdiView extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = { manualRefresh: 0 };
  }

  public render() {
    let xml = "";

    if (this.props.target instanceof Session) {
      xml = ImdiGenerator.generateSession(
        this.props.target as Session,
        this.props.project
      );
    } else if (this.props.target instanceof Project) {
      xml = ImdiGenerator.generateCorpus(this.props.target as Project);
    } else if (this.props.target instanceof Person) {
      const generator = new ImdiGenerator(
        this.props.target,
        this.props.project
      );
      xml = generator.actor(this.props.target as Person) as string;
    } else if (this.props.target instanceof File) {
      const generator = new ImdiGenerator(
        this.props.project,
        this.props.project
      );
      xml = generator.resourceFile(this.props.target as File) as string;
    }

    return (
      <div className={"imdiView"}>
        <div className={"imdiButtonRow"}>
          {/* <input
            type="button"
            value="Refresh"
            onClick={() => {
              this.setState({ manualRefresh: this.state.manualRefresh + 1 });
            }}
          /> */}
        </div>
        {/* <textarea
          readOnly
          className={"imdiView"}
          value={xml}
          // this.props.contentGenerator(this.props.folder) +
          // this.state.manualRefresh
        /> */}
        <SyntaxHighlighter language="xml" style={syntaxStyle}>
          {xml}
        </SyntaxHighlighter>
      </div>
    );
  }
}
