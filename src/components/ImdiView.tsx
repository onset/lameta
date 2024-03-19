import * as React from "react";
import { css } from "@emotion/react";
import { Folder } from "../model/Folder/Folder";
import ImdiGenerator, { IMDIMode } from "../export/ImdiGenerator";
import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { Person } from "../model/Project/Person/Person";
import { File } from "../model/file/File";
import SyntaxHighlighter, {
  registerLanguage
} from "react-syntax-highlighter/light";
import xmlLang from "react-syntax-highlighter/languages/hljs/xml";
import syntaxStyle from "./ImdiSyntaxStyle";
import { mainProcessApi } from "../mainProcess/MainProcessApiAccess";
import { XMLValidationResult } from "xmllint-wasm";
import Alert from '@mui/material/Alert';
import { Trans } from "@lingui/macro";
registerLanguage("xml", xmlLang);

export const ImdiView: React.FunctionComponent<{
  // including the function prevented the react hot loader from giving us new xml
  // when the code changed
  //contentGenerator: (folder: Folder) => string;
  target: any;

  // note, folder will equal project if we're generating at the project level
  // otherwise, folder will be a session or person
  project: Project;

  folder: Folder;
}> = (props) => {
  const [imdi, setImdi] = React.useState<string>("");

  const [
    rulesBasedValidationResult,
    SetRulesBasedValidationResult
  ] = React.useState<string | undefined>();

  const [validationResult, SetValidationResult] = React.useState<
    XMLValidationResult | undefined
  >();

  React.useEffect(() => {
    if (props.target instanceof Session) {
      SetRulesBasedValidationResult(
        (props.target as Session).getRulesViolationsString(
          props.project.persons.items.map((p) =>
            p.properties.getTextStringOrEmpty(p.propertyForCheckingId)
          )
        )
      );
    }
  }, [props.target, props.project, props.folder]);

  React.useEffect(() => {
    if (props.target instanceof Session) {
      setImdi(
        ImdiGenerator.generateSession(
          IMDIMode.RAW_IMDI,
          props.target as Session,
          props.project
        )
      );
    } else if (props.target instanceof Project) {
      setImdi(
        ImdiGenerator.generateCorpus(
          IMDIMode.RAW_IMDI,
          props.target as Project,
          new Array<string>() /* we don't bother to compute the children IMDI's for this view */
        )
      );
    } else if (props.target instanceof Person) {
      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        props.target,
        props.project
      );
      setImdi(
        generator.actor(
          props.target as Person,
          "will get role in context of session",
          new Date() // normally this will be the date of the session for which the IMDI is being exported, but for here we can use today
        ) as string
      );
    } else if (props.target instanceof File) {
      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        props.folder,
        props.project
      );
      setImdi(generator.resourceFile(props.target as File) as string);
    }
  }, [props.target, props.project, props.folder]);

  // when the imdi changes, run the validator
  React.useEffect(() => {
    if (imdi)
      mainProcessApi.validateImdiAsync(wrapForValidation(imdi)).then((r) => {
        SetValidationResult(r);
      });
  }, [imdi]);
  return (
    <div
      css={css`
        // Enhance: the size and scrolling of this got all messed up with the switch to electron 6
        // (though it could have been anything). It's currently a hack.
        height: 500px;
        width: 100%;

        display: flex;
        flex-direction: column;
        flex-grow: 1; // <--  grow to fit available space and then...
        overflow: hidden; // <-- ... show scroll if too big, instead of just going off the screen.
        code,
        code * {
          font-family: sans-serif;
          white-space: pre-wrap;
        }
        pre {
          flex: 1; // fill space
        }
      `}
    >
      {rulesBasedValidationResult && (
        <>
          <Alert severity="warning">{rulesBasedValidationResult}</Alert>
          <br />
        </>
      )}
      {validationResult?.valid && (
        <Alert severity="success">
          <Trans>This XML conforms to the IMDI schema.</Trans>
        </Alert>
      )}
      {validationResult && !validationResult.valid && (
        <Alert severity="error">
          {validationResult?.errors.map((e) => {
            return (
              <div
                css={css`
                  margin: 0;
                  font-weight: 500;

                  white-space: pre-wrap;
                `}
              >
                {e.message}
              </div>
            );
          })}
        </Alert>
      )}
      <SyntaxHighlighter
        language="xml"
        style={{ ...syntaxStyle, marginTop: 0, paddingTop: 0 }}
      >
        {imdi}
      </SyntaxHighlighter>
    </div>
  );
};

function wrapForValidation(imdi: string): string {
  // if the imdi is Actor, wrap it in a Session so that it can be validated
  if (imdi.startsWith("<Actor")) {
    return `<?xml version="1.0"?>
  <METATRANSCRIPT xmlns="http://www.mpi.nl/IMDI/Schema/IMDI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.mpi.nl/IMDI/Schema/IMDI_3.0.xsd" Type="SESSION" Version="0" Date="2023-11-21" Originator="lameta 2.1.2-alpha" FormatId="IMDI 3.0" ArchiveHandle="">
    <Session>
      <Name>foo</Name>
      <Title>foo</Title>
      <Date>2000-01-01</Date>
      <MDGroup>
        <Location>
          <Continent Link="http://www.mpi.nl/IMDI/Schema/Continents.xml" Type="ClosedVocabulary">Oceania</Continent>
          <Country Link="http://www.mpi.nl/IMDI/Schema/Countries.xml" Type="OpenVocabulary">Solomon Islands</Country>
        </Location>
    
        <Project>
          <Name>foo</Name>
          <Title>foo</Title>
          <Id>foo</Id>
          <Contact>
            <Name>foo</Name>
          </Contact>
          <Description>foo</Description>
        </Project>
        <Keys/>
        <Content>
          <Genre Link="http://www.mpi.nl/IMDI/Schema/Content-Genre.xml" Type="OpenVocabulary">Narrative</Genre>
          <CommunicationContext/>
          <Languages/>
          <Keys/>
        </Content>
        <Actors>
          ${imdi}
        </Actors>
      </MDGroup>
      <Resources/>
      </Session>
    </METATRANSCRIPT>`;
  }
  // do the same for MediaFile
  if (imdi.startsWith("<MediaFile") || imdi.startsWith("<WrittenResource")) {
    return `<?xml version="1.0"?>
  <METATRANSCRIPT xmlns="http://www.mpi.nl/IMDI/Schema/IMDI" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.mpi.nl/IMDI/Schema/IMDI_3.0.xsd" Type="SESSION" Version="0" Date="2023-11-21" Originator="lameta 2.1.2-alpha" FormatId="IMDI 3.0" ArchiveHandle="">
  <Session>
  <Name>foo</Name>
  <Title>foo</Title>
  <Date>2000-01-01</Date>
  <MDGroup>
    <Location>
      <Continent Link="http://www.mpi.nl/IMDI/Schema/Continents.xml" Type="ClosedVocabulary">Oceania</Continent>
      <Country Link="http://www.mpi.nl/IMDI/Schema/Countries.xml" Type="OpenVocabulary">Solomon Islands</Country>
    </Location>

    <Project>
      <Name>foo</Name>
      <Title>foo</Title>
      <Id>foo</Id>
      <Contact>
        <Name>foo</Name>
      </Contact>
      <Description>foo</Description>
    </Project>
    <Keys/>
    <Content>
      <Genre Link="http://www.mpi.nl/IMDI/Schema/Content-Genre.xml" Type="OpenVocabulary">Narrative</Genre>
      <CommunicationContext/>
      <Languages/>
      <Keys/>
    </Content>
    <Actors/>
    </MDGroup>
    <Resources>      ${imdi}</Resources>
    </Session>
  </METATRANSCRIPT>`;
  }

  return imdi;
}
