import { css } from "@emotion/react";
import React, { useState, useCallback } from "react";
import { observer } from "mobx-react";
import {
  Button,
  LinearProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from "@mui/material";
import WarningIcon from "@mui/icons-material/Warning";
import { Trans, t } from "@lingui/macro";
import { Project } from "../../model/Project/Project";
import { lameta_orange } from "../../containers/theme";

interface MigrationProgress {
  phase: "idle" | "previewing" | "confirming" | "converting" | "done";
  current: number;
  total: number;
  currentItem: string;
  convertedCount: number;
}

interface ExampleField {
  segments: string[];
  unknownStartIndex: number; // segments at this index and beyond are unknown
}

interface PreviewResult {
  fieldsWithUnknowns: number;
  totalFieldsToConvert: number;
  example?: ExampleField;
}

interface IProps {
  project: Project;
}

/**
 * Panel shown in the Languages tab when the project has slash-syntax
 * multilingual fields that need to be converted to tagged format.
 *
 * Shows instructions, a Convert button, and progress during conversion.
 */
export const MultilingualTextMigrationPanel: React.FunctionComponent<IProps> =
  observer(({ project }) => {
    const [progress, setProgress] = useState<MigrationProgress>({
      phase: "idle",
      current: 0,
      total: 0,
      currentItem: "",
      convertedCount: 0
    });
    const [previewResult, setPreviewResult] =
      useState<PreviewResult | null>(null);

    // Helper to preview all multilingual fields in a folder
    const previewFolder = (
      folder: { properties: { values: () => any[] } },
      metadataSlotTags: string[],
      captureExample: boolean = false
    ): {
      fieldsWithUnknowns: number;
      totalFieldsToConvert: number;
      example?: ExampleField;
    } => {
      let fieldsWithUnknowns = 0;
      let totalFieldsToConvert = 0;
      let example: ExampleField | undefined;
      const fields = folder.properties.values();
      for (const field of fields) {
        if (field.definition?.multilingual && field.looksLikeSlashSyntax?.()) {
          totalFieldsToConvert++;
          const preview =
            field.textHolder?.previewSlashSyntaxConversion?.(metadataSlotTags);
          if (preview?.unknownCount > 0) {
            fieldsWithUnknowns++;
            // Capture the first example we find
            if (captureExample && !example && field.textHolder?._text) {
              const segments = field.textHolder._text
                .split("/")
                .map((s: string) => s.trim());
              example = {
                segments,
                unknownStartIndex: metadataSlotTags.length
              };
            }
          }
        }
      }
      return { fieldsWithUnknowns, totalFieldsToConvert, example };
    };

    // Phase 1: Preview - count fields that would have unknowns
    const handlePreview = useCallback(async () => {
      const metadataSlotTags = Project.getMetadataLanguageSlots().map(
        (s) => s.tag
      );

      setProgress({
        phase: "previewing",
        current: 0,
        total: 0,
        currentItem: t`Scanning...`,
        convertedCount: 0
      });

      let totalFieldsWithUnknowns = 0;
      let totalFieldsToConvert = 0;
      let capturedExample: ExampleField | undefined;

      // Yield to UI
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Preview project-level fields
      const projectPreview = previewFolder(project, metadataSlotTags, true);
      totalFieldsWithUnknowns += projectPreview.fieldsWithUnknowns;
      totalFieldsToConvert += projectPreview.totalFieldsToConvert;
      if (!capturedExample && projectPreview.example) {
        capturedExample = projectPreview.example;
      }

      // Preview sessions
      for (const session of project.sessions.items) {
        const sessionPreview = previewFolder(
          session,
          metadataSlotTags,
          !capturedExample
        );
        totalFieldsWithUnknowns += sessionPreview.fieldsWithUnknowns;
        totalFieldsToConvert += sessionPreview.totalFieldsToConvert;
        if (!capturedExample && sessionPreview.example) {
          capturedExample = sessionPreview.example;
        }
      }

      // Preview people
      for (const person of project.persons.items) {
        const personPreview = previewFolder(
          person,
          metadataSlotTags,
          !capturedExample
        );
        totalFieldsWithUnknowns += personPreview.fieldsWithUnknowns;
        totalFieldsToConvert += personPreview.totalFieldsToConvert;
        if (!capturedExample && personPreview.example) {
          capturedExample = personPreview.example;
        }
      }

      if (totalFieldsWithUnknowns > 0) {
        // Show confirmation dialog
        setPreviewResult({
          fieldsWithUnknowns: totalFieldsWithUnknowns,
          totalFieldsToConvert,
          example: capturedExample
        });
        setProgress((prev) => ({ ...prev, phase: "confirming" }));
      } else {
        // No unknowns - proceed directly to conversion
        await doConversion();
      }
    }, [project]);

    // Phase 2: Actual conversion
    const doConversion = useCallback(async () => {
      const metadataSlotTags = Project.getMetadataLanguageSlots().map(
        (s) => s.tag
      );

      // Count total items to process
      const totalSessions = project.sessions.items.length;
      const totalPeople = project.persons.items.length;
      const totalItems = 1 + totalSessions + totalPeople; // 1 for project itself

      setProgress({
        phase: "converting",
        current: 0,
        total: totalItems,
        currentItem: t`Project`,
        convertedCount: 0
      });

      let convertedCount = 0;

      // Helper to convert all multilingual fields in a folder
      const convertFolder = (
        folder: { properties: { values: () => any[] } },
        itemName: string
      ) => {
        const fields = folder.properties.values();
        for (const field of fields) {
          if (
            field.definition?.multilingual &&
            field.looksLikeSlashSyntax?.()
          ) {
            field.commitSlashSyntaxConversion(metadataSlotTags);
            convertedCount++;
          }
        }
      };

      // Convert project-level fields
      convertFolder(project, t`Project`);

      setProgress((prev) => ({
        ...prev,
        current: 1,
        convertedCount
      }));

      // Yield to UI
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Convert sessions
      for (let i = 0; i < project.sessions.items.length; i++) {
        const session = project.sessions.items[i];
        const sessionName = session.displayName || `Session ${i + 1}`;

        setProgress((prev) => ({
          ...prev,
          current: 1 + i,
          currentItem: sessionName,
          convertedCount
        }));

        convertFolder(session, sessionName);
        session.saveFolderMetaData();

        // Yield to UI every few items
        if (i % 5 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      // Convert people
      for (let i = 0; i < project.persons.items.length; i++) {
        const person = project.persons.items[i];
        const personName = person.displayName || `Person ${i + 1}`;

        setProgress((prev) => ({
          ...prev,
          current: 1 + totalSessions + i,
          currentItem: personName,
          convertedCount
        }));

        convertFolder(person, personName);
        person.saveFolderMetaData();

        // Yield to UI every few items
        if (i % 5 === 0) {
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }

      // Save project and mark conversion complete
      project.saveFolderMetaData();
      project.setMultilingualConversionPending(false);

      setProgress({
        phase: "done",
        current: totalItems,
        total: totalItems,
        currentItem: "",
        convertedCount
      });
    }, [project]);

    const handleConfirmConversion = useCallback(async () => {
      setPreviewResult(null);
      await doConversion();
    }, [doConversion]);

    const handleCancelConversion = useCallback(() => {
      setPreviewResult(null);
      setProgress({
        phase: "idle",
        current: 0,
        total: 0,
        currentItem: "",
        convertedCount: 0
      });
    }, []);

    // Don't show if not pending (but keep showing if we just finished conversion)
    const isPending = project.multilingualConversionPending;
    console.log(
      `[MigrationPanel] multilingualConversionPending=${isPending}, raw value="${project.properties.getTextStringOrEmpty(
        "multilingualConversionPending"
      )}"`
    );
    if (!isPending && progress.phase !== "done") {
      return null;
    }

    const percentage =
      progress.total > 0
        ? Math.round((progress.current / progress.total) * 100)
        : 0;

    return (
      <div
        data-testid="multilingual-migration-panel"
        css={css`
          background: #fff8e1;
          border: 1px solid #ffc107;
          border-radius: 8px;
          padding: 16px;
          margin: 16px 0;
        `}
      >
        <h3
          css={css`
            margin-top: 0;
            margin-bottom: 12px;
            color: #f57c00;
          `}
        >
          <Trans>Finish Migration to Multilingual Fields</Trans>
        </h3>

        {progress.phase === "idle" && (
          <>
            <p
              css={css`
                margin-bottom: 16px;
                line-height: 1.5;
              `}
            >
              <Trans>
                This project appears to use "/" to store multiple languages
                within a single field. In this version of lameta, we have a
                better approach in which lameta knows which languages are used
                in a field. After you have selected the appropriate working
                languages above and arranged them in the correct order, all
                multilingual fields in Project, Sessions, and People should
                display with the correct language tags. Once you have confirmed
                that everything appears as expected, click the button below to
                apply these changes permanently.
              </Trans>
            </p>
            {Project.getMetadataLanguageSlots().length < 2 && (
              <Alert
                severity="info"
                css={css`
                  margin-bottom: 12px;
                  background-color: #fff3e0;
                  .MuiAlert-icon {
                    color: ${lameta_orange};
                  }
                  .MuiAlert-message {
                    color: #5d4037;
                  }
                `}
              >
                <Trans>
                  Please add the working languages you've been using with these
                  "/" fields (at least two) before migrating.
                </Trans>
              </Alert>
            )}
            <div
              css={css`
                display: flex;
                justify-content: flex-end;
              `}
            >
              <Button
                variant="contained"
                data-testid="convert-multilingual-button"
                onClick={handlePreview}
                disabled={Project.getMetadataLanguageSlots().length < 2}
                css={css`
                  background-color: ${lameta_orange};
                  color: white;
                  font-weight: bold;
                  &:hover {
                    background-color: #d4844d;
                    color: white;
                  }
                  &:disabled {
                    background-color: ${lameta_orange};
                    color: white;
                    opacity: 0.2;
                  }
                `}
              >
                <Trans>Migrate</Trans>
              </Button>
            </div>
          </>
        )}

        {progress.phase === "previewing" && (
          <div
            css={css`
              display: flex;
              align-items: center;
              gap: 12px;
            `}
          >
            <LinearProgress
              css={css`
                flex: 1;
                height: 8px;
                border-radius: 4px;
              `}
            />
            <span
              css={css`
                color: #666;
              `}
            >
              <Trans>Scanning...</Trans>
            </span>
          </div>
        )}

        {progress.phase === "converting" && (
          <div>
            <div
              css={css`
                display: flex;
                justify-content: space-between;
                margin-bottom: 8px;
              `}
            >
              <span>
                <Trans>Migrating: {progress.currentItem}</Trans>
              </span>
              <span
                css={css`
                  color: #666;
                `}
              >
                {percentage}%
              </span>
            </div>
            <LinearProgress
              variant="determinate"
              value={percentage}
              css={css`
                height: 8px;
                border-radius: 4px;
              `}
            />
            <div
              css={css`
                margin-top: 8px;
                font-size: 13px;
                color: #666;
              `}
            >
              <Trans>
                {progress.current} of {progress.total} items processed
              </Trans>
            </div>
          </div>
        )}

        {progress.phase === "done" && (
          <Alert
            severity="success"
            css={css`
              margin-top: 8px;
              background-color: #fff3e0;
              color: #5d4037;
              .MuiAlert-icon {
                color: ${lameta_orange};
              }
              .MuiAlert-message {
                color: #5d4037;
              }
            `}
          >
            <Trans>
              Migration complete! {progress.convertedCount} fields were
              migrated. You can hide language tags from View → "Show language
              tags on multilingual fields" if you don't need them anymore.
            </Trans>
          </Alert>
        )}

        {/* Confirmation dialog for fields with unknown languages */}
        <Dialog
          open={progress.phase === "confirming" && previewResult !== null}
          onClose={handleCancelConversion}
        >
          <DialogTitle
            css={css`
              display: flex;
              align-items: center;
              gap: 8px;
            `}
          >
            <WarningIcon
              css={css`
                color: #f57c00;
              `}
            />
            <Trans>Fields with Unknown Languages</Trans>
          </DialogTitle>
          <DialogContent>
            <p>
              <Trans>
                Some fields have more language segments than there are Working
                Languages defined ({previewResult?.fieldsWithUnknowns} of{" "}
                {previewResult?.totalFieldsToConvert} fields). If you proceed,
                these extra segments will be labeled as "unknown" languages.
              </Trans>
            </p>
            {previewResult?.example && (
              <div
                css={css`
                  margin-top: 12px;
                  padding: 8px 12px;
                  background: #f5f5f5;
                  border-radius: 4px;
                  font-family: monospace;
                `}
              >
                <Trans>Example:</Trans>{" "}
                {previewResult.example.segments.map((seg, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && " / "}
                    <span
                      css={css`
                        color: ${i >= previewResult.example!.unknownStartIndex
                          ? "#d32f2f"
                          : "inherit"};
                        font-weight: ${i >=
                        previewResult.example!.unknownStartIndex
                          ? "bold"
                          : "normal"};
                      `}
                    >
                      {seg}
                    </span>
                  </React.Fragment>
                ))}
              </div>
            )}
            <p
              css={css`
                margin-top: 12px;
              `}
            >
              <Trans>
                You can either add more Working Languages above to match all
                segments, or proceed with the migration and manually fix the
                unknown language fields later.
              </Trans>
            </p>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={handleConfirmConversion}
              css={css`
                color: ${lameta_orange};
              `}
            >
              <Trans>Finish Migration</Trans>
            </Button>
            <Button
              onClick={handleCancelConversion}
              variant="contained"
              autoFocus
              css={css`
                background-color: ${lameta_orange};
                color: white;
                &:hover {
                  background-color: #d4844d;
                }
              `}
            >
              <Trans>Cancel</Trans>
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  });
