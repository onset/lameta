import * as fs from "fs-extra";

export async function removeFileIfWritableOrThrow(
  filePath: string
): Promise<void> {
  if (!(await fs.pathExists(filePath))) {
    return;
  }

  try {
    // Check if file is read-only before attempting to remove
    const stats = await fs.stat(filePath);

    if (!(stats.mode & 0o200)) {
      // Check if write permission is missing
      console.log("File is read-only, throwing error");
      throw new Error(
        `Cannot overwrite read-only file: ${filePath}. Please make the file writable or delete it manually.`
      );
    }

    await fs.remove(filePath);
  } catch (error) {
    console.log("Error during file removal:", error);
    if (
      error.message &&
      error.message.includes("Cannot overwrite read-only file")
    ) {
      throw error; // Re-throw our custom read-only error
    }
    if (error.code === "EACCES" || error.code === "EPERM") {
      throw new Error(
        `Permission denied: Cannot overwrite ${filePath}. The file may be read-only or in use by another program.`
      );
    }
    throw error; // Re-throw other errors
  }
}
