#!/usr/bin/env tsx
/**
 * Command-line script to validate RO-Crate/LDAC files
 * Usage: yarn tsx scripts/validate-rocrate.ts <path-to-ro-crate-metadata.json>
 */

import * as fs from "fs-extra";
import * as path from "path";
import { RoCrateValidator } from "../src/export/ROCrate/RoCrateValidator";
import { LdacValidator } from "../src/export/ROCrate/LdacValidator";

async function validate(filePath: string) {
  console.log("=== RO-Crate/LDAC Validation Results ===");
  console.log("File:", filePath);
  console.log("");

  let roCrate: any;
  try {
    roCrate = await fs.readJson(filePath);
  } catch (err: any) {
    console.error("Error reading file:", err.message);
    process.exit(1);
  }

  const validator = new RoCrateValidator();
  const result = validator.validate(roCrate);

  console.log(`ERRORS (${result.errors.length}):`);
  result.errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));

  console.log("");
  console.log(`WARNINGS (${result.warnings.length}):`);
  result.warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));

  // Also run hierarchy validation explicitly
  console.log("");
  console.log("=== LDAC Hierarchy Validation ===");
  const ldacValidator = new LdacValidator();
  const hierarchyErrors: string[] = [];
  const hierarchyWarnings: string[] = [];
  ldacValidator.validateCrateHierarchy(
    roCrate["@graph"],
    hierarchyErrors,
    hierarchyWarnings
  );

  console.log(`Hierarchy ERRORS (${hierarchyErrors.length}):`);
  hierarchyErrors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));

  console.log(`Hierarchy WARNINGS (${hierarchyWarnings.length}):`);
  hierarchyWarnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));

  console.log("");
  console.log("Overall valid:", result.isValid);

  process.exit(result.isValid ? 0 : 1);
}

// Main entry point
if (process.argv.length < 3) {
  console.log(
    "Usage: yarn tsx scripts/validate-rocrate.ts <path-to-ro-crate-metadata.json>"
  );
  process.exit(1);
}

const filePath = path.resolve(process.argv[2]);
validate(filePath);
