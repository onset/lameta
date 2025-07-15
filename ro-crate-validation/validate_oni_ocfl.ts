#!/usr/bin/env node
/**
 * TypeScript validation script for Lameta repositories using oni-ocfl library.
 */

import * as path from "path";
import * as os from "os";
import { Collector, generateArcpId } from "oni-ocfl";
import * as fs from "fs-extra";

/**
 * Main function for command line usage
 */
const main = async (): Promise<void> => {
  if (process.argv.length < 3) {
    console.log(
      "Usage: node validate_oni_ocfl.js <path_to_directory_or_json_file> [--mode-validator <file>] [--namespace <name>] [--ignore-files]"
    );
    process.exit(1);
  }

  const cratePath = process.argv[2];
  const options: {
    modeValidator?: string;
    ignoreFiles?: boolean;
    namespace?: string;
  } = {};

  // Parse command line options
  for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i];
    switch (arg) {
      case "--mode-validator":
        options.modeValidator = process.argv[++i];
        break;
      case "--namespace":
        options.namespace = process.argv[++i];
        break;
      case "--ignore-files":
        options.ignoreFiles = true;
        break;
    }
  }

  try {
    const resolvedPath = path.resolve(cratePath);
    const result = await validateRoCrateWithOniOcfl(
      resolvedPath,
      options.modeValidator,
      options.ignoreFiles,
      options.namespace
    );
    const success = printResults(result);
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error(`❌ Validation script failed: ${error}`);
    process.exit(1);
  }
};

// Run main function if this script is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error(`❌ Unhandled error: ${error}`);
    process.exit(1);
  });
}

interface ValidationError {
  type: "error" | "warning" | "info";
  message: string;
  entity?: string;
  property?: string;
}

interface ValidationResult {
  success: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
}

export async function validateRoCrateWithOniOcfl(
  crateDirPath: string,
  modeValidator?: string,
  ignoreFiles?: boolean,
  namespace?: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: false,
    errors: [],
    warnings: [],
    info: []
  };

  try {
    // Resolve the crate path

    const metadataFilePath: string = path.join(
      crateDirPath,
      "ro-crate-metadata.json"
    );

    result.info.push({
      type: "info",
      message: `Validating RO-Crate: ${crateDirPath}`
    });

    if (!(await fs.pathExists(metadataFilePath))) {
      result.errors.push({
        type: "error",
        message: "No ro-crate-metadata.json file found"
      });
      return result;
    }

    // Load the RO-Crate metadata file
    try {
      await fs.readJson(metadataFilePath);
      result.info.push({
        type: "info",
        message: "Successfully loaded RO-Crate metadata file"
      });
    } catch (error) {
      result.errors.push({
        type: "error",
        message: `Failed to load RO-Crate metadata file: ${error}`
      });
      return result;
    }
    console.log(
      `Validating RO-Crate at: ${crateDirPath} with metadata file: ${metadataFilePath}`
    );

    // Use oni-ocfl Collector for enhanced validation
    try {
      result.info.push({
        type: "info",
        message: "Running oni-ocfl Collector validation"
      });

      // The library requires a package.json file to get a string repository URL
      const dummyPackagePath = path.join(crateDirPath, "package.json");
      if (!(await fs.pathExists(dummyPackagePath))) {
        await fs.writeJson(dummyPackagePath, {
          repository: {
            type: "git",
            url: "https://example.com"
          }
        });
      }

      // Create a temporary directory for the OCFL repository
      // We need to create a path that doesn't exist so the collector can create a new repository
      const tempRepoPath = path.join(
        os.tmpdir(),
        `oni-ocfl-repo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      );

      const collectorValidate = new Collector({
        repoPath: tempRepoPath,
        namespace: namespace || "validation-temp",
        dataDir: crateDirPath,
        template: crateDirPath
      });

      console.log("connect");
      await collectorValidate.connect();

      // Load the existing RO-Crate from the specified directory
      const corpusRepo = collectorValidate.newObject(crateDirPath);
      corpusRepo.mintArcpId("corpus", "root");
      const corpusCrate = corpusRepo.crate;
      console.log("Adding object to repository...");

      const corpusCrateRootId = generateArcpId(collectorValidate.namespace, [
        "corpus",
        "root"
      ]);
      corpusCrate.rootId = corpusCrateRootId;

      // Use the existing crate data instead of hardcoded values
      // The crate was already loaded from crateDirPath in newObject() above

      // Only add to repository with the existing crate structure
      await corpusRepo.addToRepo(ignoreFiles || false);

      console.log("cleaning temporary repository...");

      // Clean up temporary repo and package.json
      if (await fs.pathExists(tempRepoPath)) {
        await fs.remove(tempRepoPath);
      }

      await fs.remove(dummyPackagePath);
    } catch (error) {
      result.errors.push({
        type: "error",
        message: `Could not run oni-ocfl Collector validation: ${error}`
      });

      // Add stack trace information if available
      if (error instanceof Error && error.stack) {
        result.errors.push({
          type: "error",
          message: `Stack trace: ${error.stack}`
        });
      }
    }

    // Determine overall success
    result.success = result.errors.length === 0;

    return result;
  } catch (error) {
    result.errors.push({
      type: "error",
      message: `Validation failed: ${error}`
    });
    return result;
  }
}

/**
 * Print validation results in a formatted way
 */
export const printResults = (result: ValidationResult): boolean => {
  console.log("=".repeat(50));

  // Oni-OCFL validation section
  console.log("Running oni-ocfl validation");

  if (result.errors.length > 0) {
    console.log(`❌ ERRORS (${result.errors.length}):`);
    for (const item of result.errors) {
      console.log(`   ❌ ${item.message}`);
    }
  }

  console.log("oni-ocfl validation complete");

  // Show warnings if any exist
  if (result.warnings.length > 0) {
    console.log("=".repeat(30));
    console.log(`⚠️  WARNINGS (${result.warnings.length}):`);
    for (const item of result.warnings) {
      console.log(`   ⚠️  ${item.message}`);
    }
  }

  console.log("=".repeat(50));
  console.log(
    `🎯 SUMMARY: ${result.errors.length} errors, ${result.warnings.length} warnings`
  );

  return result.success;
};
