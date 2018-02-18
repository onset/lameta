import * as React from "react";
//const HtmlTree = require("react-htmltree");

export interface IProps {
  contentGenerator: () => string;
}

export default class XmlExportView extends React.Component<IProps> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    return (
      <textarea
        readOnly
        className={"imdiView"}
        value={this.props.contentGenerator()}
      />
    );
  }
}
