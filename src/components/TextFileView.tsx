import * as React from "react";
import * as fs from "fs";
import "./TextFileView.scss";

export interface IProps {
  path: string;
}
export interface IState {
  text: string;
}
export default class TextFileView extends React.Component<IProps, IState> {
  constructor(props: IProps) {
    super(props);
    this.state = {
      text: ""
    };
  }

  public componentDidMount() {
    this.readTextFile(this.props.path);
  }

  public readTextFile(path: string) {
    fs.readFile(path, "utf-8", (err, data) => {
      if (err) {
        this.setState({ text: err.message });
      } else {
        this.setState({ text: data });
      }
    });
  }

  public render() {
    return (
      <div className={"textView"}>
        {this.state.text.split("\n").map((line: string, key) => {
          return <p key={key}>{line}</p>;
        })}
      </div>
    );
  }
}
