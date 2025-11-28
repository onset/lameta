## RO-Crate Metadata Document

- [x] **(line 138)** The _RO-Crate Metadata Document_ MUST contain a flat list of _entities_ as objects in the `@graph` array, cross-referenced using `@id` identifiers rather than being deeply nested.

## Root Data Entity

- [ ] **(line 192)** The _Root Data Entity_ MUST have `@type` `Dataset` (though it MAY have more than one type).

## RO-Crate Metadata Document Requirements

- [ ] **(line 428)** The _RO-Crate Metadata Document_ MUST be valid [JSON-LD 1.0](https://www.w3.org/TR/2014/REC-json-ld-20140116/) in [flattened](https://www.w3.org/TR/json-ld/#flattened-document-form) and [compacted](https://www.w3.org/TR/json-ld/#compacted-document-form) form.
- [x] **(line 429)** The _RO-Crate JSON-LD_ MUST use the _RO-Crate JSON-LD Context_ <https://w3id.org/ro/crate/1.2/context> by reference.
- [ ] **(line 431)** Any referenced _contextual entities_ SHOULD be described in the _RO-Crate Metadata Document_ with the same identifier. Any _contextual entity_ in the _RO-Crate Metadata Document_ SHOULD be linked to from at least one of the other entities using the same identifier.

## Attached RO-Crate Package Requirements

- [ ] **(line 455)** When processing an _Attached RO-Crate Package_ the _RO-Crate Metadata Document_ MUST be present in the _RO-Crate Root_ and MUST be named `ro-crate-metadata.json`.
- [ ] **(line 466-477)** The file path structure of an _Attached RO-Crate Package_ MUST include `ro-crate-metadata.json` in the root. It MAY include `ro-crate-preview.html` and `ro-crate-preview_files/` directory. Payload files and directories MAY be described within the _RO-Crate Metadata File_ as Data Entities.
- [ ] **(line 479)** The `@id` of the _Root Data Entity_ in an _Attached RO-Crate Package_ MUST be either `./` or a URI (such as a DOI URL or other persistent URL).

## Payload files and directories

- [ ] **(line 489)** Payload files MAY appear directly in the _RO-Crate Root_ or in sub-directories, and each file/directory MAY be represented as Data Entities in the _RO-Crate Metadata File_.

## RO-Crate Website Requirements

- [ ] **(line 497)** An _Attached RO-Crate Package_ MAY include a human-readable HTML rendering named `ro-crate-preview.html` in the root directory. If present, any additional web resources MUST be in `ro-crate-preview_files/` directory.
- [ ] **(line 499-506)** If `ro-crate-preview.html` is present, it MUST correspond to the RO-Crate Metadata Document content. It SHOULD display at least the metadata relating to the _Root Data Entity_ as static HTML without requiring scripting.
- [ ] **(line 516)** The `ro-crate-preview.html` file and the `ro-crate-preview_files/` directory SHOULD NOT be included in the `hasPart` property of the _Root Dataset_ or any other `Dataset` entity.

## Self-describing and self-contained

- [ ] **(line 552)** _Attached RO-Crates Packages_ SHOULD be self-describing and self-contained.
- [ ] **(line 556)** The _RO-Crate Metadata Document_ describes the RO-Crate and MUST be stored in the _RO-Crate Root_.

## Metadata Principles

- [x] **(line 648)** Every entity MUST have an `@id`.
- [x] **(line 649)** Every entity MUST have a `@type`, which MAY be an array.
- [ ] **(line 650)** The `@type` SHOULD include at least one [Schema.org](http://schema.org) type that accurately describes the entity. [Thing](http://schema.org/Thing) or [CreativeWork](http://schema.org/CreativeWork) are valid fallbacks.
- [x] **(line 651)** The entity SHOULD have a human-readable `name`, in particular if its `@id` does not go to a human-readable Web page.
- [ ] **(line 653)** Property references to other entities (e.g. `author` property to a `Person` entity) MUST use the `{ "@id": "..."}` object form.
- [ ] **(line 654)** The entity SHOULD be ultimately referenceable from the root data entity (possibly through another reachable data entity or contextual entity).

## Differences from Schema.org

- [ ] **(line 669-671)** Generally, the standard _type_ and _property_ names (_terms_) from [Schema.org](http://schema.org) should be used. RO-Crate uses `File` mapped to <http://schema.org/MediaObject>.
- [ ] **(line 674)** Any nested entities in _RO-Crate JSON-LD_ MUST be described as separate contextual entities in the flat `@graph` list.
- [ ] **(line 782)** RO-Crates SHOULD contain stable persistent URIs to identify all entities wherever possible.

## RO-Crate Metadata Descriptor

- [x] **(line 822)** The _RO-Crate Metadata Document_ MUST contain a self-describing **RO-Crate Metadata Descriptor** with the `@id` value `ro-crate-metadata.json` (or `ro-crate-metadata.jsonld` in legacy crates for RO-Crate 1.0 or older) and `@type` [CreativeWork](http://schema.org/CreativeWork). This descriptor MUST have an [about](http://schema.org/about) property referencing the _Root Data Entity_'s `@id`.
- [x] **(line 845)** The [conformsTo](http://purl.org/dc/terms/conformsTo) of the _RO-Crate Metadata Descriptor_ SHOULD have a single value which is a versioned permalink URI of the RO-Crate specification that the _RO-Crate JSON-LD_ conforms to. The URI SHOULD start with `https://w3id.org/ro/crate/`.

## Root Data Entity Requirements

- [ ] **(line 884-891)** The _Root Data Entity_ MUST have all of the following properties:
  - `@type`: MUST be [Dataset](http://schema.org/Dataset) or an array that contains `Dataset`
  - `@id`: SHOULD be the string `./` or an absolute URI
  - `name`: SHOULD identify the dataset to humans well enough to disambiguate it from other RO-Crates
  - `description`: SHOULD further elaborate on the name to provide a summary of the context in which the dataset is important
  - `datePublished`: MUST be a single string value in [ISO 8601 date format](http://schema.org/DateTime), SHOULD be specified to at least the precision of a day, and MAY be a timestamp down to the millisecond
  - `license`: SHOULD link to a _Contextual Entity_ or _Data Entity_ in the _RO-Crate Metadata Document_ with a name and description. MAY, if necessary, be a textual description of how the RO-Crate may be used.

## Root Data Entity identifier

- [ ] **(line 903)** The _Root Data Entity_'s `@id` SHOULD be either `./` (indicating the directory of `ro-crate-metadata.json` is the RO-Crate Root), or an absolute URI.
- [ ] **(line 907)** If using a `PropertyValue` for `identifier`, it MUST have a human readable `value`, and SHOULD have a `url` if the identifier is Web-resolvable.

## Resolvable persistent identifiers and citation text

- [ ] **(line 911)** It is RECOMMENDED that resolving the `identifier` programmatically returns the _RO-Crate Metadata Document_ or an archive that contains the _RO-Crate Metadata File_.
- [ ] **(line 915)** Any entity which is a subclass of [CreativeWork](http://schema.org/CreativeWork), including [Dataset](http://schema.org/Dataset)s like the _Root Data Entity_, MAY have a `creditText` property which provides a textual citation for the entity.

## Data Entities

- [ ] **(line 1032)** Where files and folders are represented as _Data Entities_ in the RO-Crate JSON-LD, these MUST be linked to, either directly or indirectly, from the [Root Data Entity](#root-data-entity) using the [hasPart](http://schema.org/hasPart) property. Directory hierarchies MAY be represented with nested [Dataset](http://schema.org/Dataset) _Data Entities_, or the Root Data Entity MAY refer to files anywhere in the hierarchy using [hasPart](http://schema.org/hasPart).
- [ ] **(line 1034)** _Data Entities_ representing files MUST have `"File"` as a value for `@type`. `File` is an RO-Crate alias for <http://schema.org/MediaObject>. The term _File_ includes:
- [ ] **(line 1041)** In all cases, `@type` MAY be an array to also specify a more specific type, e.g. `"@type": ["File", "ComputationalWorkflow"]`
- [ ] **(line 1045)** In any of the above cases where files are not described, a directory containing a set of files MAY be described using a `Dataset` _Data Entity_ that encapsulates the files with a `description` property that explains the contents. If the RO-Crate file structure is flat, or files are not grouped together, a `description` property on the _Root Data Entity_ may be used, or a `Dataset` with a local reference beginning with `#` (e.g. to describe a certain type of file which occurs throughout the crate). This approach is recommended for RO-Crates which are to be deposited in a long-term archive.
- [x] **(line 1050)** Note that all `@id` [identifiers must be valid URI references](#describing-entities-in-json-ld). Care must be taken to express any relative paths using `/` separator, correct casing, and escape special characters like space (`%20`) and percent (`%25`), for instance a _File Data Entity_ from the Windows path `Results and Diagrams\almost-50%.png` becomes `"@id": "Results%20and%20Diagrams/almost-50%25.png"` in the _RO-Crate JSON-LD_.
- [ ] **(line 1052)** In this document the term _URI_ includes international *IRI*s; the _RO-Crate Metadata Document_ is always UTF-8 and international characters in identifiers SHOULD be written using native UTF-8 characters (*IRI*s), however traditional URL encoding of Unicode characters with `%` MAY appear in `@id` strings. Example: `"@id": "面试.mp4"` is preferred over the equivalent `"@id": "%E9%9D%A2%E8%AF%95.mp4"`

## File Data Entity

- [x] **(line 1129-1138)** A [File](http://schema.org/MediaObject) _Data Entity_ MUST have the following properties:
  - `@type`: MUST be `File`, or an array where `File` is one of the values.
  - `@id`: MUST be a relative or absolute URI. The `@id` MUST be one of either: a. A relative URI, indicating that a file MUST be present at the path `@id` relative to the _RO-Crate Root_. b. An absolute URI, indicating that the entity is a [Web-based Data Entity](#web-based-data-entities).
- [ ] **(line 1144)** Additionally, `File` entities SHOULD have:
- [ ] **(line 1152)** RO-Crate's `File` is an alias for schema.org type [MediaObject](http://schema.org/MediaObject), any of its properties MAY also be used (adding contextual entities as needed).
- [ ] **(line 1154)** A `File` entity MAY have an `@id` that is a local identifier beginning with `#`, in which case it is **not** considered to be a Data Entity, though it MAY still be linked to the _Root Data Entity_ via [hasPart](http://schema.org/hasPart). This is useful for describing physical files which are deliberately not present, for example if they are expected to be created by running a process. In this case, the `localPath` property SHOULD be used to indicate that a `File` could be found at that path in some circumstances.

## Directory Data Entity

- [x] **(line 1160-1165)** A [Dataset](http://schema.org/Dataset) (directory) _Data Entity_ MUST have the following properties:
  - `@type` MUST be `Dataset` or an array where `Dataset` is one of the values.
  - `@id` MUST be either:
    - In an _Attached RO-Crate Package_ ONLY -- a _URI Path_ that SHOULD end with `/`. This MUST resolve to a directory which is present in the RO-Crate Root along with its parent directories.
    - An absolute URI which SHOULD resolve to a programmatic listing of the content of the "directory" (e.g. another RO-Crate).
- [ ] **(line 1169)** Additionally, `Dataset` entities SHOULD have:
- [ ] **(line 1175)** Any of the properties of schema.org [Dataset](http://schema.org/Dataset) MAY additionally be used (adding contextual entities as needed).
- [ ] **(line 1177)** A [Dataset](http://schema.org/Dataset) which has an `@id` that is a local identifier beginning with `#` is **not** considered a Data Entity -- but MAY be used to describe a set of files or other resources, and MAY still be linked to the _Root Data Entity_ via [hasPart](http://schema.org/hasPart).

## Contextual Entities

- [ ] **(line 1589)** The RO-Crate SHOULD contain additional information about _Contextual Entities_ for the use of both humans (in `ro-crate-preview.html`) and machines (in `ro-crate-metadata.json`).
- [x] **(line 1606)** The RO-Crate Metadata JSON-LD `@graph` MUST NOT list multiple entities with the same `@id`; behaviour of consumers of an RO-Crate encountering multiple entities with the same `@id` is undefined.
- [ ] **(line 1613)** If an existing permalink (e.g. `https://orcid.org/0000-0002-1825-0097`) or other absolute URI (e.g. `https://en.wikipedia.org/wiki/Josiah_S._Carberry`) is reasonably unique for that entity, that URI SHOULD be used as identifier for the contextual entity in preference of an identifier local to the RO-Crate (e.g. `#josiah` or `#0fa587c6-4580-4ece-a5df-69af3c5590e3`).
- [ ] **(line 1624)** A core principle of Linked Data is to use URIs to identify important entities such as people. The following is the minimum recommended way of representing an [author](http://schema.org/author) of an RO-Crate. The [author](http://schema.org/author) property MAY also be applied to a directory ([Dataset](http://schema.org/Dataset)), a [File](http://schema.org/MediaObject) or other [CreativeWork](http://schema.org/CreativeWork) entities.
- [ ] **(line 1645)** For organizational affiliation, a _Contextual Entity_ for the organization SHOULD be provided.
- [ ] **(line 1650)** An [Organization](http://schema.org/Organization) SHOULD be the value for the [publisher](http://schema.org/publisher) property of a [Dataset](http://schema.org/Dataset) or [ScholarlyArticle](http://schema.org/ScholarlyArticle).
- [ ] **(line 1669)** An [Organization](http://schema.org/Organization) SHOULD also be used for a [Person](http://schema.org/Person)'s [affiliation](http://schema.org/affiliation) property.
- [ ] **(line 1702)** An RO-Crate SHOULD have contact information, using a contextual entity of type [ContactPoint](http://schema.org/contactPoint). Note that in Schema.org [Dataset](http://schema.org/Dataset) does not currently have the corresponding [contactPoint](http://schema.org/contactPoint) property, so the contact point would need to be given through a [Person](http://schema.org/Person) or [Organization](http://schema.org/Organization) contextual entity which are related to the Dataset via a [author](http://schema.org/author) or [publisher](http://schema.org/publisher) property.
- [ ] **(line 1829)** The [Root Data Entity](#root-data-entity) SHOULD have a [publisher](http://schema.org/publisher) property. This SHOULD be an [Organization](http://schema.org/Organization) though it MAY be a [Person](http://schema.org/Person).
- [ ] **(line 1896)** If a [Data Entity](#data-entities) has a [license](http://schema.org/license) that is different from the license on the _Root Data Entity_, the entity SHOULD have a [license](http://schema.org/license) property referencing a _Contextual Entity_ with a type [CreativeWork](http://schema.org/CreativeWork) to describe the license. The `@id` of the license SHOULD be its URL (e.g. a Creative Commons License URL) and, when possible, a summary of the license included using the [description](http://schema.org/description) property.

## Metadata license and other properties

- [ ] **(line 2008)** To associate a [Data Entity](#data-entities) with a _Contextual Entity_ representing a geographical location or region, the entity SHOULD have a property of [contentLocation](http://schema.org/contentLocation) or [spatialCoverage](http://schema.org/spatialCoverage) with a value of type [Place](http://schema.org/Place).
- [ ] **(line 2053)** Subject properties (equivalent to a [Dublin Core Subject](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/subject/)) on the [root data entity](#root-data-entity) or a [data entity](#data-entities) MUST use the [about](http://schema.org/about) property.
- [ ] **(line 2055)** Keyword properties MUST use [keywords](http://schema.org/keywords). Note that by Schema.org convention, keywords are given as a single JSON string, with individual keywords separated by commas.
- [ ] **(line 2082)** A [File](http://schema.org/MediaObject) or any other entity MAY have a [thumbnail](http://schema.org/thumbnail) property which references another file.

## Repository Objects

- [ ] **(line 2594)** A [Contextual Entity](#contextual-entities) from a repository, representing an abstract entity such as a person, or a work, or a place SHOULD have a `@type` of [RepositoryObject](http://pcdm.org/models#Object), in addition to any other types.
- [ ] **(line 2596)** Objects MAY be grouped together in [RepositoryCollection](http://pcdm.org/models#Collection)s with [hasMember](http://pcdm.org/models#hasMember) pointing to the [RepositoryObject](http://pcdm.org/models#Object).

## Profiles

- [ ] **(line 2714)** RO-Crates that are _conforming to_ (or intending to conform to) such a profile SHOULD declare this using `conformsTo` on the [Root Data Entity](#root-data-entity).
- [ ] **(line 2727)** Profile conformance is declared on the _Root Data Entity_ (`./`), rather than on the _RO-Crate Metadata Descriptor_ (`ro-crate-metadata.json`) where conformance to the base RO-Crate specification is declared.
- [ ] **(line 2729)** Each profile listed in `conformsTo` on the _Root Data Entity_ MUST link to a corresponding [contextual entity](#contextual-entities) for the profile.

## JSON-LD Implementation Details

- [ ] **(line 3995)** Identifiers in `@id` SHOULD be either a valid _absolute URI_ like <http://example.com/>, or a _URI path_ relative to the RO-Crate root directory. Although legal in JSON-LD, `@id` paths in RO-Crate SHOULD NOT use `../` to climb out of the _RO-Crate Root_, rather such references SHOULD be translated to absolute URIs.
- [ ] **(line 3997)** Care must be taken to express any relative paths using `/` separator and escape special characters like space (`%20`). As JSON-LD supports _IRIs_, international characters in identifiers SHOULD be encoded in UTF-8 rather than `%`-escaped.
- [ ] **(line 3999)** Because the _RO-Crate JSON-LD_ is _flattened_, all described entities must be JSON objects as direct children of the `@graph` element rather than being nested under another object or array. Properties referencing entities must use a JSON object with `@id` as the only key, e.g. `"author": {"@id": "https://orcid.org/0000-0002-1825-0097"}`
- [ ] **(line 4003)** - If the entity has a `name` such as a `Person` for instance an `@id` starting with `#` SHOULD be used; `{"@id": "#alice"}` or `{"@id": "#ac0bd781-7d91-4cdf-b2ad-7305921c7650"}`.
- [ ] **(line 4005)** - For un-named entities, such as a [Geometry](https://opengeospatial.github.io/ogc-geosparql/geosparql11/geo.html#Geometry) entity a _blank node_ identifier (e.g. `_:alice`) SHOULD be used. The use of a _blank node_ identifier SHOULD be taken as hint by RO-Crate presentation software to display the entity in-line, not as a separate entity with its own view, such as a page.
- [ ] **(line 4007)** Multiple values and references can be represented using JSON arrays, as exemplified in `hasPart` above; however as the `RO-Crate JSON-LD` is in _compacted form_, any single-element arrays like `"author": [{"@id": "#alice"}]` SHOULD be unpacked to a single value like `"author": {"@id": "#alice"}`.
