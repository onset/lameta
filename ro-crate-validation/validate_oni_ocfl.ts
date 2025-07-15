#!/usr/bin/env node
/**
 * TypeScript validation script for Lameta repositories using oni-ocfl library.
 * Validates directories containing ro-crate-metadata.json files against OCFL standards.
 */

import * as fs from "fs-extra";
import * as path from "path";
import * as os from "os";
import { Collector } from "oni-ocfl";

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

/**
 * Validate a Lameta RO-Crate using oni-ocfl library
 */
export const validateRoCrateWithOniOcfl = async (
  cratePath: string,
  options: {
    excelValidator?: string;
    modeValidator?: string;
    ignoreFiles?: boolean;
    namespace?: string;
  } = {}
): Promise<ValidationResult> => {
  const result: ValidationResult = {
    success: false,
    errors: [],
    warnings: [],
    info: []
  };

  try {
    // Resolve the crate path
    const resolvedPath = path.resolve(cratePath);
    let crateDir: string;
    let metadataFile: string;

    if (await fs.pathExists(resolvedPath)) {
      const stat = await fs.stat(resolvedPath);
      if (stat.isDirectory()) {
        crateDir = resolvedPath;
        metadataFile = path.join(crateDir, "ro-crate-metadata.json");
      } else if (
        path.basename(resolvedPath) === "ro-crate-metadata.json" ||
        path.extname(resolvedPath) === ".json"
      ) {
        crateDir = path.dirname(resolvedPath);
        metadataFile = resolvedPath;
      } else {
        result.errors.push({
          type: "error",
          message: `Invalid path: ${cratePath}. Must be a directory or JSON file`
        });
        return result;
      }
    } else {
      result.errors.push({
        type: "error",
        message: `Path does not exist: ${cratePath}`
      });
      return result;
    }

    result.info.push({
      type: "info",
      message: `Validating RO-Crate: ${crateDir}`
    });

    // Check if metadata file exists
    if (!(await fs.pathExists(metadataFile))) {
      result.errors.push({
        type: "error",
        message: "No ro-crate-metadata.json file found"
      });
      return result;
    }

    // Load the RO-Crate metadata file
    try {
      await fs.readJson(metadataFile);
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
      `Validating RO-Crate at: ${crateDir} with metadata file: ${metadataFile}`
    );

    const workingDir = crateDir;

    // Use oni-ocfl Collector for enhanced validation
    try {
      result.info.push({
        type: "info",
        message: "Running oni-ocfl Collector validation"
      });

      // Ensure there's a package.json with repository info for the validation
      const validatorPackageJsonPath = path.join(workingDir, "package.json");
      if (!(await fs.pathExists(validatorPackageJsonPath))) {
        await fs.writeJson(validatorPackageJsonPath, {
          name: "lameta-rocrate-validator-temp",
          version: "1.0.0",
          repository: {
            type: "git",
            url: "git+https://github.com/onset/lameta.git"
          }
        });
      }

      // Use a simpler temp directory approach to avoid hanging
      const tempRepoPath = path.join(
        os.tmpdir(),
        `.temp-ocfl-repo-${Date.now()}`
      );

      result.info.push({
        type: "info",
        message: `Creating temporary OCFL repository at: ${tempRepoPath}`
      });

      console.log(
        "creating collector with options:",
        JSON.stringify(
          {
            repoPath: tempRepoPath,
            namespace: options.namespace || "validation-temp",
            dataDir: workingDir,
            template: workingDir
          },
          null,
          2
        )
      );
      // Create a temporary collector for validation with minimal options
      const tempCollector = new Collector({
        repoPath: tempRepoPath,
        namespace: options.namespace || "validation-temp",
        dataDir: workingDir,
        template: workingDir
      });

      console.log("connect");
      // Connect to the repository
      await tempCollector.connect();

      result.info.push({
        type: "info",
        message: "✓ Collector created and connected successfully"
      });

      // Create a temporary object for validation
      const tempObject = tempCollector.newObject(workingDir);

      // Need to set an ID for the object before adding to repo
      tempObject.mintArcpId("validation", "temp-object");

      result.info.push({
        type: "info",
        message: `✓ Object created with ID: ${tempObject.id}`
      });

      console.log("Adding object to repository...");
      // Run the oni-ocfl validation (this will throw if validation fails)
      try {
        await tempObject.addToRepo(options.ignoreFiles || true);
        result.info.push({
          type: "info",
          message: "✓ oni-ocfl Collector validation passed"
        });
      } catch (validationError) {
        // Handle repository URL errors more specifically
        const errorMessage =
          validationError instanceof Error
            ? validationError.message
            : String(validationError);
        if (errorMessage.includes("repository.url")) {
          result.errors.push({
            type: "error",
            message: `oni-ocfl Collector validation failed: Missing or incorrect repository.url in package.json. Please ensure your package.json has the correct repository URL.`
          });
        } else {
          result.errors.push({
            type: "error",
            message: `oni-ocfl Collector validation failed: ${validationError}`
          });
        }
      }
      console.log("cleaning temporary repository...");

      // Clean up temporary repo and package.json
      if (await fs.pathExists(tempRepoPath)) {
        await fs.remove(tempRepoPath);
      }

      // Remove temporary package.json if we created one
      const tempPackageJsonPath = path.join(workingDir, "package.json");
      if (await fs.pathExists(tempPackageJsonPath)) {
        const packageJson = await fs.readJson(tempPackageJsonPath);
        if (packageJson.name === "lameta-rocrate-validator-temp") {
          await fs.remove(tempPackageJsonPath);
        }
      }

      // Clean up temporary working directory if we created one
      if (cleanupTempDir && (await fs.pathExists(workingDir))) {
        await fs.remove(workingDir);
        result.info.push({
          type: "info",
          message: "Cleaned up temporary working directory"
        });
      }
    } catch (error) {
      result.errors.push({
        type: "error",
        message: `Could not run oni-ocfl Collector validation: ${error}`
      });
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
};

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

/**
 * Main function for command line usage
 */
const main = async (): Promise<void> => {
  if (process.argv.length < 3) {
    console.log(
      "Usage: node validate_oni_ocfl.js <path_to_directory_or_json_file> [--excel-validator <file>] [--mode-validator <file>] [--namespace <name>] [--ignore-files]"
    );
    process.exit(1);
  }

  const cratePath = process.argv[2];
  const options: {
    excelValidator?: string;
    modeValidator?: string;
    ignoreFiles?: boolean;
    namespace?: string;
  } = {};

  // Parse command line options
  for (let i = 3; i < process.argv.length; i++) {
    const arg = process.argv[i];
    switch (arg) {
      case "--excel-validator":
        options.excelValidator = process.argv[++i];
        break;
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
    const result = await validateRoCrateWithOniOcfl(cratePath, options);
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
