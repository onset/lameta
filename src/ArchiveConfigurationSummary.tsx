import * as React from "react";
import { css } from "@emotion/react";
import { AuthorityLists } from "./model/Project/AuthorityLists/AuthorityLists";
import { IChoice } from "./model/field/Field";

// Shows the access levels of an archive configuration
const ArchiveConfigurationSummary: React.FunctionComponent<
  {
    configurationName: string;
    configurationChoice: IChoice;
    authorityLists: AuthorityLists;
  } & React.HTMLAttributes<HTMLDivElement>
> = (props) => {
  console.log("****", props.configurationName);

  const currentConfiguration: { choices: IChoice[] } | undefined =
    props.authorityLists.accessProtocolLists.find(
      (p) => p.archiveConfigurationName == props.configurationName,
    );

  if (!currentConfiguration) {
    return <div>Configuration not found</div>;
  }
  const sectionBoxStyle = css`
    border: solid thin;
    border-radius: 4px;
    background-color: white;
    padding: 10px;
    border-color: #0000005e;
  `;
  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        gap: 10px;
        li {
          // don't show a bullet point
          list-style-type: none;
        }
      `}
    >
      <div css={sectionBoxStyle}>
        <h3
          css={css`
            margin-block-end: 1em;
          `}
        >
          Available Access Levels
        </h3>
        <ul
          css={css`
            li {
              margin-bottom: 1em;
            }
          `}
        >
          {currentConfiguration.choices.map((choice) => (
            <li key={choice.label}>
              <div>
                <b>{choice.label}</b>
              </div>
              {choice.description}
            </li>
          ))}
        </ul>
      </div>
      {/* About section commented out
      {props.configurationChoice.extra &&
        Object.entries(props.configurationChoice.extra).filter(
          ([key]) => key !== "archiveUsesImdi"
        ).length > 0 && (
          <div css={sectionBoxStyle}>
            <h3>About</h3>
            {props.configurationChoice.extra.url && (
              <li key="url">{props.configurationChoice.extra.url}</li>
            )}
            {Object.entries(props.configurationChoice.extra)
              .filter(([key]) => key !== "url" && key !== "archiveUsesImdi")
              .map((setting: [string, any]) => {
                const [key, value] = setting;
                if (key === "description") {
                  return <li key={key}>{value}</li>;
                }
                return <li key={key}>{`${key}: ${value}`}</li>;
              })}
          </div>
        )}
      */}
    </div>
  );
};
export { ArchiveConfigurationSummary };
