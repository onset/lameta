import * as fs from "fs-extra";
import * as Path from "path";
import { Project } from "../model/Project/Project";
import { getRoCrate } from "../export/RoCrateExporter";

export async function updateROCrateFile(project: Project): Promise<void> {
  if (!project || !project.directory) {
    throw new Error("No valid project provided");
  }

  const projectDirectory = project.directory;
  const roCrateFilePath = Path.join(projectDirectory, "ro-crate-metadata.json");

  // Delete existing file if it exists
  if (await fs.pathExists(roCrateFilePath)) {
    await fs.remove(roCrateFilePath);
  }

  // Generate new RO-Crate metadata using the existing exporter
  const roCrateData = getRoCrate(project, project);
  
  // Write the new file
  await fs.writeJson(roCrateFilePath, roCrateData, { spaces: 2 });
}
