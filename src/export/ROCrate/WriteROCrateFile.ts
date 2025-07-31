import * as fs from "fs-extra";
import * as Path from "path";
import { Project } from "../../model/Project/Project";
import { getRoCrate } from "./RoCrateExporter";
import { generateRoCrateHtml } from "./RoCrateHtmlGenerator";
import { removeFileIfWritableOrThrow } from "./FileUtilities";

export async function writeROCrateFile(project: Project): Promise<void> {
  if (!project || !project.directory) {
    throw new Error("No valid project provided");
  }

  const projectDirectory = project.directory;
  const roCrateFilePath = Path.join(projectDirectory, "ro-crate-metadata.json");
  const roCrateHtmlPath = Path.join(projectDirectory, "ro-crate-preview.html");

  // Delete existing files if they exist
  await removeFileIfWritableOrThrow(roCrateFilePath);
  await removeFileIfWritableOrThrow(roCrateHtmlPath);

  // Generate new RO-Crate metadata using the existing exporter
  const roCrateData = await getRoCrate(project, project);

  // Write the JSON file
  await fs.writeJson(roCrateFilePath, roCrateData, { spaces: 2 });

  // Write the HTML file
  const htmlContent = generateRoCrateHtml(roCrateData);
  await fs.writeFile(roCrateHtmlPath, htmlContent, "utf8");
}
