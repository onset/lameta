# TypeScript RO-Crate Validation with oni-ocfl

This directory contains TypeScript validation scripts for Lameta RO-Crate files using the [oni-ocfl](https://github.com/Language-Research-Technology/oni-ocfl) library.

## Files

- `validate_oni_ocfl.ts` - Main validation script using oni-ocfl Collector
- `lameta_rocrate_validation.py` - Original Python validation script

## Usage

### Command Line

```bash
# Validate a specific ro-crate-metadata.json file
vp exec tsx ro-crate-validation/validate_oni_ocfl.ts /path/to/ro-crate-metadata.json

# Validate a directory containing ro-crate-metadata.json
vp exec tsx ro-crate-validation/validate_oni_ocfl.ts /path/to/rocrate-directory

# With additional validation options
vp exec tsx ro-crate-validation/validate_oni_ocfl.ts /path/to/crate --mode-validator https://example.com/mode.json --namespace my-namespace --ignore-files

# Validate the sample crates in this directory
vp run validate-oni-fishing
vp run validate-oni-farms
```

### Programmatic Usage

```typescript
import { validateRoCrateWithOniOcfl, printResults } from "./validate_oni_ocfl";

const result = await validateRoCrateWithOniOcfl("/path/to/crate", {
  modeValidator:
    "https://language-research-technology.github.io/ro-crate-modes/modes/comprehensive-ldac.json",
  namespace: "my-validation",
  ignoreFiles: true,
});

const success = printResults(result);
console.log(`Validation ${success ? "passed" : "failed"}`);
```

## Options

- `--excel-validator <file>` - Path to Excel validation file
- `--mode-validator <file>` - Path or URL to mode validation file
- `--namespace <name>` - Namespace for the OCFL repository (default: "validation-temp")
- `--ignore-files` - Skip file existence validation

## How it Works

The script:

1. **Loads the RO-Crate** using the ro-crate library for basic JSON-LD validation
2. **Uses oni-ocfl Collector** to perform comprehensive validation including:
   - OCFL repository structure validation
   - Excel-based validation (if provided)
   - Mode-based validation (if provided)
   - File integrity checking (unless `--ignore-files` is used)
3. **Reports results** with detailed error, warning, and info messages

The oni-ocfl Collector handles all the complex validation logic including LDAC profile conformance, language metadata validation, and publisher information checking.
