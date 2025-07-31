import * as fs from "fs-extra";
import * as Path from "path";
import { Project } from "../../model/Project/Project";
import { getRoCrate } from "./RoCrateExporter";

export async function writeROCrateFile(project: Project): Promise<void> {
  if (!project || !project.directory) {
    throw new Error("No valid project provided");
  }

  const projectDirectory = project.directory;
  const roCrateFilePath = Path.join(projectDirectory, "ro-crate-metadata.json");
  const roCrateHtmlPath = Path.join(projectDirectory, "ro-crate-preview.html");

  // Delete existing files if they exist
  if (await fs.pathExists(roCrateFilePath)) {
    try {
      // Check if file is read-only before attempting to remove
      const stats = await fs.stat(roCrateFilePath);
      console.log(`File stats for ${roCrateFilePath}:`, {
        mode: stats.mode,
        modeOctal: stats.mode.toString(8),
        isWritable: !!(stats.mode & 0o200),
        isReadOnly: !(stats.mode & 0o200)
      });
      
      if (!(stats.mode & 0o200)) { // Check if write permission is missing
        console.log("File is read-only, throwing error");
        throw new Error(`Cannot overwrite read-only file: ${roCrateFilePath}. Please make the file writable or delete it manually.`);
      }
      console.log("File is writable, attempting to remove");
      await fs.remove(roCrateFilePath);
      console.log("File removed successfully");
    } catch (error) {
      console.log("Error during file removal:", error);
      if (error.message && error.message.includes("Cannot overwrite read-only file")) {
        throw error; // Re-throw our custom read-only error
      }
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: Cannot overwrite ${roCrateFilePath}. The file may be read-only or in use by another program.`);
      }
      throw error; // Re-throw other errors
    }
  }
  if (await fs.pathExists(roCrateHtmlPath)) {
    try {
      const stats = await fs.stat(roCrateHtmlPath);
      console.log(`File stats for ${roCrateHtmlPath}:`, {
        mode: stats.mode,
        modeOctal: stats.mode.toString(8),
        isWritable: !!(stats.mode & 0o200),
        isReadOnly: !(stats.mode & 0o200)
      });
      
      if (!(stats.mode & 0o200)) {
        console.log("HTML file is read-only, throwing error");
        throw new Error(`Cannot overwrite read-only file: ${roCrateHtmlPath}. Please make the file writable or delete it manually.`);
      }
      console.log("HTML file is writable, attempting to remove");
      await fs.remove(roCrateHtmlPath);
      console.log("HTML file removed successfully");
    } catch (error) {
      console.log("Error during HTML file removal:", error);
      if (error.message && error.message.includes("Cannot overwrite read-only file")) {
        throw error; // Re-throw our custom read-only error
      }
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        throw new Error(`Permission denied: Cannot overwrite ${roCrateHtmlPath}. The file may be read-only or in use by another program.`);
      }
      throw error;
    }
  }

  // Generate new RO-Crate metadata using the existing exporter
  const roCrateData = await getRoCrate(project, project);

  // Write the new file
  await fs.writeJson(roCrateFilePath, roCrateData, { spaces: 2 });
}
