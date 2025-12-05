import { mainProcessApi } from "../mainProcess/MainProcessApiAccess";
import * as temp from "temp";
import * as fs from "fs";

// Don't auto-cleanup temp files so users can inspect failed IMDI
temp.track(false);

export async function validateImdiOrThrow(
  imdiXml: string,
  displayNameForThisFile?: string
) {
  console.log(
    "[ImdiValidation] validateImdiOrThrow called for:",
    displayNameForThisFile
  );
  if (process.env.VITEST_POOL_ID && process.env.VITEST_WORKER_ID) {
    console.log("[ImdiValidation] Skipping validation in test environment");
    return; // we don't yet have a way to validate in test environment
  }
  console.log("[ImdiValidation] Calling mainProcessApi.validateImdiAsync...");
  const startTime = Date.now();
  const result = await mainProcessApi.validateImdiAsync(imdiXml);
  console.log(
    "[ImdiValidation] validateImdiAsync returned after",
    Date.now() - startTime,
    "ms, valid:",
    result.valid
  );
  if (!result.valid) {
    const lines = imdiXml.split("\n");

    // Helper to escape HTML entities so XML displays correctly
    const escapeHtml = (text: string) =>
      text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    // Build error message with context around each error location
    const errorDetails = result.errors.map((e) => {
      let context = "";
      if (e.loc && e.loc.lineNumber) {
        // xmllint often reports the line before the actual error, so we highlight
        // both the reported line and the next line
        const reportedLine = e.loc.lineNumber;
        const actualErrorLine = reportedLine + 1;
        // Get 20 lines before the reported line and include a couple lines after
        const startLine = Math.max(0, reportedLine - 20);
        const endLine = Math.min(lines.length, actualErrorLine + 1);
        const contextLines = lines.slice(startLine, endLine);
        // Escape HTML, then bold the actual error line (one after reported)
        const formattedLines = contextLines.map((line, idx) => {
          const escaped = escapeHtml(line);
          const lineNum = startLine + idx + 1;
          const isErrorLine = lineNum === actualErrorLine;
          return isErrorLine
            ? `<b style="color:red">${escaped}</b>`
            : escaped;
        });
        context = `\n\nError at line ${actualErrorLine}:\n${formattedLines.join(
          "\n"
        )}`;
      }
      // Also escape the error message itself in case it contains XML snippets
      return `<b style="color:red">${escapeHtml(e.message)}</b>${context}`;
    });

    // Save the failed IMDI to a temp file for debugging
    let savedPath = "";
    try {
      const safeName = (displayNameForThisFile || "unknown")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .substring(0, 50);
      const tempPath = temp.path({
        prefix: `failed-imdi-${safeName}-`,
        suffix: ".imdi"
      });
      fs.writeFileSync(tempPath, imdiXml, "utf8");
      savedPath = tempPath;
      console.log(`[ImdiValidation] Failed IMDI saved to: ${tempPath}`);
    } catch (saveError) {
      console.error("[ImdiValidation] Could not save failed IMDI:", saveError);
    }

    const debugInfo = savedPath
      ? `\n\nThe failed IMDI has been saved to:\n${savedPath}`
      : "";

    throw new Error(
      `The IMDI for ${displayNameForThisFile} did not pass validation.${debugInfo}\n${errorDetails.join(
        "\n\n"
      )}`
    );
  }
}
