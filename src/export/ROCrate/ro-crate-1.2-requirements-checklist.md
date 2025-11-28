## RO-Crate Metadata Document

- [x] **(line 138)** The _RO-Crate Metadata Document_ MUST contain a flat list of _entities_ as objects in the `@graph` array, cross-referenced using `@id` identifiers rather than being deeply nested.

## Root Data Entity

- [x] **(line 192)** The _Root Data Entity_ MUST have `@type` `Dataset` (though it MAY have more than one type).

## RO-Crate Metadata Document Requirements

- [ ] **(line 428)** The _RO-Crate Metadata Document_ MUST be valid [JSON-LD 1.0](https://www.w3.org/TR/2014/REC-json-ld-20140116/) in [flattened](https://www.w3.org/TR/json-ld/#flattened-document-form) and [compacted](https://www.w3.org/TR/json-ld/#compacted-document-form) form.
- [x] **(line 429)** The _RO-Crate JSON-LD_ MUST use the _RO-Crate JSON-LD Context_ <https://w3id.org/ro/crate/1.2/context> by reference.
- [x] **(line 431)** Any referenced _contextual entities_ SHOULD be described in the _RO-Crate Metadata Document_ with the same identifier. Any _contextual entity_ in the _RO-Crate Metadata Document_ SHOULD be linked to from at least one of the other entities using the same identifier.

## Attached RO-Crate Package Requirements

- [ ] **(line 455)** When processing an _Attached RO-Crate Package_ the _RO-Crate Metadata Document_ MUST be present in the _RO-Crate Root_ and MUST be named `ro-crate-metadata.json`.
- [ ] **(line 466-477)** The file path structure of an _Attached RO-Crate Package_ MUST include `ro-crate-metadata.json` in the root. It MAY include `ro-crate-preview.html` and `ro-crate-preview_files/` directory. Payload files and directories MAY be described within the _RO-Crate Metadata File_ as Data Entities.
- [x] **(line 479)** The `@id` of the _Root Data Entity_ in an _Attached RO-Crate Package_ MUST be either `./` or a URI (such as a DOI URL or other persistent URL).

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
- [x] **(line 650)** The `@type` SHOULD include at least one [Schema.org](http://schema.org) type that accurately describes the entity. [Thing](http://schema.org/Thing) or [CreativeWork](http://schema.org/CreativeWork) are valid fallbacks.
- [x] **(line 651)** The entity SHOULD have a human-readable `name`, in particular if its `@id` does not go to a human-readable Web page.
- [x] **(line 653)** Property references to other entities (e.g. `author` property to a `Person` entity) MUST use the `{ "@id": "..."}` object form.
- [x] **(line 654)** The entity SHOULD be ultimately referenceable from the root data entity (possibly through another reachable data entity or contextual entity).

## Differences from Schema.org

- [ ] **(line 669-671)** Generally, the standard _type_ and _property_ names (_terms_) from [Schema.org](http://schema.org) should be used. RO-Crate uses `File` mapped to <http://schema.org/MediaObject>.
- [x] **(line 674)** Any nested entities in _RO-Crate JSON-LD_ MUST be described as separate contextual entities in the flat `@graph` list.
- [ ] **(line 782)** RO-Crates SHOULD contain stable persistent URIs to identify all entities wherever possible.

## RO-Crate Metadata Descriptor

- [x] **(line 822)** The _RO-Crate Metadata Document_ MUST contain a self-describing **RO-Crate Metadata Descriptor** with the `@id` value `ro-crate-metadata.json` (or `ro-crate-metadata.jsonld` in legacy crates for RO-Crate 1.0 or older) and `@type` [CreativeWork](http://schema.org/CreativeWork). This descriptor MUST have an [about](http://schema.org/about) property referencing the _Root Data Entity_'s `@id`.
- [x] **(line 845)** The [conformsTo](http://purl.org/dc/terms/conformsTo) of the _RO-Crate Metadata Descriptor_ SHOULD have a single value which is a versioned permalink URI of the RO-Crate specification that the _RO-Crate JSON-LD_ conforms to. The URI SHOULD start with `https://w3id.org/ro/crate/`.

## Root Data Entity Requirements

- [x] **(line 884-891)** The _Root Data Entity_ MUST have all of the following properties:
  - `@type`: MUST be [Dataset](http://schema.org/Dataset) or an array that contains `Dataset`
  - `@id`: SHOULD be the string `./` or an absolute URI
  - `name`: SHOULD identify the dataset to humans well enough to disambiguate it from other RO-Crates
  - `description`: SHOULD further elaborate on the name to provide a summary of the context in which the dataset is important
  - `datePublished`: MUST be a single string value in [ISO 8601 date format](http://schema.org/DateTime), SHOULD be specified to at least the precision of a day, and MAY be a timestamp down to the millisecond
  - `license`: SHOULD link to a _Contextual Entity_ or _Data Entity_ in the _RO-Crate Metadata Document_ with a name and description. MAY, if necessary, be a textual description of how the RO-Crate may be used.

## Root Data Entity identifier

- [x] **(line 903)** The _Root Data Entity_'s `@id` SHOULD be either `./` (indicating the directory of `ro-crate-metadata.json` is the RO-Crate Root), or an absolute URI.
- [x] **(line 907)** If using a `PropertyValue` for `identifier`, it MUST have a human readable `value`, and SHOULD have a `url` if the identifier is Web-resolvable.

## Resolvable persistent identifiers and citation text

- [ ] **(line 911)** It is RECOMMENDED that resolving the `identifier` programmatically returns the _RO-Crate Metadata Document_ or an archive that contains the _RO-Crate Metadata File_.
- [ ] **(line 915)** Any entity which is a subclass of [CreativeWork](http://schema.org/CreativeWork), including [Dataset](http://schema.org/Dataset)s like the _Root Data Entity_, MAY have a `creditText` property which provides a textual citation for the entity.

## Data Entities

- [x] **(line 1032)** Where files and folders are represented as _Data Entities_ in the RO-Crate JSON-LD, these MUST be linked to, either directly or indirectly, from the [Root Data Entity](#root-data-entity) using the [hasPart](http://schema.org/hasPart) property. Directory hierarchies MAY be represented with nested [Dataset](http://schema.org/Dataset) _Data Entities_, or the Root Data Entity MAY refer to files anywhere in the hierarchy using [hasPart](http://schema.org/hasPart).
- [ ] **(line 1034)** _Data Entities_ representing files MUST have `"File"` as a value for `@type`. `File` is an RO-Crate alias for <http://schema.org/MediaObject>. The term _File_ includes:
- [ ] **(line 1041)** In all cases, `@type` MAY be an array to also specify a more specific type, e.g. `"@type": ["File", "ComputationalWorkflow"]`
- [ ] **(line 1045)** In any of the above cases where files are not described, a directory containing a set of files MAY be described using a `Dataset` _Data Entity_ that encapsulates the files with a `description` property that explains the contents. If the RO-Crate file structure is flat, or files are not grouped together, a `description` property on the _Root Data Entity_ may be used, or a `Dataset` with a local reference beginning with `#` (e.g. to describe a certain type of file which occurs throughout the crate). This approach is recommended for RO-Crates which are to be deposited in a long-term archive.
- [x] **(line 1050)** Note that all `@id` [identifiers must be valid URI references](#describing-entities-in-json-ld). Care must be taken to express any relative paths using `/` separator, correct casing, and escape special characters like space (`%20`) and percent (`%25`), for instance a _File Data Entity_ from the Windows path `Results and Diagrams\almost-50%.png` becomes `"@id": "Results%20and%20Diagrams/almost-50%25.png"` in the _RO-Crate JSON-LD_.
- [ ] **(line 1052)** In this document the term _URI_ includes international *IRI*s; the _RO-Crate Metadata Document_ is always UTF-8 and international characters in identifiers SHOULD be written using native UTF-8 characters (*IRI*s), however traditional URL encoding of Unicode characters with `%` MAY appear in `@id` strings. Example: `"@id": "面试.mp4"` is preferred over the equivalent `"@id": "%E9%9D%A2%E8%AF%95.mp4"`

## File Data Entity

- [x] **(line 1129-1138)** A [File](http://schema.org/MediaObject) _Data Entity_ MUST have the following properties:
  - `@type`: MUST be `File`, or an array where `File` is one of the values.
  - `@id`: MUST be a relative or absolute URI. The `@id` MUST be one of either: a. A relative URI, indicating that a file MUST be present at the path `@id` relative to the _RO-Crate Root_. b. An absolute URI, indicating that the entity is a [Web-based Data Entity](#web-based-data-entities).
- [ ] **(line 1140)** A [File](http://schema.org/MediaObject) in an _Attached RO-Crate Package_ MAY have also a `contentURL` property which corresponds to a download link for the file. Following the link (allowing for HTTP redirects) SHOULD directly download the file.
- [x] **(line 1144)** Additionally, `File` entities SHOULD have:
- [ ] **(line 1152)** RO-Crate's `File` is an alias for schema.org type [MediaObject](http://schema.org/MediaObject), any of its properties MAY also be used (adding contextual entities as needed). [Files on the web](#data-entities-in-an-attached-ro-crate-that-are-also-on-the-web) SHOULD also use `identifier`, `url`, `subjectOf`, and/or `mainEntityOfPage`.
- [x] **(line 1154)** A `File` entity MAY have an `@id` that is a local identifier beginning with `#`, in which case it is **not** considered to be a Data Entity, though it MAY still be linked to the _Root Data Entity_ via [hasPart](http://schema.org/hasPart). This is useful for describing physical files which are deliberately not present, for example if they are expected to be created by running a process. In this case, the `localPath` property SHOULD be used to indicate that a `File` could be found at that path in some circumstances.

## Directory Data Entity

- [x] **(line 1160-1165)** A [Dataset](http://schema.org/Dataset) (directory) _Data Entity_ MUST have the following properties:
  - `@type` MUST be `Dataset` or an array where `Dataset` is one of the values.
  - `@id` MUST be either:
    - In an _Attached RO-Crate Package_ ONLY -- a _URI Path_ that SHOULD end with `/`. This MUST resolve to a directory which is present in the RO-Crate Root along with its parent directories.
    - An absolute URI which SHOULD resolve to a programmatic listing of the content of the "directory" (e.g. another RO-Crate).
- [x] **(line 1169)** Additionally, `Dataset` entities SHOULD have:
- [x] **(line 1175)** Any of the properties of schema.org [Dataset](http://schema.org/Dataset) MAY additionally be used (adding contextual entities as needed). [Directories on the web](#directories-on-the-web-dataset-distributions) SHOULD also provide `distribution`.
- [x] **(line 1177)** A [Dataset](http://schema.org/Dataset) which has an `@id` that is a local identifier beginning with `#` is **not** considered a Data Entity -- but MAY be used to describe a set of files or other resources, and MAY still be linked to the _Root Data Entity_ via [hasPart](http://schema.org/hasPart). For example, if the dataset contained a large number of `*.ai` files which were spread throughout the crate structure and which did not have corresponding File Data Entities, then a approach to describing these files would be:

## Web-based Data Entities

- [ ] **(line 1247)** Additional care SHOULD be taken to improve persistence and long-term preservation of web resources included in an RO-Crate, as they can be more difficult to archive or move along with the _RO-Crate Root_, and may change intentionally or unintentionally, leaving the RO-Crate with incomplete or outdated information.
- [ ] **(line 1249)** File Data Entities with an `@id` URI outside the _RO-Crate Root_ SHOULD at the time of RO-Crate creation be directly downloadable by a simple non-interactive retrieval (e.g. HTTP GET) of a single data stream, permitting redirections and HTTP/HTTPS authentication. For instance, in the example above, <https://zenodo.org/record/3541888> and <https://doi.org/10.5281/zenodo.3541888> cannot be used as `@id` as retrieving these URLs gives a HTML landing page rather than the desired PDF as indicated by `encodingFormat`.
- [ ] **(line 1251)** _Web-based Data Entities_ SHOULD NOT reference intermediate resources such as splash-pages, search services or web-based viewer applications.
- [x] **(line 1253)** As files on the web may change, the timestamp property [sdDatePublished](http://schema.org/sdDatePublished) SHOULD be included to indicate when the absolute URL was accessed, and derived metadata like [encodingFormat](http://schema.org/encodingFormat) and [contentSize](http://schema.org/contentSize) were considered to be representative:
- [ ] **(line 1266)** Web-based entities MAY use the property [localPath](https://w3id.org/ro/terms#localPath) to indicate a path that can be used to when downloading the data in an _Attached RO-Crate Package_ context. This may be used to instantiate local copies of web-based resources in an _Attached RO-Crate Package_.

## Data entities in an _Attached RO-Crate_ that are also on the web

- [ ] **(line 1284)** File Data Entities that are present as local files may already have a corresponding web presence, for instance a landing page that describes the file, including persistent identifiers (e.g. DOI) resolving to an intermediate HTML page instead of the downloadable file directly.
- [ ] **(line 1286)** These MAY be included for File Data Entities as additional metadata, regardless of whether the File is included in the _RO-Crate Root_ directory or exists on the Web, by using the properties:
- [ ] **(line 1289)** - [contentUrl](http://schema.org/contentUrl) with a string URL corresponding to a _download_ link. Following the link (allowing for HTTP redirects) SHOULD directly download the file.
- [ ] **(line 1294)** Note that if a local file is intended to be packaged within an _Attached RO-Crate Package_, the `@id` property MUST be a _URI Path_ relative to the _RO Crate Root_, for example `survey-responses-2019.csv` as in the example below, where the [contentUrl](http://schema.org/contentUrl) points to a download endpoint as a string.

## Downloadable dataset

- [ ] **(line 1336)** Similarly, the _RO-Crate Root_ entity (or a reference to another RO-Crate as a `Dataset`) may provide a [distribution](http://schema.org/distribution) URL, in which case the download SHOULD be an archive that contains the _RO-Crate Metadata Document_ (either directly in the archive's root, or within a single folder in the archive), indicated by a version-less `conformsTo`:
- [ ] **(line 1356)** In all cases, consumers should be aware that a `DataDownload` is a snapshot that may not reflect the current state of the `Dataset` or RO-Crate.
- [ ] **(line 1361)** The [above example](#example-attached-ro-crate-package) provides a media type for the file `cp7glop.ai` -- which is useful as it may not be apparent that the file is readable as a PDF file from the extension alone. To add more detail, encodings SHOULD be linked using a [PRONOM](https://www.nationalarchives.gov.uk/PRONOM/Default.aspx) identifier to a _Contextual Entity_ with `@type` array containing [WebPage](http://schema.org/WebPage) and `Standard`.
- [ ] **(line 1379)** If there is no PRONOM identifier (and typically no media type string), then a contextual entity with a different URL as an `@id` MAY be used, e.g. documentation page of a software's file format. The contextual entity SHOULD NOT include [Standard](http://purl.org/dc/terms/Standard) in its `@type` if the page does not sufficiently document the format. The `@type` SHOULD include [WebPage](http://schema.org/WebPage), or MAY include [WebPageElement](http://schema.org/WebPageElement) to indicate a section of the page.
- [ ] **(line 1399)** If there is no web-accessible description for a file format it SHOULD be described locally in the RO-Crate, for example in a Markdown file:
- [ ] **(line 1421)** Some generic file formats like `application/json` may be specialized using a _profile_ document that defines expectations for the file's content as expected by some applications, by using [conformsTo](http://purl.org/dc/terms/conformsTo) to a contextual entity with types [CreativeWork](http://schema.org/CreativeWork) and [Profile](https://www.w3.org/TR/dx-prof/#Class:Profile):
- [ ] **(line 1444)** A referenced RO-Crate is also a [Dataset](http://schema.org/Dataset) Data Entity, but where its [hasPart](http://schema.org/hasPart) does not need to be listed. Instead, its content and further metadata is available from its own RO-Crate Metadata Document, which may be retrieved or packaged within an archive. An entity representing a referenced RO-Crate SHOULD have `conformsTo` pointing to the generic RO-Crate profile using the fixed URI `https://w3id.org/ro/crate`.

## Referencing RO-Crates that have a persistent identifier

- [ ] **(line 1450)** If the referenced RO-Crate B has an `identifier` declared as B's [Root Data Entity identifier](#root-data-entity-identifier), then this is a _persistent identifier_ which SHOULD be used as the URI in the `@id` of the corresponding entity in RO-Crate A. For instance, if RO-Crate B had declared the identifier `https://pid.example.com/another-crate/` then RO-Crate A can reference B as an entity:
- [ ] **(line 1460)** The `conformsTo` generic RO-Crate profile on a `Dataset` entity that references another RO-Crate MUST be version-less. The referenced RO-Crate is **not** required to conform to the same version of the RO-Crate specification.
- [ ] **(line 1464)** Consumers that find a reference to a `Dataset` with the generic RO-Crate profile indicated MAY attempt to resolve the persistent identifier, but SHOULD NOT assume that the `@id` directly resolves to an RO-Crate Metadata Document. See section [Retrieving an RO-Crate](#retrieving-an-ro-crate) below for the recommended algorithm.

## Determining entity identifier for a referenced RO-Crate

- [ ] **(line 1472)** 1. If RO-Crate A is an [Attached RO-Crate Package](#attached-ro-crate-package) and RO-Crate B is a nested folder within A (e.g. `another-crate/`), then B SHOULD be treated as an _Attached RO-Crate Package_ (e.g. it has `another-crate/ro-crate-metadata.json`) and the relative path (`another-crate/`) SHOULD be used directly as `@id` of a [Directory Data Entity](#directory-data-entity) within RO-Crate A.
- [ ] **(line 1474)** 1. If the absolute URI has [Signposting](https://signposting.org/) declared for a `Link:` with `rel=cite-as`, then that link MAY be considered as an equivalent permalink for B and no further properties are needed.
- [ ] **(line 1475)** 2. Otherwise, as the URI was not declared as a persistent identifier, the timestamp property [sdDatePublished](http://schema.org/sdDatePublished) SHOULD be included to indicate when the absolute URI was accessed.
- [ ] **(line 1477)** 4. If RO-Crate B is not on the Web, and does not have a persistent identifier, e.g. is within a ZIP file or local file system, then a non-resolvable identifier could be established. See appendix [Establishing a base URI inside a ZIP file](#establishing-a-base-uri-inside-a-zip-file), e.g. `arcp://uuid,b7749d0b-0e47-5fc4-999d-f154abe68065/` if using a randomly generated UUID. This method may also be used if the above steps fail for an RO-Crate Metadata Document that is on the Web. In this case, the referenced RO-Crate entity MUST either declare a [referenced metadata document](#referencing-another-metadata-document) or [distribution](#downloadable-dataset).

## Referencing another metadata document

- [ ] **(line 1481)** If a referenced RO-Crate Metadata Document is known at a given URI or path, but its corresponding RO-Crate identifier can't be determined as above (e.g. [Retrieving an RO-Crate](#retrieving-an-ro-crate) fails or requires heuristics), then a referenced metadata descriptor entity SHOULD be added. For instance, if `http://example.com/another-crate/ro-crate-metadata.json` resolves to an RO-Crate Metadata Document describing root `./`, but `http://example.com/another-crate/` always returns a HTML page without [Signposting](https://signposting.org/) to the metadata document, then `subjectOf` SHOULD be added to an explicit metadata descriptor entity, which has `encodingFormat` declared for JSON-LD:
- [ ] **(line 1498)** The referenced RO-Crate metadata descriptor SHOULD NOT include its own `conformsTo` declarations to `https://w3id.org/ro/crate` or reference the dataset with `about`; this is to avoid confusion with the referencing RO-Crate's own [metadata descriptor](#ro-crate-metadata-descriptor).

## Profiles of referenced crates

- [ ] **(line 1502)** If the referenced crate conforms to a given [RO-Crate profile](#profiles), this MAY be indicated by expanding `conformsTo` on the `Dataset` to an array to reference the profile as a contextual entity.
- [ ] **(line 1520)** The profile declaration of a referenced crate is a hint. Consumers should check `conformsTo` as declared in the retrieved RO-Crate, as it may have been updated.

## Retrieving an RO-Crate

- [ ] **(line 1543)** Content-negotiation and Signposting approaches may fail or return a HTML page, e.g. for content-delivery networks that do not support content-negotiation.
- [ ] **(line 1589)** The RO-Crate SHOULD contain additional information about _Contextual Entities_ for the use of both humans (in `ro-crate-preview.html`) and machines (in `ro-crate-metadata.json`). This also helps to maximize the extent to which an _RO-Crate_ is self-contained and self-describing, in that it reduces the need for the consumer of an RO-Crate to refer to external information which may change or become unavailable over time.
- [ ] **(line 1596)** **[Data entities](#data-entities)** primarily exist in their own right as a file or directory (which may be in the _RO-Crate Root_ directory or downloadable by URL).
- [ ] **(line 1602)** Likewise, some data entities may also be described as contextual entities, for instance a `File` that is also a [ScholarlyArticle](http://schema.org/ScholarlyArticle). In such cases the _contextual data entity_ MUST be described as a single JSON-LD object in the RO-Crate Metadata JSON-LD `@graph` and SHOULD list both relevant data and contextual types in a `@type` array.
- [x] **(line 1606)** The RO-Crate Metadata JSON-LD `@graph` MUST NOT list multiple entities with the same `@id`; behaviour of consumers of an RO-Crate encountering multiple entities with the same `@id` is undefined.
- [ ] **(line 1613)** If an existing permalink (e.g. `https://orcid.org/0000-0002-1825-0097`) or other absolute URI (e.g. `https://en.wikipedia.org/wiki/Josiah_S._Carberry`) is reasonably unique for that entity, that URI SHOULD be used as identifier for the contextual entity in preference of an identifier local to the RO-Crate (e.g. `#josiah` or `#0fa587c6-4580-4ece-a5df-69af3c5590e3`).
- [ ] **(line 1615)** Care should be taken to not describe two conceptually different contextual entities with the same identifier - e.g. if `https://en.wikipedia.org/wiki/Josiah_S._Carberry` is a [Person](http://schema.org/Person) it SHOULD NOT also be a [CreativeWork](http://schema.org/CreativeWork) (although this example is a fictional person!).
- [ ] **(line 1617)** Where a related URL exists that may not be unique enough to serve as identifier, it can instead be added to a contextual entity using the property [url](http://schema.org/url).
- [ ] **(line 1624)** A core principle of Linked Data is to use URIs to identify important entities such as people. The following is the minimum recommended way of representing an [author](http://schema.org/author) of an RO-Crate. The [author](http://schema.org/author) property MAY also be applied to a directory ([Dataset](http://schema.org/Dataset)), a [File](http://schema.org/MediaObject) or other [CreativeWork](http://schema.org/CreativeWork) entities.
- [ ] **(line 1645)** For organizational affiliation, a _Contextual Entity_ for the organization SHOULD be provided.
- [ ] **(line 1650)** An [Organization](http://schema.org/Organization) SHOULD be the value for the [publisher](http://schema.org/publisher) property of a [Dataset](http://schema.org/Dataset) or [ScholarlyArticle](http://schema.org/ScholarlyArticle).
- [ ] **(line 1669)** An [Organization](http://schema.org/Organization) SHOULD also be used for a [Person](http://schema.org/Person)'s [affiliation](http://schema.org/affiliation) property.
- [ ] **(line 1702)** An RO-Crate SHOULD have contact information, using a contextual entity of type [ContactPoint](http://schema.org/contactPoint). Note that in Schema.org [Dataset](http://schema.org/Dataset) does not currently have the corresponding [contactPoint](http://schema.org/contactPoint) property, so the contact point would need to be given through a [Person](http://schema.org/Person) or [Organization](http://schema.org/Organization) contextual entity which are related to the Dataset via a [author](http://schema.org/author) or [publisher](http://schema.org/publisher) property.
- [ ] **(line 1737)** To associate a publication with a dataset the _RO-Crate JSON-LD_ MUST include a URL (for example a DOI URL) as the `@id` of a publication using the [citation](http://schema.org/citation) property.
- [ ] **(line 1752)** The publication SHOULD be described further as an additional contextual entity of type [ScholarlyArticle](http://schema.org/ScholarlyArticle) or [CreativeWork](http://schema.org/CreativeWork).
- [ ] **(line 1781)** [citation](http://schema.org/citation) MAY also be used with other data and contextual entities:
- [ ] **(line 1795)** A [data entity](#data-entities) MAY provide a published DOI [identifier](http://schema.org/identifier) that primarily captures that file or dataset. A citation MAY also be provided:
- [ ] **(line 1829)** The [Root Data Entity](#root-data-entity) SHOULD have a [publisher](http://schema.org/publisher) property. This SHOULD be an [Organization](http://schema.org/Organization) though it MAY be a [Person](http://schema.org/Person).
- [ ] **(line 1851)** To associate a research project with a [Dataset](http://schema.org/Dataset), the _RO-Crate JSON-LD_ SHOULD contain an entity for the project using type [Organization](http://schema.org/Organization), referenced by a [funder](http://schema.org/funder) property. The project `Organization` SHOULD in turn reference any external [funder](http://schema.org/funder), either by using its URL as an `@id` or via a _Contextual Entity_ describing the funder.
- [ ] **(line 1853)** The _Root Data Entity_ SHOULD also reference funders directly, as well as via a chain of references.
- [ ] **(line 1896)** If a [Data Entity](#data-entities) has a [license](http://schema.org/license) that is different from the license on the _Root Data Entity_, the entity SHOULD have a [license](http://schema.org/license) property referencing a _Contextual Entity_ with a type [CreativeWork](http://schema.org/CreativeWork) to describe the license. The `@id` of the license SHOULD be its URL (e.g. a Creative Commons License URL) and, when possible, a summary of the license included using the [description](http://schema.org/description) property.

## Metadata license

- [ ] **(line 2008)** To associate a [Data Entity](#data-entities) with a _Contextual Entity_ representing a geographical location or region, the entity SHOULD have a property of [contentLocation](http://schema.org/contentLocation) or [spatialCoverage](http://schema.org/spatialCoverage) with a value of type [Place](http://schema.org/Place).
- [ ] **(line 2010)** To express point or shape geometry it is recommended that a `geo` property on a [Place](http://schema.org/Place) entity SHOULD link to a [Geometry](https://opengeospatial.github.io/ogc-geosparql/geosparql11/geo.html#Geometry) entity, with an [asWKT](https://opengeospatial.github.io/ogc-geosparql/geosparql11/geo.html#asWKT) property that expresses the point or shape in [Well Known Text (WKT)](https://en.wikipedia.org/wiki/Well-known_text_representation_of_geometry) format. This example is a point, `POINT ($longitude, $latitude)`, but other asWKT primitives, `LINESTRING` & `POLYGON` SHOULD be used as required.
- [ ] **(line 2053)** Subject properties (equivalent to a [Dublin Core Subject](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/subject/)) on the [root data entity](#root-data-entity) or a [data entity](#data-entities) MUST use the [about](http://schema.org/about) property.
- [ ] **(line 2055)** Keyword properties MUST use [keywords](http://schema.org/keywords). Note that by Schema.org convention, keywords are given as a single JSON string, with individual keywords separated by commas.
- [ ] **(line 2082)** A [File](http://schema.org/MediaObject) or any other entity MAY have a [thumbnail](http://schema.org/thumbnail) property which references another file.
- [ ] **(line 2084)** For example, the below [RepositoryObject](http://pcdm.org/models#Object) is related to four files which are all versions of the same image (via [hasFile](http://pcdm.org/models#hasFile)), one of which is a thumbnail. The thumbnail MUST be included in the RO-Crate.
- [ ] **(line 2175)** In addition to simple data packaging, RO-Crates may have a "main" entry point or topic (referenced with a singleton `mainEntity` property), or function as a bundle of one or more Contextual Entities referenced via the `mentions` property.
- [ ] **(line 2180)** An RO-Crate may have a single main entity that is considered the point, or focus of the RO-Crate. This may be referenced from the _Root Data Entity_ using the [mainEntity](http://schema.org/mainEntity) property.

## RO-Crates with a data entity as `mainEntity`

- [ ] **(line 2184)** The focus of an RO-Crate may be a single _Data Entity_ supplemented by other data and/or contextual entities.

## RO-Crates with a contextual entity as `mainEntity`

- [ ] **(line 2215)** The focus of the RO-Crate may be a description of a _Contextual Entity_, for example in an RO-Crate used in a repository or encyclopedia where a `RepositoryObject` bundles together images and other files, but the main focus of the RO-Crate is on describing a person.
- [ ] **(line 2243)** RO-Crates may describe _Contextual Entities_ which are linked to the [Root Data Entity](#root-data-entity) via `mentions` relationships.
- [ ] **(line 2399)** To specify which **equipment** was used to create or update a [Data Entity](#data-entities), the _RO-Crate JSON-LD_ SHOULD have a _Contextual Entity_ for each item of equipment which SHOULD be of `@type` [IndividualProduct](http://schema.org/IndividualProduct). The entity SHOULD have a serial number and manufacturer that identify the equipment as completely as possible. In the following case the equipment is a bespoke machine. The equipment SHOULD be described on a web page, and the address of the description SHOULD be used as its `@id`.
- [ ] **(line 2448)** To specify which software was used to create or update a file, the software application SHOULD be represented with an entity of type [SoftwareApplication](http://schema.org/SoftwareApplication), with a [version](http://schema.org/version) property, e.g. from `tool --version`.
- [ ] **(line 2462)** The software SHOULD be associated with the [File](http://schema.org/MediaObject)(s) (or other [data entities](#data-entities)) it created as an [instrument](http://schema.org/instrument) of a [CreateAction](http://schema.org/CreateAction), with the [File](http://schema.org/MediaObject) referenced by a [result](http://schema.org/result) property. Any input files SHOULD be referenced by the [object](http://schema.org/object) property.
- [ ] **(line 2464)** In the below example, an image with the `@id` of `pics/2017-06-11%2012.56.14.jpg` was transformed into an new image `pics/sepia_fence.jpg` using the _ImageMagick_ software application as "instrument". Actions MAY have human-readable names, which MAY be machine generated for use at scale.
- [ ] **(line 2507)** If multiple [SoftwareApplication](http://schema.org/SoftwareApplication)s have been used in composition, such as from a script or workflow, then the `CreateAction`'s [instrument](http://schema.org/instrument) SHOULD rather reference a [SoftwareSourceCode](http://schema.org/SoftwareSourceCode) which can be further described as explained in the [Workflows and scripts](#workflows) section.
- [ ] **(line 2512)** To record an action which changes an entity's metadata, or changes its state in a publication or other workflow, a [CreateAction](http://schema.org/CreateAction) or [UpdateAction](http://schema.org/UpdateAction) SHOULD be associated with a [Data Entity](#data-entities) or, for the RO-Crate itself, with the [root data entity](#root-data-entity).
- [ ] **(line 2514)** A curation Action MUST have at least one [object](http://schema.org/object) which associates it with either the root data entity `Dataset` or one of its components.
- [ ] **(line 2516)** An Action which creates new _Data entities_ - for example, the creation of a new metadata file - SHOULD have these as [result](http://schema.org/result)s.
- [ ] **(line 2518)** An Action SHOULD have a [name](http://schema.org/name) and MAY have a [description](http://schema.org/description).
- [ ] **(line 2520)** An Action SHOULD have an [endTime](http://schema.org/endTime), which MUST be in [ISO 8601 date format](http://schema.org/DateTime) and SHOULD be specified to at least the precision of a day. An Action MAY have a [startTime](http://schema.org/startTime) meeting the same specifications.
- [ ] **(line 2522)** An Action SHOULD have a human [agent](http://schema.org/agent) who was responsible for authorizing the action, and MAY have an [instrument](http://schema.org/instrument) which associates the action with a particular piece of software (for example, the content management system or data catalogue through which an update was approved) which SHOULD be of `@type` SoftwareApplication.
- [ ] **(line 2524)** An Action's status MAY be recorded in an [actionStatus](http://schema.org/actionStatus) property. The status must be one of the values enumerated by [ActionStatusType](http://schema.org/ActionStatusType): [ActiveActionStatus](http://schema.org/ActiveActionStatus), [CompletedActionStatus](http://schema.org/CompletedActionStatus), [FailedActionStatus](http://schema.org/FailedActionStatus) or [PotentialActionStatus](http://schema.org/PotentialActionStatus).
- [ ] **(line 2526)** An Action which has failed MAY record any error information in an [error](http://schema.org/error) property.
- [ ] **(line 2528)** [UpdateAction](http://schema.org/UpdateAction) SHOULD only be used for actions which affect the Dataset as a whole, such as movement through a workflow.
- [ ] **(line 2530)** To record curation actions which modify a [File](http://schema.org/MediaObject) within a Dataset - for example, by correcting or enhancing metadata - the old version of the [File](http://schema.org/MediaObject) SHOULD be retained, and a [CreateAction](http://schema.org/CreateAction) added which has the original version as its [object](http://schema.org/object) and the new version as its [result](http://schema.org/result).
- [ ] **(line 2594)** A [Contextual Entity](#contextual-entities) from a repository, representing an abstract entity such as a person, or a work, or a place SHOULD have a `@type` of [RepositoryObject](http://pcdm.org/models#Object), in addition to any other types.
- [ ] **(line 2596)** Objects MAY be grouped together in [RepositoryCollection](http://pcdm.org/models#Collection)s with [hasMember](http://pcdm.org/models#hasMember) pointing to the [RepositoryObject](http://pcdm.org/models#Object).
- [ ] **(line 2686)** Defining and conforming to such a profile enables reliable programmatic consumption of an RO-Crate's content, as well as consistent creation, e.g. via a form in a user interface containing the required types and properties. Likewise, a rendering of an RO-Crate can more easily make rich UI components if it can reliably assume, for instance, that a [`Person`](#people) always has an `affiliation` to a [`Organization`](#organizations-as-values) which has a `url` - a restriction that may not be appropriate for all types of RO-Crates.
- [ ] **(line 2695-2709)** Profile URI requirements:
  - The profile URI MUST resolve to a human-readable _profile description_ (e.g. a HTML web page)
  - The profile URI MAY have a corresponding machine-readable [_Profile Crate_](#profile-crate)
  - The profile URI SHOULD be a _permalink_ (persistent identifier)
  - The profile URI SHOULD be _versioned_ with [`MAJOR.MINOR`](https://semver.org/spec/v2.0.0.html), e.g. `http://example.com/image-profile-2.4`
  - The profile description SHOULD use key words MUST, MUST NOT, REQUIRED, SHALL, SHALL NOT, SHOULD, SHOULD NOT, RECOMMENDED, MAY, and OPTIONAL as described in [RFC 2119](https://tools.ietf.org/html/rfc2119).
  - The profile MAY require/suggest which `@type` of [data entities](#data-entities) and/or [contextual entities](#contextual-entities) are expected.
  - The profile MAY require/suggest _properties_ expected per type of entity
  - The profile MAY require/suggest a particular [version of RO-Crate](https://www.researchobject.org/ro-crate/specification.html).
  - The profile MAY recommend [RO-Crate extensions](#extending-ro-crate) with domain-specific terms and vocabularies.
  - The profile MAY require/suggest a particular [JSON-LD context](#ro-crate-json-ld-context).
  - The profile MAY require/suggest a particular RO-Crate publishing method or packaging like .zip.
- [ ] **(line 2714)** RO-Crates that are _conforming to_ (or intending to conform to) such a profile SHOULD declare this using `conformsTo` on the [Root Data Entity](#root-data-entity).
- [ ] **(line 2727)** Profile conformance is declared on the _Root Data Entity_ (`./`), rather than on the _RO-Crate Metadata Descriptor_ (`ro-crate-metadata.json`) where conformance to the base RO-Crate specification is declared.
- [ ] **(line 2729)** Each profile listed in `conformsTo` on the _Root Data Entity_ MUST link to a corresponding [contextual entity](#contextual-entities) for the profile.
- [ ] **(line 2742-2747)** Profile contextual entity requirements:
  - The `@type` SHOULD be an array.
  - The `@type` MUST include [Profile](https://www.w3.org/TR/dx-prof/#Class:Profile).
  - The `@type` SHOULD include `CreativeWork` (indicating a Web Page) or `Dataset` (indicating a [Profile Crate](#profile-crate)).
  - The entity SHOULD have an absolute URI as `@id`
  - The entity SHOULD have a descriptive [name](http://schema.org/name)
  - The entity MAY declare [version](http://schema.org/version), preferably according to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- [ ] **(line 2752)** While the Profile URI `@id` MUST resolve to a human-readable _profile description_, it MAY additionally be made to [resolve](#how-to-retrieve-a-profile-crate) to a _Profile Crate_.
- [ ] **(line 2756)** The Profile Crate `@id` declared within its own RO-Crate Metadata Document SHOULD be an absolute URI, and the corresponding reference from its RO-Crate Metadata Descriptor updated accordingly. If the URI is a permanent URI, it SHOULD also be set as the `identifier`.
- [ ] **(line 2758)** Within the Profile Crate, its [Root Data Entity](#root-data-entity) MUST declare `Profile` as an additional `@type`:
- [ ] **(line 2805-2811)** A Profile Crate's [Root Data Entity](#root-data-entity) requirements:
  - MUST reference the human-readable _profile description_ as a data entity using `hasPart`
  - SHOULD have an absolute URI as `@id`
  - SHOULD have a descriptive [name](http://schema.org/name)
  - MAY declare [version](http://schema.org/version), preferably according to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) (e.g. `0.4.0`)
  - SHOULD reference the minimally expected RO-Crate specification as `isProfileOf`, which MAY be declared as contextual entity
  - SHOULD list related data entities using `hasPart`
  - MAY list profile descriptors using `hasResource`

## Shared contextual entities from a Profile Crate

- [ ] **(line 2825)** For instance, if a Profile Crate adds a `DefinedTerm` entity according to the [ad-hoc definitions](#adding-new-or-ad-hoc-vocabulary-terms), the term MAY be referenced in the conforming crate without making a contextual entity there. For archival purposes it MAY however still be preferable to copy such entities across to each conforming crate.
- [ ] **(line 2827)** It is RECOMMENDED that `@id` of such shared entities are absolute URIs on both sides to avoid resolving relative paths, and the profile's recommended [JSON-LD Context](#json-ld-context) used by conforming crates SHOULD have a mapping to the URIs.
- [ ] **(line 2829)** In the conforming crate, any terms defined in the profile using `DefinedTerm`, `rdfs:Class` and `rdf:Property` MUST either be used as full URIs matching the `@id`, or mapped to these URIs from the conforming crate's JSON-LD `@context`.

## Archiving Profile Crates

- [ ] **(line 2833)** For archival purposes, a crate declaring profile conformance MAY choose to include a snapshot copy of the Profile Crate, indicated using `distribution`, as detailed for [dataset distributions](#directories-on-the-web-dataset-distributions):

## What is included in the Profile Crate?

- [ ] **(line 2855)** This section defines the type of resources that should or may be included in the Profile Crate for different purposes (roles).

## Declaring the role within the crate

- [ ] **(line 2859)** In order for programmatic use of the Profile Crate to consume particular subresources, e.g. for validation, the _role_ of each entity SHOULD be declared by including them using `hasResource` to a `ResourceDescriptor` contextual entity that references the subresource using `hasArtifact`, as defined by the [Profiles Vocabulary](https://www.w3.org/TR/2019/NOTE-dx-prof-20191218/):
- [ ] **(line 2888)** The [`ResourceDescriptor`](https://www.w3.org/TR/dx-prof/#Class:ResourceDescriptor) entity MAY also declare `dct:format` or `dct:conformsTo`, however the data entity referenced with `hasArtifact` SHOULD always declare `encodingFormat` (with OPTIONAL `conformsTo`) to specify its [encoding format](#adding-detailed-descriptions-of-file-encodings), e.g.:

## Profile description entity

- [ ] **(line 2966)** A Profile Crate MUST declare a human-readable _profile description_, which is [about](http://schema.org/about) this Profile Crate and SHOULD have [encodingFormat](http://schema.org/encodingFormat) as `text/html`. The corresponding `ResourceDescriptor` SHOULD have identifier `http://www.w3.org/ns/dx/prof/role/specification` or `http://www.w3.org/ns/dx/prof/role/guidance` -- for example:
- [ ] **(line 2984)** The _profile description_ MAY (instead of say a dedicated `index.html` as above) be equivalent to the [RO-Crate Website](#ro-crate-website-ro-crate-previewhtml-and-ro-crate-preview_files-for-packages) entity `ro-crate-preview.html` (promoting it to a data entity by listing it under `hasPart`):

## Profile Schema entity

- [ ] **(line 3027)** A schema may formalize restrictions on the [RO-Crate Metadata Document](#ro-crate-metadata-descriptor) on a graph-level (e.g. what types/properties) as well as serialization level (e.g. use of JSON arrays).

## Software that works with the profile

- [ ] **(line 3061)** [Software](#software-used-to-create-files) that may consume/validate/generate RO-Crates following this profile (potentially using the schema):

## Repositories that expect the profile

- [ ] **(line 3075)** A [repository](#digital-library-and-repository-content) or collection within a repository that may accept/contain RO-Crates following this profile:

## Extension vocabularies

- [ ] **(line 3108)** A profile that [extends RO-Crate](#extending-ro-crate) SHOULD indicate which vocabulary/ontology it uses as a [DefinedTermSet](http://schema.org/DefinedTermSet):
- [ ] **(line 3125)** The `@id` of the vocabulary SHOULD be the _namespace_, while `url` SHOULD go to a human-readable description of the vocabulary.
- [ ] **(line 3127)** A profile that defines many extensions terms MAY define its own `DefinedTermSet` and relate the terms using `hasDefinedTerm`:

## Extension terms

- [ ] **(line 3166)** A profile that [extends RO-Crate](#extending-ro-crate) MAY indicate particular terms directly as [DefinedTerm](http://schema.org/DefinedTerm), `rdfs:Class` and/or `rdf:Property` instances:
- [ ] **(line 3179)** The `termCode` SHOULD be valid as a key in JSON-LD `@context` of conforming RO-Crates. The term SHOULD be mapped to the terms' `@id` in the `@context` of this Profile Crate.

## JSON-LD Context

- [ ] **(line 3183)** A profile that has a corresponding JSON-LD `@context` SHOULD indicate the context in the Profile Crate.
- [ ] **(line 3204-3212)** JSON-LD Context file requirements:
  - MUST have an `encodingFormat` of `application/ld+json`
  - MUST have an absolute URI as `@id`, which MUST be retrievable as JSON-LD directly or with content-negotiation and/or HTTP redirects.
  - SHOULD have a _permalink_ (persistent identifier) as `@id`
  - SHOULD use `https` rather than `http` with a certificate commonly accepted by browsers
  - SHOULD have a `@id` URI that is _versioned_ with [`MAJOR.MINOR`](https://semver.org/spec/v2.0.0.html), e.g. `https://example.com/image-profile-2.4`
  - SHOULD have a descriptive [name](http://schema.org/name)
  - SHOULD have a `conformsTo` to the contextual entity `http://www.w3.org/ns/json-ld#Context`
  - MAY declare [version](http://schema.org/version) according to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
- [ ] **(line 3217-3219)** JSON-LD Context update requirements:
  - Updates MAY add new terms or patch fixes (with corresponding `version` change in the RO-Crate metadata)
  - Updates SHOULD NOT remove terms already published and potentially used by consumers of the profile
  - Updates SHOULD NOT replace URIs terms map to -- except for typos.

## Multiple profiles

- [ ] **(line 3229)** An RO-Crate conforming to multiple RO-Crate profiles SHOULD explicitly declare `conformsTo` for each profile. Each profile listed MUST have a corresponding contextual entity.
- [ ] **(line 3281)** Note that this does not enforce any particular hierarchy of profiles, thus listed profiles can be both more general or more specific than the given Profile Crate. A given profile MAY provide further recommendations or requirements for how the related profiles are to be used in its human-readable documentation, e.g. by elaborating on the `ResourceDescriptor`.
- [ ] **(line 3318)** Scientific workflows and scripts that were used (or can be used) to analyze or generate files contained in an RO-Crate MAY be embedded in an RO-Crate. See also the Provenance section on [Software Used to Create Files](#software-used-to-create-files).
- [ ] **(line 3320)** _Workflows_ and _scripts_ SHOULD be described using [data entities](#data-entities) of type [SoftwareSourceCode](http://schema.org/SoftwareSourceCode).
- [ ] **(line 3322)** The distinction between [SoftwareSourceCode](http://schema.org/SoftwareSourceCode) and [SoftwareApplication](http://schema.org/SoftwareApplication) for [software](#software-used-to-create-files) is fluid, and comes down to availability and understandability. For instance, office spreadsheet applications are generally available and do not need further explanation (`SoftwareApplication`); while a Python script that is customized for a particular data analysis might be important to understand deeper and should therefore be included as `SoftwareSourceCode` in the RO-Crate dataset.
- [ ] **(line 3327)** A script is a _Data Entity_ which MUST have the following properties:
- [ ] **(line 3333)** A workflow is a _Data Entity_ which MUST have the following properties:
- [ ] **(line 3366)** Here are some indicators for when a script should be considered a _workflow_:
- [ ] **(line 3384)** Scripts written in a _programming language_, as well as workflows, generally need a _runtime_; in RO-Crate the runtime SHOULD be indicated using a liberal interpretation of [programmingLanguage](http://schema.org/programmingLanguage).
- [ ] **(line 3386)** Note that the language and its runtime MAY differ (e.g. different C++ compilers), but for scripts and workflows, frequently the language and runtime are essentially the same, and thus the `programmingLanguage`, implied to be a [ComputerLanguage](http://schema.org/ComputerLanguage), can also be described as an executable [SoftwareApplication](http://schema.org/SoftwareApplication):
- [ ] **(line 3403)** A _contextual entity_ representing a [ComputerLanguage](http://schema.org/ComputerLanguage) and/or [SoftwareApplication](http://schema.org/SoftwareApplication) MUST have a [name](http://schema.org/name), [url](http://schema.org/url) and [version](http://schema.org/version), which should indicate a known version the workflow/script was developed or tested with. [alternateName](http://schema.org/alternateName) MAY be provided if there is a shorter colloquial name, for instance _"R"_ instead of _"The R Project for Statistical Computing"_.
- [ ] **(line 3423)** It can be beneficial to show a diagram or sketch to explain the script/workflow. This may have been generated from a workflow management system, or drawn manually as a diagram. This diagram MAY be included from the `SoftwareSourceCode` data entity by using `image`, pointing to an [ImageObject](http://schema.org/ImageObject) data entity which is [about](http://schema.org/about) the `SoftwareSourceCode`:
- [ ] **(line 3441)** The image file format SHOULD be indicated with [encodingFormat](http://schema.org/encodingFormat) using an IANA registered [media type](https://www.iana.org/assignments/media-types) like `image/svg+xml` or `image/png`. Additionally a reference to a [Pronom](https://www.nationalarchives.gov.uk/PRONOM/Default.aspx) identifier SHOULD be provided, which MAY be described as an additional contextual entity to give human-readable name to the format:
- [ ] **(line 3459)** A workflow diagram may still be provided even if there is no programmatic `SoftwareSourceCode` that can be executed (e.g. because the workflow was done by hand). In this case the sketch itself is a proxy for the workflow and SHOULD have an `about` property referring to the _Root Data Entity_ as a whole (assuming the RO-Crate represents the outcome of a single workflow), or to other [Data Entities](#data-entities) otherwise:
- [ ] **(line 3474)** Data entities representing _workflows_ (`@type: ComputationalWorkflow`) SHOULD comply with the Bioschemas [ComputationalWorkflow profile](https://bioschemas.org/profiles/ComputationalWorkflow/1.0-RELEASE), where possible.
- [ ] **(line 3476)** When complying with this profile, the workflow data entities MUST describe these properties and their related contextual entities: [name](http://schema.org/name), [programmingLanguage](http://schema.org/programmingLanguage), [creator](http://schema.org/creator), [dateCreated](http://schema.org/dateCreated), [license](http://schema.org/license), [sdPublisher](http://schema.org/sdPublisher), [url](http://schema.org/url), [version](http://schema.org/version).
- [ ] **(line 3478)** The [ComputationalWorkflow profile](https://bioschemas.org/profiles/ComputationalWorkflow/1.0-RELEASE) explains the above and lists additional properties that a compliant [ComputationalWorkflow](https://bioschemas.org/types/ComputationalWorkflow/1.0-RELEASE) data entity SHOULD include: [citation](http://schema.org/citation), [contributor](http://schema.org/contributor), [creativeWorkStatus](http://schema.org/creativeWorkStatus), [description](http://schema.org/description), [funding](https://github.com/schemaorg/schemaorg/pull/2618), [hasPart](http://schema.org/hasPart), [isBasedOn](http://schema.org/isBasedOn), [keywords](http://schema.org/keywords), [maintainer](http://schema.org/maintainer), [producer](http://schema.org/producer), [publisher](http://schema.org/publisher), [runtimePlatform](http://schema.org/runtimePlatform), [softwareRequirements](http://schema.org/softwareRequirements), [targetProduct](http://schema.org/targetProduct)
- [ ] **(line 3480)** A data entity conforming to the [ComputationalWorkflow profile](https://bioschemas.org/profiles/ComputationalWorkflow/1.0-RELEASE) SHOULD declare the versioned profile URI using the [conformsTo](http://purl.org/dc/terms/conformsTo) property [^1]:

## Describing inputs and outputs

- [ ] **(line 3495)** If complying with the Bioschemas [FormalParameter profile](https://bioschemas.org/profiles/FormalParameter/1.0-RELEASE), the _contextual entities_ for [FormalParameter](https://bioschemas.org/types/FormalParameter/1.0-RELEASE), referenced by `input` or `output`, MUST describe [name](http://schema.org/name).
- [ ] **(line 3499)** A contextual entity conforming to the [FormalParameter profile](https://bioschemas.org/profiles/FormalParameter/1.0-RELEASE) SHOULD declare the versioned profile URI using `conformsTo` e.g.:
- [ ] **(line 3707-3713)** When implementing tools to work with RO-Crate:
  - Code should not assume that values will always be a String; values for properties may be single scalar values such as strings or integers, or references to other entities.
  - Entities may have more than one value for `@type`.
- [ ] **(line 3873)** _Root Data Entities_ MAY include repository-specific identifiers, described using [Contextual Entities](#contextual-entities) using a [PropertyValue](http://schema.org/PropertyValue), with a [name](http://schema.org/name) that identifies the repository and the [identifier](http://schema.org/identifier) as a value. The _same_ identifier MAY be used in multiple different repositories and effectively namespaced using the `name` of the `ProperyValue`.
- [ ] **(line 3930)** It is not necessary to use [JSON-LD tooling](https://json-ld.org/#developers) to generate or parse the _RO-Crate Metadata Document_, although JSON-LD tools may make it easier to conform to this specification, e.g. handling relative URIs. It is however RECOMMENDED to use [JSON tooling](http://json.org/) to handle [JSON](https://tools.ietf.org/html/rfc7159) syntax and escaping rules.
- [ ] **(line 3995)** Identifiers in `@id` SHOULD be either a valid _absolute URI_ like <http://example.com/>, or a _URI path_ relative to the RO-Crate root directory. Although legal in JSON-LD, `@id` paths in RO-Crate SHOULD NOT use `../` to climb out of the _RO-Crate Root_, rather such references SHOULD be translated to absolute URIs. See also section [Core Metadata for Data Entities](#core-metadata-for-data-entities).
- [ ] **(line 3997)** Care must be taken to express any relative paths using `/` separator and escape special characters like space (`%20`). As JSON-LD supports _IRIs_, international characters in identifiers SHOULD be encoded in UTF-8 rather than `%`-escaped.
- [ ] **(line 3999)** Because the _RO-Crate JSON-LD_ is _flattened_, all described entities must be JSON objects as direct children of the `@graph` element rather than being nested under another object or array. Properties referencing entities must use a JSON object with `@id` as the only key, e.g. `"author": {"@id": "https://orcid.org/0000-0002-1825-0097"}`
- [ ] **(line 4003)** - If the entity has a `name` such as a `Person` for instance an `@id` starting with `#` SHOULD be used; `{"@id": "#alice"}` or `{"@id": "#ac0bd781-7d91-4cdf-b2ad-7305921c7650"}`.
- [ ] **(line 4005)** - For un-named entities, such as a [Geometry](https://opengeospatial.github.io/ogc-geosparql/geosparql11/geo.html#Geometry) entity a _blank node_ identifier (e.g. `_:alice`) SHOULD be used. The use of a _blank node_ identifier SHOULD be taken as hint by RO-Crate presentation software to display the entity in-line, not as a separate entity with its own view, such as a page.
- [ ] **(line 4007)** Multiple values and references can be represented using JSON arrays, as exemplified in `hasPart` above; however as the `RO-Crate JSON-LD` is in _compacted form_, any single-element arrays like `"author": [{"@id": "#alice"}]` SHOULD be unpacked to a single value like `"author": {"@id": "#alice"}`.
- [ ] **(line 4014)** In other uses of JSON-LD the context may perform more automatic or detailed mapping, but the `RO-Crate JSON-LD context` is deliberately flat, listing every property and type.
- [ ] **(line 4022)** The _RO-Crate JSON-LD Context_ may either be set by reference to <https://w3id.org/ro/crate/1.2/context> or by value (merging the two documents).
- [ ] **(line 4063)** While the second form is more verbose, one advantage is that it is "archivable" as it does not require Internet access for retrieving the `@context` permalink. Tools consuming or archiving RO-Crate MAY replace by-reference `@context` URIs with an embedded context by using version-specific hard-coded contexts. See <https://github.com/ResearchObject/ro-crate/releases> to download the JSON-LD contexts corresponding to each version of this specification.
- [ ] **(line 4065)** To check which RO-Crate version is used (in terms of properties and types expected), clients SHOULD check the property `conformsTo` on the _RO-Crate Metadata Descriptor_ rather than the value of `@context`.
- [ ] **(line 4067)** RO-Crate consumers SHOULD NOT do the opposite substitution from an embedded context, but MAY use the [JSON-LD flattening](https://www.w3.org/TR/json-ld-api/#flattening-algorithm) algorithm with _compaction_ to a referenced _RO-Crate JSON-LD context_ (see also notes on [handling relative URI references](#relative-uris) below).
- [ ] **(line 4074)** The [media type](https://tools.ietf.org/html/rfc6838) `application/ld+json` for `ro-crate-metadata.json` will, when following this specification, comply with the [flattened/compacted JSON-LD profiles](https://www.w3.org/TR/json-ld/#application-ld-json) as well as `https://w3id.org/ro/crate`, which may be indicated in a [HTTP response](https://tools.ietf.org/html/rfc7231#section-3.1.1.5) as:
- [ ] **(line 4085)** Requesting the _RO-Crate Metadata Document_ from a browser may also need permission through CORS header `Access-Control-Allow-Origin` (however extra care should be taken if the RO-Crates require access control).
- [ ] **(line 4118)** To extend RO-Crate, implementers SHOULD try to use existing <http://schema.org/> properties and classes and MAY use terms from other vocabularies and ontologies when this is not possible. In many cases, a liberal interpretation of an schema.org term can be sufficient, e.g. even if <https://schema.org/HowTo> is explained with an example of changing a tire, `HowTo` could also help explain a Linux shell script as a series of computational steps.
- [ ] **(line 4120)** Any additional _terms_ (properties and types) from outside schema.org MUST be added as keys to the `@context` in the _RO-Crate JSON-LD_ (if not present) (or be defined by the JSON-LD context in other ways). To avoid duplicating the _RO-Crate JSON-LD Context_ the `@context: []` array form SHOULD be used as shown below.
- [ ] **(line 4122)** URIs in the `@context` SHOULD resolve to a useful human readable page. When this is not possible - for example if the URI resolves to an RDF ontology file, a human-readable URI SHOULD be provided as a [DefinedTerm](http://schema.org/DefinedTerm) using a [sameAs](http://schema.org/sameAs) description.
- [ ] **(line 4143)** When generating the _RO-Crate Website_ from _RO-Crate JSON-LD_, the code MUST use a [sameAs](http://schema.org/sameAs) URI (if present) as a target for an explanatory link for the term instead of the Linked Data URI supplied in the `@context`.
- [ ] **(line 4145)** Where there is no RDF ontology available, then implementors SHOULD attempt to provide context by creating stable web-accessible URIs to document properties and classes, for example, by linking to a page describing the term.
- [ ] **(line 4150)** Context terms must ultimately map to HTTP(s) URIs which poses challenges for crate-authors wishing to use their own vocabularies.

## Choosing URIs for ad hoc terms

- [ ] **(line 4156)** For projects that have their own web-presence, URIs MAY be defined there and SHOULD resolve to useful content. For example, for a project with web page <https://example.com/some-project> the property `myProperty` could have a URI: <https://example.com/some-project/terms#myProperty> which resolves to an HTML page that explains each term using HTML anchors:
- [ ] **(line 4171)** For ad hoc terms where the crate author does not have the resources to create and maintain an HTML page, authors may use the RO-Crate public namespace (`https://w3id.org/ro/terms/`) to reserve their terms. For example, an ad-hoc URI MAY be used in the form `https://w3id.org/ro/terms/some-project#myProperty` where `some-project` is acting as a _namespace_ for one or more related terms like `education`. Ad-hoc namespaces under `https://w3id.org/ro/terms/` are available on first-come-first-serve basis; to avoid clashes, namespaces SHOULD be registered by [submitting terms and definitions](https://github.com/ResearchObject/ro-terms) to the RO-Crate terms project.
- [ ] **(line 4173)** In both cases, to use an ad-hoc term in an RO-Crate, the URI MUST be included in the local context:

## Add local definitions of ad hoc terms

- [ ] **(line 4188)** Following the conventions used by Schema.org, ad-hoc terms SHOULD also include definitions in the RO-Crate with at minimum:
- [ ] **(line 4206)** More information about the relationship of this term to other terms MAY be provided using [domainIncludes](http://schema.org/domainIncludes), [rangeIncludes](http://schema.org/rangeIncludes), [rdfs:subClassOf](https://www.w3.org/TR/rdf-schema/#ch_subclassof), [rdfs:subPropertyOf](https://www.w3.org/TR/rdf-schema/#ch_subpropertyof), [sameAs](http://schema.org/sameAs) following the conventions used in the [Schema.org schema](http://schema.org/version/latest/schemaorg-current-http.jsonld). For compatibility with RDFS/OWL tools, `name` and `description` SHOULD be duplicated using the RDFS properties `rdfs:label` and `rdfs:comment`.
- [ ] **(line 4226)** Schema.org also provides the types [Class](http://schema.org/Class) and [Property](http://schema.org/Property). These MAY be used as an additional `@type` corresponding to `rdfs:Class` and `rdf:Property`.
- [ ] **(line 4233)** If several RO-Crates are using the same `@context` extension terms, or define the same additional ad-hoc terms, then it may make sense to specify these within an [RO-Crate profile](#profiles) that the crates can then explicitly declare conformance to.
- [ ] **(line 4235)** The `@id` of the extension terms should after the move be made absolute URIs that resolve to the profile crate -- if these were made using <https://w3id.org/ro/terms/> then a request to set up such redirects can be made.
- [ ] **(line 4239)** See sections on [profile extension terms](#extension-terms) and [Profile JSON-LD context](#json-ld-context). [Custom file formats](#adding-detailed-descriptions-of-file-encodings) and common [contextual entities](#contextual-entities) may also be moved to the profile, ensuring their `@id` are absolute URI and resolve to the profile JSON-LD.
- [ ] **(line 4241)** This can reduce repetition in their JSON-LD, but means additional measures must be taken to ensure the resulting RO-Crates remain functional over time, e.g. not to remove terms as the profile evolves over time.
- [ ] **(line 4280)** In the example above, the type `CPMProvenanceFile` is resolved to <https://w3id.org/cpm/ro-crate#CPMProvenanceFile> by the matching key in the second `@context` when content-negotiating for `application/ld+json` (browsers may see the human-readable documentations).
- [ ] **(line 4322)** An [Attached RO-Crate Package](#attached-ro-crate-package) can be published on the Web by placing its _RO-Crate Root_ directory on a static file-based Web server (e.g. Nginx, Apache HTTPd, GitHub Pages). The use of relative URI references in the _RO-Crate Metadata File_ ensures identifiers of [data entities](#data-entities) work as they should.
- [ ] **(line 4393)** "category": "MUST",
- [ ] **(line 4403)** If the new Detached RO-Crate Package is not meant as a snapshot of the corresponding Attached RO-Crate Package, then such contextual entities should be assigned new `@id`, e.g. by generating random UUIDs like `urn:uuid:e47e41d9-f924-4c07-bc90-97e7ed34fe35`. Such tranformations are typically not catered for by traditional JSON-LD tooling and require additional implementation.
- [ ] **(line 4408)** Converting a Detached Crate to an Attached Crate can mean multiple things depending on intentions, and may imply an elaborate process.
- [ ] **(line 4441)** As this procedure can be error-prone (e.g. a Web-based entity may not be accessible or may require authentication), the implementation should consider the new _Attached RO-Crate Pacakge_ as a _fork_ and update `identifier` and `isDefinedBy` as specified above.
- [ ] **(line 4448)** When using JSON-LD tooling and RDF libraries to consume or generate RO-Crates, extra care should be taken to ensure these URI references are handled correctly.
- [ ] **(line 4455)** If performing [JSON-LD flattening](https://www.w3.org/TR/json-ld-api/#flattening-algorithm) to generate a valid _RO-Crate Metadata File_ for a _Attached RO-Crate Package_, add `@base: null` to the input JSON-LD `@context` array to avoid expanding relative URI references. The flattening `@context` SHOULD NOT need `@base: null`.
- [ ] **(line 4457)** Example, this JSON-LD is in [compacted form](https://www.w3.org/TR/json-ld/#compacted-document-form) which may be beneficial for processing, but is not yet valid _RO-Crate Metadata File_ as it has not been flattened into a `@graph` array.
- [ ] **(line 4494)** Results in a valid _RO-Crate JSON-LD_ (actual order in `@graph` may differ).
- [ ] **(line 4538)** The saved _RO-Crate JSON-LD_ SHOULD NOT include `{@base: null}` in its `@context`.
- [ ] **(line 4543)** [JSON-LD Expansion](https://www.w3.org/TR/json-ld-api/#expansion) can be used to resolve terms from the `@context` to absolute URIs, e.g. `http://schema.org/description`. This may be needed to parse [extended properties](#extending-ro-crate) or for combinations with other Linked Data.
- [ ] **(line 4545)** This algorithm would normally also expand `@id` fields based on the current [base URI](https://www.w3.org/TR/json-ld11/#base-iri) of the _RO-Crate Metadata File_, but this may be a temporary location like `file:///tmp/rocrate54/ro-crate-metadata.json`, meaning `@id`: `subfolder/` becomes `file:///tmp/rocrate54/subfolder/` after JSON-LD expansion.
- [ ] **(line 4704)** When parsing _RO-Crate JSON-LD_ as RDF, where the RDF framework performs resolution to absolute URIs, it may be difficult to find the _RO-Crate Root_ in the parsed triples.
- [ ] **(line 4733)** If the RDF library can parse the _RO-Crate JSON-LD_ directly by retrieving from a `http`/`https` URI of the _RO-Crate Metadata File_ it should calculate the correct base URI as detailed in section [Establishing absolute URI for RO-Crate Root](#establishing-absolute-uri-for-ro-crate-root) and you should **not** need to override the base URI.
- [ ] **(line 4813)** An RO-Crate may have been packaged as a ZIP file or similar archive. RO-Crates may exist in a temporary file path which should not determine its identifiers.
- [ ] **(line 4882)** Some applications may prefer working with absolute URIs, e.g. in a joint graph store or web-based repository, but should relativize URIs within the _RO-Crate Root_ before generating the _RO-Crate Metadata File_.
