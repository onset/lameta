# RO-Crate Validation Scripts

This folder contains validation scripts for RO-Crate metadata, specifically tailored for Lameta and LDAC (Language Data Commons) profiles.

## Prerequisites

### For Python validators:

Make sure you have the Python environment set up with the required packages:

```bash
# Install required Python packages
pip install rocrate
```

### For TypeScript validators:

The TypeScript validators use Node.js dependencies defined in the project's package.json.

## Scripts

### 1. `validate_oni_ocfl.ts` (Latest)

A TypeScript validation script that uses the oni-ocfl library to validate RO-Crate metadata against LDAC/OCFL standards.

**Usage:**

```bash
# Run from project root
bun validate-oni-fishing
bun validate-oni-farms

# Or with specific options
bun tsx ro-crate-validation/validate_oni_ocfl.ts <path_to_rocrate_or_metadata_file> [--excel-validator <file>] [--mode-validator <file>] [--namespace <name>] [--ignore-files]
```

**Notes:**

- This validator requires a valid repository URL in your package.json file.
- If you encounter errors related to "Cannot build Provenance, please add repository.url", ensure your project's package.json has a valid repository.url field.

### 2. `lameta_rocrate_validation.py` (Python-based)

The comprehensive validation script that checks for:

- Basic RO-Crate structure and syntax
- LDAC (Language Data Commons) profile requirements
- Lameta-specific metadata and file types
- Required contexts and conformance declarations
- Reference integrity
- Language metadata validation

**Usage:**

```bash
# Run from project root
python ro-crate-validation/lameta_rocrate_validation.py .

# Or use the npm/bun script
bun validate-rocrate-python
npm run validate-rocrate-python
```

### 2. `test_rocrate_validation.py`

Basic RO-Crate validation script that performs simple structural checks:

- Loads and validates basic RO-Crate structure
- Checks for required top-level properties
- Basic entity counting

**Usage:**

```bash
python ro-crate-validation/test_rocrate_validation.py .
```

### 3. `rocrate_comprehensive_validation.py`

Another comprehensive validation script (if different from the Lameta-specific one).

## Sample Files

### `sample-ro-crate-metadata.json`

A basic sample RO-Crate metadata file for testing the validation scripts.

## Output

The validation scripts provide color-coded output:

- ✅ **INFO**: General information and successful checks
- ⚠️ **WARNINGS**: Non-critical issues that should be addressed
- ❌ **ERRORS**: Critical issues that must be fixed

## Integration

The validation scripts are integrated into the project's package.json:

- `validate-rocrate-python`: Runs the Python validation script
- `validate-rocrate-oni`: Runs the TypeScript validation script using oni-ocfl

These scripts make it easy to run validation as part of your development workflow.

## Troubleshooting

### Repository URL Errors

If you encounter the error `Cannot build Provenance, please add repository.url to your package`, it means the oni-ocfl library can't find the repository URL in your package.json file. The validation script will attempt to create a temporary package.json file with a valid repository URL in the validation directory, but if this fails, you can fix it by:

1. Ensuring your project's package.json has a valid repository.url field:

```json
"repository": {
  "type": "git",
  "url": "git+https://github.com/onset/lameta.git"
}
```

2. The validation script now has a hardcoded repository URL set to "https://github.com/onset/lameta.git".
