# TypeScript RO-Crate Validation with oni-ocfl

This directory contains TypeScript validation scripts for Lameta RO-Crate files using the [oni-ocfl](https://github.com/Language-Research-Technology/oni-ocfl) library.

## Files

- `validate_oni_ocfl.ts` - Main validation script using oni-ocfl Collector
- `test_oni_ocfl.ts` - Test script for the validation
- `lameta_rocrate_validation.py` - Original Python validation script

## Usage

### Command Line

```bash
# Validate a specific ro-crate-metadata.json file
bun validate-rocrate-oni /path/to/ro-crate-metadata.json

# Validate a directory containing ro-crate-metadata.json
bun validate-rocrate-oni /path/to/rocrate-directory

# With additional validation options
bun tsx ro-crate-validation/validate_oni_ocfl.ts /path/to/crate --mode-validator https://example.com/mode.json --namespace my-namespace --ignore-files
```

### Programmatic Usage

```typescript
import { validateRoCrateWithOniOcfl, printResults } from "./validate_oni_ocfl";

const result = await validateRoCrateWithOniOcfl("/path/to/crate", {
  modeValidator:
    "https://language-research-technology.github.io/ro-crate-modes/modes/comprehensive-ldac.json",
  namespace: "my-validation",
  ignoreFiles: true
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

## Testing

Run the test script to verify the validation works:

```bash
bun test-validate-oni
```

This will test the validation against the sample ro-crate-metadata.json file in this directory.
