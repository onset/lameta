# RO-Crate Validation Scripts

This folder contains Python scripts for validating RO-Crate metadata, specifically tailored for Lameta and LDAC (Language Data Commons) profiles.

## Prerequisites

Make sure you have the Python environment set up with the required packages:

```bash
# Install required Python packages
pip install rocrate
```

## Scripts

### 1. `lameta_rocrate_validation.py` (Recommended)

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

# Or use the npm/yarn script
yarn validate-rocrate
npm run validate-rocrate
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

The main validation script is integrated into the project's package.json as the `validate-rocrate` script, making it easy to run as part of your development workflow.
