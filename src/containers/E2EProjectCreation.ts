/**
 * E2E Fast Project Creation
 *
 * This module provides functionality to create a project directly during E2E tests,
 * bypassing the registration dialog and start screen UI. This significantly speeds
 * up E2E tests.
 *
 * Usage: Set environment variables E2E_PROJECT_NAME and optionally E2E_ARCHIVE_CONFIG
 * when launching the app in E2E mode.
 */

import * as fs from "fs-extra";
import * as Path from "path";
import { app } from "@electron/remote";
import { Project, ProjectHolder } from "../model/Project/Project";
import { getTestEnvironment } from "../getTestEnvironment";
import { NotifyError } from "../components/Notify";
import userSettings from "../other/UserSettings";

const sanitize = require("sanitize-filename");

/**
 * Check if E2E fast project creation should be used.
 */
export function shouldUseE2EFastProjectCreation(): boolean {
  const testEnv = getTestEnvironment();
  return testEnv.E2E && !!testEnv.E2E_PROJECT_NAME;
}

/**
 * Create a project directly for E2E testing, bypassing all UI dialogs.
 * Returns true if a project was created, false otherwise.
 */
export function createProjectForE2E(projectHolder: ProjectHolder): boolean {
  const testEnv = getTestEnvironment();

  if (!testEnv.E2E || !testEnv.E2E_PROJECT_NAME) {
    return false;
  }

  const projectName = testEnv.E2E_PROJECT_NAME;
  const archiveConfig = testEnv.E2E_ARCHIVE_CONFIG;

  const root = testEnv.E2ERoot || app.getPath("documents");
  // Handle project names with slashes (used in some tests for paths) - sanitize the leaf name
  const parts = projectName.split("/");
  const sanitizedParts = parts.map((p: string) => sanitize(p));
  const directory = Path.join(root, "lameta", ...sanitizedParts);

  fs.ensureDirSync(directory);

  try {
    const project = Project.fromDirectory(directory);

    // Apply archive configuration if specified
    if (archiveConfig) {
      project.properties.setText("archiveConfigurationName", archiveConfig);
      project.saveAllFilesInFolder();
      // Reload to apply the new archive configuration field definitions
      const reloadedProject = Project.fromDirectory(directory);
      projectHolder.setProject(reloadedProject);
    } else {
      projectHolder.setProject(project);
    }

    userSettings.PreviousProjectDirectory = directory;
    return true;
  } catch (err) {
    NotifyError(
      `E2E: lameta had a problem while creating the project at ${directory}: ${err}`
    );
    return false;
  }
}
