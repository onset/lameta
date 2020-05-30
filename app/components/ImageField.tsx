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
    //It doesn't find the file if I url encode the whole thing, but # messes it up (at least on windows)
    const safePath = this.props.path.replace(/#/g, "%23");
    //console.log("render ImageField");
    return (
      <div
        className={"field " + this.props.className}
        // style={{ backgroundImage: `url(${this.props.path})` }}
      >
        <img src={safePath} />
      </div>
    );
  }
}
