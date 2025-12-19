import * as React from "react";
import { css } from "@emotion/react";
import { Folder } from "../model/Folder/Folder";
import ImdiGenerator, { IMDIMode } from "../export/ImdiGenerator";
import { Session } from "../model/Project/Session/Session";
import { Project } from "../model/Project/Project";
import { Person } from "../model/Project/Person/Person";
import { File } from "../model/file/File";
import { mainProcessApi } from "../mainProcess/MainProcessApiAccess";
import { XMLValidationResult } from "xmllint-wasm";
import Alert from "@mui/material/Alert";
import { Trans } from "@lingui/macro";
import { GetOtherConfigurationSettings } from "../model/Project/OtherConfigurationSettings";
import { SearchableCodeViewer } from "./SearchableCodeViewer";
import ImdiBundler from "../export/ImdiBundler";

interface ImdiViewProps {
  /** The IMDI XML string to display */
  imdi: string;
  /** Optional warning message (e.g., from rules-based validation) */
  rulesWarning?: string;
  /** Optional function to wrap IMDI fragments for schema validation */
  wrapForValidation?: (imdi: string) => string;
}

/**
 * Displays IMDI XML with syntax highlighting and schema validation.
 * The parent component is responsible for generating the IMDI string.
 */
export const ImdiView: React.FunctionComponent<ImdiViewProps> = (props) => {
  const [validationResult, setValidationResult] =
    React.useState<XMLValidationResult | undefined>();
  const [schemaName, setSchemaName] = React.useState<string>("IMDI_3.0.xsd");

  // Validate the IMDI when it changes
  React.useEffect(() => {
    if (props.imdi) {
      const imdiSchema =
        GetOtherConfigurationSettings().imdiSchema || "IMDI_3.0.xsd";
      setSchemaName(imdiSchema);

      const xmlToValidate = props.wrapForValidation
        ? props.wrapForValidation(props.imdi)
        : props.imdi;

      mainProcessApi.validateImdiAsync(xmlToValidate, imdiSchema).then((r) => {
        setValidationResult(r);
      });
    } else {
      setValidationResult(undefined);
    }
  }, [props.imdi, props.wrapForValidation]);

  if (!props.imdi) {
    return null;
  }

  return (
    <div
      css={css`
        height: 500px;
        width: 100%;
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        overflow: hidden;
      `}
    >
      {props.rulesWarning && (
        <>
          <Alert severity="warning">{props.rulesWarning}</Alert>
          <br />
        </>
      )}
      {validationResult && !validationResult.valid && (
        <Alert severity="error">
          <div
            css={css`
              font-weight: bold;
              margin-bottom: 8px;
            `}
          >
            Validation failed using schema: {schemaName}
          </div>
          {validationResult?.errors.map((e, i) => {
            return (
              <div
                key={i}
                css={css`
                  margin: 0;
                  font-weight: 500;
                  white-space: pre-wrap;
                `}
              >
                {e.loc?.lineNumber ? `Line ${e.loc.lineNumber}: ` : ""}
                {e.message}
              </div>
            );
          })}
        </Alert>
      )}
      <SearchableCodeViewer
        content={props.imdi}
        language="xml"
        autoFocusSearch={true}
        headerContent={
          validationResult?.valid && (
            <Alert
              severity="success"
              css={css`
                padding: 0 8px;
                background-color: transparent;
                color: inherit;
                .MuiAlert-icon {
                  padding: 0;
                  margin-right: 6px;
                }
                .MuiAlert-message {
                  padding: 0;
                }
              `}
            >
              <Trans>This XML conforms to the IMDI schema.</Trans> ({schemaName}
              )
            </Alert>
          )
        }
      />
    </div>
  );
};

/**
 * Wraps IMDI fragments (Actor, MediaFile, WrittenResource) in a full
 * METATRANSCRIPT document so they can be validated against the schema.
 */
export function wrapImdiFragmentForValidation(imdi: string): string {
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

// ============================================================================
// Helper types and functions for generating IMDI from various sources
// ============================================================================

export type ImdiTarget =
  | { type: "session"; session: Session }
  | { type: "project"; project: Project }
  | { type: "person"; person: Person }
  | { type: "file"; file: File; folder: Folder }
  | {
      type: "documentFolder";
      folder: Folder;
      name: string;
      title: string;
      description: string;
    }
  | { type: "consentBundle" };

/**
 * Generates IMDI XML for various target types.
 * Returns the XML string and optionally a rules warning message.
 */
export function generateImdi(
  target: ImdiTarget,
  project: Project
): { imdi: string; rulesWarning?: string } {
  switch (target.type) {
    case "session": {
      const imdi = ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        target.session,
        project
      );
      const rulesWarning = target.session.getRulesViolationsString(
        project.persons.items.map((p) =>
          p.properties.getTextStringOrEmpty(p.propertyForCheckingId)
        )
      );
      return { imdi, rulesWarning: rulesWarning || undefined };
    }

    case "project": {
      const imdi = ImdiGenerator.generateCorpus(
        IMDIMode.RAW_IMDI,
        project,
        new Array<string>() // we don't bother to compute the children IMDIs for this view
      );
      return { imdi };
    }

    case "person": {
      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        target.person,
        project
      );
      const imdi = generator.actor(
        target.person,
        "will get role in context of session",
        new Date() // normally this will be the date of the session, but for viewing we use today
      ) as string;
      return { imdi };
    }

    case "file": {
      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        target.folder,
        project
      );
      const imdi = generator.resourceFile(target.file) as string;
      return { imdi };
    }

    case "documentFolder": {
      if (target.folder.files.length === 0) {
        return { imdi: "" };
      }
      const generator = new ImdiGenerator(
        IMDIMode.RAW_IMDI,
        target.folder,
        project
      );
      const imdi = generator.makePseudoSessionImdiForOtherFolder(
        target.name,
        target.folder,
        "Collection description", // genre
        false, // omitNamespaces
        target.title,
        target.description
      );
      return { imdi };
    }

    case "consentBundle": {
      const { session, tempDir, hasConsentFiles } =
        ImdiBundler.createConsentBundleSession(project);

      if (!hasConsentFiles) {
        ImdiBundler.cleanupConsentBundleTempDir(tempDir);
        return { imdi: "" };
      }

      const imdi = ImdiGenerator.generateSession(
        IMDIMode.RAW_IMDI,
        session,
        project
      );

      ImdiBundler.cleanupConsentBundleTempDir(tempDir);
      return { imdi };
    }
  }
}

/**
 * Hook that generates IMDI for a target and updates when dependencies change.
 * Returns the IMDI string, optional rules warning, and the wrapper function if needed.
 */
export function useImdiGeneration(
  target: ImdiTarget,
  project: Project,
  deps: React.DependencyList = []
): {
  imdi: string;
  rulesWarning?: string;
  wrapForValidation?: (imdi: string) => string;
} {
  const [result, setResult] = React.useState<{
    imdi: string;
    rulesWarning?: string;
  }>({ imdi: "" });

  React.useEffect(() => {
    setResult(generateImdi(target, project));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, ...deps]);

  // Person and File targets need wrapping for validation
  const needsWrapping = target.type === "person" || target.type === "file";

  return {
    ...result,
    wrapForValidation: needsWrapping ? wrapImdiFragmentForValidation : undefined
  };
}

// ============================================================================
// Convenience wrapper for legacy callers
// ============================================================================

interface TargetImdiViewProps {
  /**
   * The target to generate IMDI for.
   * At runtime this is checked with instanceof to determine if it's
   * Session, Project, Person, or File. Folder is accepted because
   * Session and Person extend Folder.
   */
  target: Folder | File;
  /** The folder context (used for File targets) */
  folder: Folder;
  /** The project */
  project: Project;
}

/**
 * Convenience wrapper that accepts a target object and automatically
 * determines the IMDI generation strategy. This provides backward
 * compatibility for existing callers.
 */
export const TargetImdiView: React.FunctionComponent<TargetImdiViewProps> = (
  props
) => {
  const [imdi, setImdi] = React.useState<string>("");
  const [rulesWarning, setRulesWarning] = React.useState<string | undefined>();
  const [needsWrapping, setNeedsWrapping] = React.useState(false);

  React.useEffect(() => {
    let target: ImdiTarget;

    if (props.target instanceof Session) {
      target = { type: "session", session: props.target };
    } else if (props.target instanceof Project) {
      target = { type: "project", project: props.target };
    } else if (props.target instanceof Person) {
      target = { type: "person", person: props.target };
    } else if (props.target instanceof File) {
      target = { type: "file", file: props.target, folder: props.folder };
    } else {
      return;
    }

    const result = generateImdi(target, props.project);
    setImdi(result.imdi);
    setRulesWarning(result.rulesWarning);
    setNeedsWrapping(target.type === "person" || target.type === "file");
  }, [props.target, props.project, props.folder]);

  return (
    <ImdiView
      imdi={imdi}
      rulesWarning={rulesWarning}
      wrapForValidation={needsWrapping ? wrapImdiFragmentForValidation : undefined}
    />
  );
};

interface DocumentFolderImdiViewProps {
  project: Project;
  folder: Folder;
  name: string;
  title: string;
  description: string;
}

/**
 * Shows the IMDI that would be generated for a document folder
 * (DescriptionDocuments or OtherDocuments).
 */
export const DocumentFolderImdiView: React.FunctionComponent<
  DocumentFolderImdiViewProps
> = (props) => {
  const [imdi, setImdi] = React.useState<string>("");

  React.useEffect(() => {
    const target: ImdiTarget = {
      type: "documentFolder",
      folder: props.folder,
      name: props.name,
      title: props.title,
      description: props.description
    };
    const result = generateImdi(target, props.project);
    setImdi(result.imdi);
  }, [
    props.project,
    props.folder,
    props.name,
    props.title,
    props.description,
    props.folder.files.length
  ]);

  return <ImdiView imdi={imdi} />;
};

interface ConsentImdiViewProps {
  project: Project;
}

/**
 * Shows the IMDI that would be generated for the ConsentDocuments bundle.
 */
export const ConsentImdiView: React.FunctionComponent<ConsentImdiViewProps> = (
  props
) => {
  const [imdi, setImdi] = React.useState<string>("");

  React.useEffect(() => {
    const target: ImdiTarget = { type: "consentBundle" };
    const result = generateImdi(target, props.project);
    setImdi(result.imdi);
  }, [props.project, props.project.sessions.items.length]);

  return <ImdiView imdi={imdi} />;
};
