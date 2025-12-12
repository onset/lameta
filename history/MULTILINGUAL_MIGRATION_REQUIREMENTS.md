## Executive Summary

lameta needs to help users migrate legacy slash-delimited multilingual content (e.g., `"Under the House / Bajo la Casa"`) to the tagged multilingual format (e.g., `"[[en]]Under the House[[es]]Bajo la Casa"`). This document defines the clean-start requirements based on lessons learned from the initial implementation attempt.

### 1.1 Definitions

| Term                        | Definition                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------- |
| **Unmarked text**           | Plain text without language tags (e.g., `"Under the House"`)                                      |
| **Slash-delimited text**    | Unmarked text with multiple languages separated by `/` (e.g., `"Under the House / Bajo la Casa"`) |
| **Tagged text**             | Text with explicit language markers (e.g., `"[[en]]Under the House[[es]]Bajo la Casa"`)           |
| **Working languages**       | The ordered list of languages configured for the project (stored in `collectionWorkingLanguages`) |
| **Metadata language slots** | The language slots available based on archive configuration (derived from working languages)      |
| **Language detection**      | Using NLP to identify what language a piece of text is written in                                 |
| **Language tagging**        | Applying language markers to text based on the configured working languages                       |

## 3. Phase 2: Language Tagging (Migration)

### 3.1 Purpose

Convert slash-delimited text to tagged format using project.getMetadataLanguageSlots().

### 3.2 Where Tagging Should Occur

Tagging only occurs when something requests, be it a UI control or an export function

### 3.3 Tagging Algorithm Requirements

#### 3.3.1 Input Requirements

- [ ] Slash-delimited text field
- [ ] Configured working languages (from project settings)

#### 3.3.2 Algorithm

```
For each slash-delimited field:
  1. Split text on "/" delimiter
  2. Trim whitespace from each part
  3. For each part at position N:
     a. If position N < number of working languages:
        → Use working language at position N
     b. Else:
        → Mark as "unknown_N" (e.g., "unknown_3")
  4. Construct tagged string: [[lang1]]part1[[lang2]]part2...
```

#### 3.3.3 Edge Cases

| Scenario                           | Behavior                                 |
| ---------------------------------- | ---------------------------------------- |
| More parts than working languages  | Extra parts get `unknown_N` tags         |
| Fewer parts than working languages | Only use as many tags as there are parts |
| Empty part after split             | Skip it                                  |
| Text already has `[[` tags         | Skip migration (already tagged)          |
| Field not marked multilingual      | Skip migration                           |

### 3.4 Tagging Output

```typescript
interface TaggingResult {
  migratedCount: number;
  migratedFields: string[]; // Keys of migrated fields
  warnings: TaggingWarning[];
}

interface TaggingWarning {
  folder: string; // Session or Person display name
  field: string; // Field key
  message: string; // e.g., "Field has 4 parts but only 2 working languages configured"
}
```

---

## 4. User Interface Requirements

### 4.1 Language Detection Panel

**Location:** Project → Languages tab (top of tab, before language configuration)

**Visibility Conditions:**

- Working languages count < 2
- Archive config has multilingual fields enabled
- At least one field has slash-delimited content

**Components:**

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚡ Language Detection                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ We detected these languages in your slash-delimited fields:                │
│                                                                             │
│   1. English (en)     ✓ High confidence                                    │
│   2. Spanish (es)     ✓ High confidence                                    │
│   3. Portuguese (pt)  ⚠ Low confidence — verify this                       │
│                                                                             │
│ ┌─────────────────────────────────────────────────────────────────────────┐│
│ │ ⚠ Please verify these match the order in your fields.                  ││
│ │ Example: "English / Español / Português" → English, Spanish, Portuguese ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
│ [ Apply These Languages ]  [ Dismiss ]  [ Retry Detection ]                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**States:**

1. `scanning` — Collecting content from project
2. `detecting` — Running language detection API
3. `complete` — Showing results
4. `error` — Detection failed (with retry option)

### 4.2 Migration Warnings

**Location:** Export dialog (before export proceeds)

**When:** User has slash-delimited content that will be migrated

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ ⚠ Multilingual Content Migration                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│ Found 47 fields with slash-delimited content that will be migrated.        │
│                                                                             │
│ Working languages configured: English, Spanish                              │
│                                                                             │
│ ⚠ 3 fields have more parts than configured languages.                     │
│   These extra parts will be marked as "unknown".                            │
│                                                                             │
│ [ Review Before Export ]  [ Continue with Export ]  [ Cancel ]              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.3 Field-Level Unknown Marker Display

When a field contains `[[unknown_N]]` tags, the UI should:

- [ ] Display the unknown slot with a warning style
- [ ] Allow user to manually assign a language to that slot
- [ ] Show tooltip explaining: "This text slot could not be matched to a configured language"

---

## 5. Data Model Requirements

### 5.1 Working Languages Storage

**Location:** `collectionWorkingLanguages` project property

**Format:** Semicolon-separated language codes with optional names

- Simple: `"eng;spa;por"`
- With names: `"eng:English;spa:Spanish;por:Portuguese"`

### 5.2 Field Definitions

**Multilingual Flag:** `FieldDefinition.multilingual: boolean`

When `true`:

- Field UI shows language tabs/slots
- Field participates in migration scanning
- Text is stored in tagged format

### 5.3 Tagged Text Format

**Format:** `[[langcode]]text[[langcode2]]text2...`

**Examples:**

- `[[en]]Hello[[es]]Hola`
- `[[en]]Title[[es]]Título[[unknown_3]]Third part`

**Rules:**

- Language codes are typically ISO 639-1 (2-letter) or ISO 639-3 (3-letter)
- `unknown_N` is a special marker for unmatched slots
- No delimiter between tagged segments

---

## 6. Technical Implementation Notes

### 6.1 Separation of Concerns

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CLEAN ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────┐    ┌─────────────────────┐                        │
│  │ LanguageDetector    │    │ MultilingualTagger  │                        │
│  │ ─────────────────── │    │ ─────────────────── │                        │
│  │                     │    │                     │                        │
│  │ • detectLanguage()  │    │ • tagField()        │                        │
│  │ • detectBatch()     │    │ • tagAllFields()    │                        │
│  │ • aggregateByPos()  │    │ • migrateProject()  │                        │
│  │                     │    │                     │                        │
│  │ DOES NOT:           │    │ DOES NOT:           │                        │
│  │ • Tag any text      │    │ • Detect language   │                        │
│  │ • Modify fields     │    │ • Use detection API │                        │
│  │ • Save anything     │    │                     │                        │
│  └─────────────────────┘    └─────────────────────┘                        │
│           ↓                          ↓                                     │
│  Used by: Detection Panel    Used by: Export, On-demand migrate            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Detection Service API

```typescript
// In renderer process — no main process / IPC needed
// Uses detectlanguage.com API directly

interface ILanguageDetectionService {
  /**
   * Detect languages for multiple texts using detectlanguage.com batch API.
   * Requires LAMETA_DETECTLANGUAGES_DOTCOM env var with API key.
   * Returns empty array if no API key configured.
   */
  detectLanguageBatch(texts: string[]): Promise<
    Array<{
      language: string;
      isReliable: boolean;
      confidence: number;
    }>
  >;

  /**
   * Check if detection API is available (API key configured)
   */
  isDetectionAvailable(): boolean;
}
```

**Why renderer process only:**

- CLD3 (native module) was unreliable for short phrases — removed
- detectlanguage.com API works fine from renderer via fetch
- Simpler architecture, no IPC overhead

### 6.3 Tagging Service API

```typescript
// In renderer process (pure logic, no native modules)

interface IMultilingualTaggingService {
  /**
   * Check if text looks like slash-delimited multilingual
   */
  looksLikeSlashDelimited(text: string): boolean;

  /**
   * Parse slash-delimited text into parts
   */
  parseSlashDelimited(text: string): string[];

  /**
   * Convert slash-delimited text to tagged format using working languages
   */
  tagWithLanguages(text: string, workingLanguages: string[]): string;

  /**
   * Migrate a field set using working languages (NOT detection)
   */
  migrateFieldSet(
    properties: FieldSet,
    fieldDefinitions: FieldDefinition[],
    workingLanguages: string[]
  ): MigrationResult;
}
```

### 6.4 Process Architecture

**Everything runs in renderer process:**

- Language detection via detectlanguage.com API (fetch works in renderer)
- Tagging logic (pure JavaScript)
- No IPC needed, simpler architecture

**Removed:** CLD3 native module (unreliable for short phrases, added complexity)

---

## 7. What NOT to Do

### 7.1 Anti-Patterns from Current Implementation

| ❌ Don't                                 | ✅ Do Instead                                  |
| ---------------------------------------- | ---------------------------------------------- |
| Run migration on folder selection        | Run migration at export time or on-demand      |
| Detect language per-field during editing | Detect across whole project in Detection Panel |
| Confuse detection with tagging           | Keep them separate: detect → configure → tag   |
| Auto-migrate without user review         | Show Detection Panel, let user confirm         |
| Use detection results directly as tags   | Use working languages for tagging              |
| Track migration state per-folder         | Track only whether project has been migrated   |

### 7.2 Code to Remove/Refactor

The current implementation has these problematic patterns:

1. **FolderPane.tsx** — Triggers migration on folder selection ❌
2. **Session.ts / Person.ts** — Track per-folder migration state ❌
3. **SlashDelimitedMigration.ts** — Mixes detection and tagging ❌
4. **LanguageDetectionPanel.tsx** — Currently coupled to folder migration ❌

---

## 8. Current Implementation Status (To Be Cleaned Up)

### 8.1 Files Changed (Uncommitted)

| File                                | Status   | Clean-Start Action                                |
| ----------------------------------- | -------- | ------------------------------------------------- |
| `SlashDelimitedMigration.ts`        | New      | Refactor: separate detection vs tagging           |
| `SlashDelimitedMigration.spec.ts`   | New      | Keep, update for new API                          |
| `cld3-integration.spec.ts`          | New      | **DELETE** (CLD3 removed)                         |
| `LanguageDetectionPanel.tsx`        | New      | Keep, simplify (detection only)                   |
| `languageDetectionPanel.e2e.ts`     | New      | Keep, update for new flow                         |
| `MainProcessApi.ts`                 | Modified | **REVERT** (remove detection methods)             |
| `MainProcessApiAccess.ts`           | Modified | **REVERT** (remove detection IPC)                 |
| `Project.ts`                        | Modified | Remove migration triggers, keep detection helpers |
| `Session.ts`                        | Modified | Remove per-folder migration                       |
| `Person.ts`                         | Modified | Remove per-folder migration                       |
| `Folder.ts`                         | Modified | Remove migration hooks                            |
| `FolderPane.tsx`                    | Modified | Remove useEffect migration trigger                |
| `ExportDialog.tsx`                  | Modified | Keep, but fix to use working languages            |
| `ProjectTab.tsx`                    | Modified | Keep (adds Detection Panel)                       |
| `TextFieldEdit.tsx`                 | Modified | Remove debug display                              |
| `App.tsx`                           | Modified | Keep or remove debug banner (optional)            |
| `UserSettings.ts`                   | Modified | Keep or remove debug flag (optional)              |
| `menu.ts`                           | Modified | Keep or remove debug menu (optional)              |
| `File.ts`                           | Modified | Remove save-disable hook                          |
| `__mocks__/MainProcessApiAccess.ts` | Modified | **REVERT** (remove detection mocks)               |
| `package.json`                      | Modified | **REVERT** cld3-asm (remove dependency)           |

### 8.2 Debug Code to Remove

- [ ] `TextFieldEdit.tsx` — Language code display badge
- [ ] `App.tsx` — SavingDisabledBanner component
- [ ] `UserSettings.ts` — DisableSavingProjectData property
- [ ] `menu.ts` — "Disable Saving" menu item
- [ ] `File.ts` — Save disable check

### 8.3 Production Code to Refactor

- [ ] Split `SlashDelimitedMigration.ts` into:
  - `LanguageDetectionService.ts` — detection only
  - `MultilingualTaggingService.ts` — tagging only
- [ ] Update `LanguageDetectionPanel.tsx` to only do detection, set working languages
- [ ] Create new tagging flow that runs at export using working languages
- [ ] Remove migration from `FolderPane.tsx`
- [ ] Remove per-folder migration state from `Session.ts` and `Person.ts`

---

## Appendix A: Test Cases

### A.1 Detection Tests

```
Scenario: Detect English/Spanish from multiple sessions
Given: Sessions with fields like:
  - "The quick brown fox / El rápido zorro marrón"
  - "Hello world / Hola mundo"
  - "Good morning / Buenos días"
When: Detection panel runs
Then: Suggests ["en", "es"] with high confidence

Scenario: Handle single-word parts (unreliable)
Given: Sessions with fields like "house / casa"
When: Detection panel runs
Then: Skips single words, uses multi-word texts only

Scenario: Handle mismatched part counts
Given: Sessions with fields like:
  - "One / Uno / Ein" (3 parts)
  - "Two / Dos" (2 parts)
When: Detection panel runs
Then: Detects based on available data, suggests 3 languages
```

### A.2 Tagging Tests

```
Scenario: Tag with matching working languages
Given: Working languages = ["en", "es"]
And: Field = "Hello / Hola"
When: Tagging runs
Then: Result = "[[en]]Hello[[es]]Hola"

Scenario: More parts than working languages
Given: Working languages = ["en", "es"]
And: Field = "Hello / Hola / Bonjour"
When: Tagging runs
Then: Result = "[[en]]Hello[[es]]Hola[[unknown_3]]Bonjour"

Scenario: Fewer parts than working languages
Given: Working languages = ["en", "es", "fr"]
And: Field = "Hello / Hola"
When: Tagging runs
Then: Result = "[[en]]Hello[[es]]Hola"

Scenario: Already tagged
Given: Field = "[[en]]Hello[[es]]Hola"
When: Tagging runs
Then: No change (skip already-tagged fields)
```

---

## Appendix B: Questions for Review

1. ❓ Should the Detection Panel auto-run on first visit, or require user to click a button?
   Auto run is fine.

2. ❓ Should we show a warning if working languages don't match detected languages?

Yes

3. ❓ What happens if user changes working languages after data is already tagged?

That's ok. We dont' re-tag.

4. ❓ Should export proceed if there are `unknown_N` tags, or require user acknowledgment?

That should produce a warning in the log.

5. ❓ How should we handle the case where user has already manually set some working languages but not all?

   **Answer:** Yes, warn for all these cases (if concise):

   - **Scenario A - Partial setup:** Content has more parts than configured languages → warn, suggest adding languages
   - **Scenario B - Language mismatch:** Detected languages differ from configured → warn about possible mismatch
   - **Scenario C - Order mismatch:** Detected order differs from configured order → warn about order

---

_Document created based on analysis of uncommitted changes on branch `language-detection` and user feedback on December 11, 2025._
