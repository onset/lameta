// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */
import * as React from "react";
import ReactModal from "react-modal";
import CloseOnEscape from "react-close-on-escape";
import { Trans } from "@lingui/react";
import { UpdateInfo } from "electron-updater";

let staticUpdateAvailableDialog: (info: UpdateInfo) => void = () => {};
export { staticUpdateAvailableDialog as ShowUpdateAvailableDialog };

export const UpdateAvailableDialog: React.FunctionComponent<{}> = (props) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [updateInfo, setUpateInfo] = React.useState<UpdateInfo | undefined>({
    releaseNotes: `Where does it come from?
Contrary to popular belief, Lorem Ipsum is not simply random text. It has roots in a piece of classical Latin literature from 45 BC, making it over 2000 years old. Richard McClintock, a Latin professor at Hampden-Sydney College in Virginia, looked up one of the more obscure Latin words, consectetur, from a Lorem Ipsum passage, and going through the cites of the word in classical literature, discovered the undoubtable source. Lorem Ipsum comes from sections 1.10.32 and 1.10.33 of "de Finibus Bonorum et Malorum" (The Extremes of Good and Evil) by Cicero, written in 45 BC. This book is a treatise on the theory of ethics, very popular during the Renaissance. The first line of Lorem Ipsum, "Lorem ipsum dolor sit amet..", comes from a line in section 1.10.32.
<p>The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.</p><p>The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.</p><p>The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.</p><p>The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.</p><p>The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.</p><p>The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.</p><p>The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.</p><p>The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.</p>
<p>The standard chunk of Lorem Ipsum used since the 1500s is reproduced below for those interested. Sections 1.10.32 and 1.10.33 from "de Finibus Bonorum et Malorum" by Cicero are also reproduced in their exact original form, accompanied by English versions from the 1914 translation by H. Rackham.</p>`,
    version: "1.2.3",
    releaseDate: "x",
    files: [],
    path: "",
    sha512: "",
  });

  staticUpdateAvailableDialog = (info: UpdateInfo) => {
    setUpateInfo(info);
    setIsOpen(true);
  };
  return (
    <CloseOnEscape onEscape={() => setIsOpen(false)}>
      <ReactModal
        ariaHideApp={false}
        className="messageDialog"
        isOpen={true}
        shouldCloseOnOverlayClick={true}
        onRequestClose={() => setIsOpen(false)}
      >
        <div
          className="dialogContent"
          css={css`
            width: 700px;
            height: 800px;
          `}
        >
          <h1>Release notes for lameta version {updateInfo?.version}</h1>
          <div
            className="row"
            css={css`
              max-height: 500px;
              scroll-behavior: auto;
            `}
          >
            <div
              dangerouslySetInnerHTML={{
                __html: `<div>${updateInfo?.releaseNotes}</div>`,
              }}
            ></div>
          </div>
        </div>
        <div className={"bottomButtonRow"}>
          <div className={"okCancelGroup"}>
            <button id="Cancel" onClick={() => setIsOpen(false)}>
              <Trans>Download and Install</Trans>
            </button>
            <button id="Cancel" onClick={() => setIsOpen(false)}>
              <Trans>Not Now</Trans>
            </button>
          </div>
        </div>
      </ReactModal>
    </CloseOnEscape>
  );
};

{
  /* <p>{`Your current version is  ${current.version + current.channel}`}</p>; */
}
