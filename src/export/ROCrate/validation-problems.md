# RO-Crate Validation Problems

This document lists validation problems found by running the enhanced `RoCrateValidator` against existing test fixtures. These represent issues in the test data that now fail validation due to stricter compliance with the RO-Crate 1.2 specification.

---

## Problem 2: Referenced Entities Not Described in RO-Crate

### Rule Violated

> **(line 431)** Any referenced _contextual entities_ SHOULD be described in the _RO-Crate Metadata Document_ with the same identifier. Any _contextual entity_ in the _RO-Crate Metadata Document_ SHOULD be linked to from at least one of the other entities using the same identifier.

### Actual Output

```json
{
  "@id": "./",
  "@type": ["Dataset", "RepositoryCollection"],
  "license": { "@id": "#license" },
  "author": [{ "@id": "#person" }],
  "publisher": [{ "@id": "#org" }]
}
```

The `@graph` array does **not** contain entities with `@id` values `#license`, `#person`, or `#org`.

### Why It Breaks the Rule

When the root entity references `#license`, `#person`, and `#org`, those contextual entities **should** be described as separate entities in the `@graph` array. Without them, consumers cannot resolve these references.

### Warning Messages

```
Entity "./" license references "#license" which is not described in the RO-Crate (line 431)
Entity "./" author[0] references "#person" which is not described in the RO-Crate (line 431)
Entity "./" publisher[0] references "#org" which is not described in the RO-Crate (line 431)
Entity "Sessions/ETR001/audio.wav" license references "#license-open" which is not described in the RO-Crate (line 431)
```

---

## Problem 3: Entities Not Referenced by Any Other Entity

### Rule Violated

> **(line 654)** The entity SHOULD be ultimately referenceable from the root data entity (possibly through another reachable data entity or contextual entity).

### Actual Output

```json
{
  "@graph": [
    {
      "@id": "#session-ETR001",
      "@type": ["RepositoryObject", "CollectionEvent"],
      "name": ["Session"]
    },
    {
      "@id": "Sessions/ETR001/audio.wav",
      "@type": "AudioObject",
      "name": "Audio file"
    }
  ]
}
```

Neither `#session-ETR001` nor `Sessions/ETR001/audio.wav` is referenced by any other entity in the graph.

### Why It Breaks the Rule

Every entity in the RO-Crate should be reachable from the root data entity through a chain of references. Orphaned entities that are not referenced suggest incomplete metadata or entities that serve no purpose.

### Warning Messages

```
Entity "#session-ETR001" is not referenced by any other entity (line 431, 654)
Entity "Sessions/ETR001/audio.wav" is not referenced by any other entity (line 431, 654)
```

---

## Problem 4: Data Entities Not Linked via `hasPart`

### Rule Violated

> **(line 1032)** Where files and folders are represented as _Data Entities_ in the RO-Crate JSON-LD, these MUST be linked to, either directly or indirectly, from the [Root Data Entity](#root-data-entity) using the [hasPart](http://schema.org/hasPart) property. Directory hierarchies MAY be represented with nested [Dataset](http://schema.org/Dataset) _Data Entities_, or the Root Data Entity MAY refer to files anywhere in the hierarchy using [hasPart](http://schema.org/hasPart).

### Actual Output

```json
{
  "@graph": [
    {
      "@id": "./",
      "@type": ["Dataset", "RepositoryCollection"],
      "name": "Test dataset"
      // No hasPart property!
    },
    {
      "@id": "Sessions/ETR001/audio.wav",
      "@type": "AudioObject",
      "name": "Audio file"
    }
  ]
}
```

The root entity does not have a `hasPart` property linking to `Sessions/ETR001/audio.wav`.

### Why It Breaks the Rule

Data entities (Files and Datasets) **must** be linked from the Root Data Entity via `hasPart`, either directly or through nested Dataset entities. Without this linkage, consumers cannot discover which files belong to the RO-Crate.

### Warning Message

```
Data entity "Sessions/ETR001/audio.wav" is not linked from Root Data Entity via hasPart (line 1032)
```

---

## Problem 5: File Entities Missing `encodingFormat`

### Rule Violated

> **(line 1144)** Additionally, `File` entities SHOULD have:
>
> - `encodingFormat`: The IANA media type (MIME type) of the file, e.g. `"audio/wav"`

### Actual Output

```json
{
  "@id": "Sessions/ETR001/audio.wav",
  "@type": "AudioObject",
  "name": "Audio file",
  "license": { "@id": "#license-open" }
}
```

No `encodingFormat` property is present.

### Why It Breaks the Rule

File entities should declare their MIME type via `encodingFormat` so consumers know how to process the file. For an audio file, this would be `"audio/wav"` or similar.

### Warning Message

```
File "Sessions/ETR001/audio.wav" should have encodingFormat property (line 1144)
```

---

## Problem 6: Dataset `@id` Not Ending with `/`

### Rule Violated

> **(line 1160-1165)** A [Dataset](http://schema.org/Dataset) (directory) _Data Entity_ MUST have the following properties:
>
> - `@id` MUST be either:
>   - In an _Attached RO-Crate Package_ ONLY -- a _URI Path_ that SHOULD end with `/`. This MUST resolve to a directory which is present in the RO-Crate Root along with its parent directories.

### Actual Output

```json
{
  "@id": "subfolder",
  "@type": "Dataset",
  "name": "Subfolder"
}
```

### Why It Breaks the Rule

Directory (Dataset) entities in an Attached RO-Crate should have their `@id` end with `/` to clearly indicate they represent directories, not files.

### Warning Message

```
Dataset "subfolder" @id should end with / (line 1164)
```

---

## Summary of Test Failures

| Test                                                        | Problem                                                                     | Type            |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- | --------------- |
| `should pass for valid RO-Crate with all requirements`      | datePublished as array, missing referenced entities, unlinked data entities | ERROR + WARNING |
| `should honor alias mapping for ldac subject language URIs` | Same as above                                                               | ERROR + WARNING |
| `should match required properties when using full dct URIs` | datePublished as array                                                      | ERROR           |
| `should not warn when directory @id ends with /`            | Entity not referenced by any other entity                                   | WARNING         |
| `should not warn for Dataset with fragment @id`             | Entity not referenced by any other entity                                   | WARNING         |

---

## Recommended Fixes

### Fix 1: Change `datePublished` from Array to String

```diff
- "datePublished": ["2024-01-01"]
+ "datePublished": "2024-01-01"
```

### Fix 2: Add Missing Contextual Entities

```json
{
  "@id": "#license",
  "@type": "CreativeWork",
  "name": "License",
  "description": "License description"
},
{
  "@id": "#person",
  "@type": "Person",
  "name": "Test Person"
},
{
  "@id": "#org",
  "@type": "Organization",
  "name": "Test Organization"
},
{
  "@id": "#license-open",
  "@type": "CreativeWork",
  "name": "Open License"
}
```

### Fix 3: Add `hasPart` to Root Entity

```json
{
  "@id": "./",
  "@type": ["Dataset", "RepositoryCollection"],
  "hasPart": [
    { "@id": "Sessions/ETR001/audio.wav" },
    { "@id": "#session-ETR001" }
  ]
}
```

### Fix 4: Add `encodingFormat` to File Entities

```json
{
  "@id": "Sessions/ETR001/audio.wav",
  "@type": "AudioObject",
  "name": "Audio file",
  "encodingFormat": "audio/wav"
}
```

### Fix 5: Ensure Directory `@id` Ends with `/`

```diff
- "@id": "subfolder"
+ "@id": "subfolder/"
```

### Fix 6: Reference All Entities from Root or Other Entities

Ensure every entity is reachable from the root via property references like `hasPart`, `author`, `mentions`, etc.

---

# Problems Found in Real Data: hewya Project

The following problems were found when validating `C:\Users\hatto\OneDrive\Documents\lameta\hewya\ro-crate-metadata.json` (November 28, 2025).

---

## Problem 7: Contextual Entities Not Referenced (Orphaned Entities)

### Rule Violated

> **(line 431)** Any referenced _contextual entities_ SHOULD be described in the _RO-Crate Metadata Document_ with the same identifier. Any _contextual entity_ in the _RO-Crate Metadata Document_ SHOULD be linked to from at least one of the other entities using the same identifier.
>
> **(line 654)** The entity SHOULD be ultimately referenceable from the root data entity (possibly through another reachable data entity or contextual entity).

### Actual Output

```json
{
  "@id": "ldac:AuthorizedAccess",
  "@type": "DefinedTerm",
  "name": "Authorized Access",
  "description": "Data covered by this license requires explicit authorization for access.",
  "inDefinedTermSet": { "@id": "ldac:AccessTypes" }
},
{
  "@id": "ldac:DataReuseLicense",
  "@type": "Class",
  "subClassOf": { "@id": "http://schema.org/CreativeWork" },
  "description": "A license document, setting out terms for reuse of data."
}
```

These entities exist in the `@graph` but are not referenced by any other entity in the RO-Crate.

### Why It Breaks the Rule

While `ldac:OpenAccess` is correctly referenced by the licenses, `ldac:AuthorizedAccess` is defined but never used. Similarly, `ldac:DataReuseLicense` is defined as a class but no entity references it directly. All entities should be reachable from the root data entity through a chain of references. Orphaned entities suggest either incomplete metadata or entities that serve no purpose.

### Warning Messages

```
Entity "ldac:AuthorizedAccess" is not referenced by any other entity (line 431, 654)
Entity "ldac:DataReuseLicense" is not referenced by any other entity (line 431, 654)
```

### Recommended Fix

Either remove the unreferenced entities, or ensure they are referenced by another entity. For `ldac:AuthorizedAccess`, consider whether any files in the collection should use this access level.

---

## Problem 8: Files in Nested Structures Not Linked via `hasPart`

### Rule Violated

> **(line 1032)** Where files and folders are represented as _Data Entities_ in the RO-Crate JSON-LD, these MUST be linked to, either directly or indirectly, from the [Root Data Entity](#root-data-entity) using the [hasPart](http://schema.org/hasPart) property. Directory hierarchies MAY be represented with nested [Dataset](http://schema.org/Dataset) _Data Entities_, or the Root Data Entity MAY refer to files anywhere in the hierarchy using [hasPart](http://schema.org/hasPart).

### Actual Output

The root entity `./` has:

```json
{
  "@id": "./",
  "hasPart": [
    { "@id": "./hewya.sprj" },
    { "@id": "OtherDocuments/some%20other%20doc.txt" },
    { "@id": "People/" }
  ]
}
```

And session objects have their own `hasPart`:

```json
{
  "@id": "#session-ETR009",
  "hasPart": [
    { "@id": "Sessions/ETR009/ETR009.session" },
    { "@id": "Sessions/ETR009/SceneHouse.JPG" },
    ...
  ]
}
```

But the session entities (`#session-ETR008`, `#session-ETR009`) are linked via `pcdm:hasMember`, not `hasPart`.

### Why It Breaks the Rule

The RO-Crate specification requires data entities (Files and Datasets) to be linked from the Root Data Entity via `hasPart`, either directly or indirectly. While the session entities are linked via `pcdm:hasMember`, the validator cannot traverse this property to find the nested files. The files within sessions are orphaned from the `hasPart` hierarchy.

### Warning Messages

```
Data entity "People/Awi_Heole/Awi_Heole.person" is not linked from Root Data Entity via hasPart (line 1032)
Data entity "People/Awi_Heole/Awi_Heole_Photo.JPG" is not linked from Root Data Entity via hasPart (line 1032)
Data entity "People/Awi_Heole/Awi_Heole_Consent.JPG" is not linked from Root Data Entity via hasPart (line 1032)
Data entity "Sessions/ETR008/ETR008.session" is not linked from Root Data Entity via hasPart (line 1032)
Data entity "People/Ilawi_Amosa/Ilawi_Amosa.person" is not linked from Root Data Entity via hasPart (line 1032)
Data entity "People/Ilawi_Amosa/Ilawi_Amosa_Photo.jpg" is not linked from Root Data Entity via hasPart (line 1032)
Data entity "People/Ilawi_Amosa/Ilawi_Amosa_Consent.JPG" is not linked from Root Data Entity via hasPart (line 1032)
Data entity "Sessions/ETR009/ETR009.session" is not linked from Root Data Entity via hasPart (line 1032)
Data entity "Sessions/ETR009/SceneHouse.JPG" is not linked from Root Data Entity via hasPart (line 1032)
Data entity "Sessions/ETR009/SceneAroundCamera.JPG" is not linked from Root Data Entity via hasPart (line 1032)
Data entity "Sessions/ETR009/ETR009_XDoc.docx" is not linked from Root Data Entity via hasPart (line 1032)
Data entity "Sessions/ETR009/ETR009_Tiny_StandardAudio.wav.annotations.eaf" is not linked from Root Data Entity via hasPart (line 1032)
Data entity "Sessions/ETR009/ETR009_Tiny.mp4" is not linked from Root Data Entity via hasPart (line 1032)
Data entity "Sessions/ETR009/ETR009_Careful.mp3" is not linked from Root Data Entity via hasPart (line 1032)
Data entity "Sessions/ETR009/ETR009_AText.txt" is not linked from Root Data Entity via hasPart (line 1032)
Data entity "DescriptionDocuments/pretend%20description.txt" is not linked from Root Data Entity via hasPart (line 1032)
```

### Recommended Fix

**Option A**: Add intermediate `Dataset` entities for session directories and link them via `hasPart`:

```json
{
  "@id": "./",
  "hasPart": [
    { "@id": "Sessions/" },
    { "@id": "People/" },
    { "@id": "DescriptionDocuments/" },
    { "@id": "./hewya.sprj" },
    { "@id": "OtherDocuments/some%20other%20doc.txt" }
  ]
}
```

Then create Dataset entities:

```json
{
  "@id": "Sessions/",
  "@type": "Dataset",
  "name": "Sessions",
  "hasPart": [
    { "@id": "Sessions/ETR008/" },
    { "@id": "Sessions/ETR009/" }
  ]
},
{
  "@id": "Sessions/ETR009/",
  "@type": "Dataset",
  "name": "ETR009",
  "hasPart": [
    { "@id": "Sessions/ETR009/ETR009.session" },
    { "@id": "Sessions/ETR009/SceneHouse.JPG" },
    ...
  ]
}
```

**Option B**: Alternatively, extend the validator to follow `pcdm:hasMember` relationships when traversing the hierarchy (this would be a custom extension for LDAC-specific profiles).

---

## Problem 9: License Entities Missing `name` Property

### Rule Violated

> **(line 651)** The entity SHOULD have a human-readable `name`, in particular if its `@id` does not go to a human-readable Web page.

### Actual Output

```json
{
  "@id": "#license-paradisec-open",
  "@type": "ldac:DataReuseLicense",
  "ldac:access": { "@id": "ldac:OpenAccess" },
  "description": "Marked with the PARADISEC-specific term, 'Open' which means 'Open (subject to PARADISEC access conditions)'"
}
```

The entity has a `description` but no `name`.

### Why It Breaks the Rule

All entities should have a human-readable `name` property to identify them to users and consumers of the RO-Crate. This is especially important for entities with fragment identifiers like `#license-paradisec-open` that don't resolve to a web page.

### Warning Messages

```
Entity "#license-paradisec-open" should have a name property (line 651)
Entity "ldac:DataReuseLicense" should have a name property (line 651)
```

### Recommended Fix

```diff
{
  "@id": "#license-paradisec-open",
  "@type": "ldac:DataReuseLicense",
+ "name": "PARADISEC Open Access License",
  "ldac:access": { "@id": "ldac:OpenAccess" },
  "description": "Marked with the PARADISEC-specific term, 'Open' which means 'Open (subject to PARADISEC access conditions)'"
}
```

---

## Summary: hewya Project Validation Results

| Issue                          | Count  | Type    | Spec Reference |
| ------------------------------ | ------ | ------- | -------------- |
| Orphaned contextual entities   | 2      | WARNING | line 431, 654  |
| Files not linked via hasPart   | 16     | WARNING | line 1032      |
| Entities missing name property | 2      | WARNING | line 651       |
| **Total**                      | **20** | WARNING | -              |

The hewya project RO-Crate is **technically valid** (no errors), but has **20 warnings** that should be addressed for better RO-Crate 1.2 compliance.
