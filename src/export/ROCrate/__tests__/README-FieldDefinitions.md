# Field Definitions in RO-Crate Tests

## Overview

RO-Crate tests can use either **real field definitions** from `fields.json5` or **mock field definitions** for testing. This document explains when to use each approach.

## Real vs Mock Field Definitions

### ✅ Use Real Field Definitions (Recommended)

**When:** Most integration and feature tests

**Benefits:**

- Tests actual field configuration used in production
- Catches issues when `fields.json5` is broken or misconfigured
- Uses real RO-Crate templates and mappings
- Ensures field definitions work with actual export logic
- More accurate representation of user experience

**Usage:**

```typescript
import { setupCommonMocks } from "./test-utils/rocrate-test-setup";

beforeEach(() => {
  setupCommonMocks(true); // Use real fields.json5
});
```

### ⚠️ Use Mock Field Definitions

**When:** Specific edge cases or unit tests

**Benefits:**

- Test error conditions with malformed field definitions
- Test unusual field combinations that don't exist in real config
- Faster execution (no file system operations)
- More predictable/controlled test environment

**Usage:**

```typescript
import { setupCommonMocks } from "./test-utils/rocrate-test-setup";

beforeEach(() => {
  setupCommonMocks(false); // Use mocks (default)
});
```

## Examples

### Integration Test (Real Fields)

```typescript
describe("RO-Crate Export Integration", () => {
  beforeEach(() => {
    setupCommonMocks(true); // Use real field definitions
  });

  it("should export genre field with correct RO-Crate mapping", () => {
    // This test uses the actual genre field definition from fields.json5
    // including its rocrate.template configuration
  });
});
```

### Unit Test (Mock Fields)

```typescript
describe("Field Processing Edge Cases", () => {
  beforeEach(() => {
    setupCommonMocks(false); // Use simple mocks
  });

  it("should handle missing field definition gracefully", () => {
    // This test can control exactly which fields exist
  });
});
```

## Field Configuration Location

Real field definitions are loaded from:

- `archive-configurations/lameta/fields.json5`

This file contains:

- Field definitions for `common`, `project`, `session`, `person`
- RO-Crate mapping templates (`rocrate` property)
- Field labels, types, validation rules
- Vocabulary mappings

## Testing Field Configuration Changes

When you modify `fields.json5`, tests using real field definitions will automatically reflect your changes and catch any issues:

```typescript
// This test will fail if you break the JSON5 syntax or remove required fields
it("should load real field definitions without errors", () => {
  setupCommonMocks(true);

  // Verify essential fields exist
  expect(
    fieldDefinitionsOfCurrentConfig.session.find((f) => f.key === "genre")
  ).toBeDefined();
  expect(
    fieldDefinitionsOfCurrentConfig.project.find((f) => f.key === "title")
  ).toBeDefined();
});
```

## Migration Strategy

**For new tests:** Use real field definitions by default

```typescript
setupCommonMocks(true); // Recommended
```

**For existing tests:**

- Keep mocks if the test specifically needs controlled field definitions
- Consider migrating to real fields if the test would benefit from integration testing
- Both approaches can coexist in the same test suite

## Available Helper Functions

```typescript
// Setup real field definitions
setupRealFieldDefinitions();

// Setup mock field definitions
setupFieldDefinitionMocks();

// Setup all mocks with choice of field definitions
setupCommonMocks(useReal: boolean);

// Get mock field definitions for custom scenarios
getCommonFieldDefinitions();
getSessionFieldDefinitions();
```
