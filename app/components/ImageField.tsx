import * as React from "react";
import { observer } from "mobx-react";

export interface IProps {
  path: string;
}

// automatically update when the value changes
@observer
export default class ImageField extends React.Component<
  IProps & React.HTMLAttributes<HTMLDivElement>
> {
  constructor(props: IProps) {
    super(props);
  }

  public render() {
    return (
      <div className={"field " + this.props.className}>
        <img src={this.props.path} />
      </div>
    );
  }
}
