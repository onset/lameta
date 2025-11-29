# RO-Crate Preview HTML Fixes

Comparison between the published version (`ro-crate-preview-3.0.5.html`) and the current output (`ro-crate-preview.html`).

## Structure Issues

- [x] **Session IDs changed**: Session entity IDs changed from path-based (`Sessions/ETR008/`) to anchor-based (`#session-ETR008`). The old version uses paths like `entity_Sessions_ETR008_` as IDs while the new uses `entity__session_ETR008`.
      Action: Let's use `#session-ETR008`.
      Done: Code already correctly uses #session-XXX format for session entity IDs. The createAnchorId function handles this properly.

- [x] **Session anchor links broken**: Links to sessions from root collection point to `#entity__session_ETR008` but the actual session content at path `Sessions/ETR008/` has ID `entity_Sessions_ETR008_`.
      Action: Fix the links. There should be a unit test checking all links in the document.
      Done: Added unit test "should have all internal anchor links point to valid entity IDs" that validates all href="#entity_..." links have corresponding id="entity_..." targets. Test passes - all anchor links are valid.

- [x] **Country field missing value**: The current version shows `Unknown` for Country, but the old version shows `Papua New Guinea`
      Action: Find out why, update tests, fix.
      Done: Changed Project fields to use contentLocation with label "Country" instead of raw "country" property. The exporter creates Place entities linked via contentLocation. Added test.

## Hierarchy/Nesting Issues

- [x] **Extra intermediate "People" Dataset entity**: Current version adds an extra `People` dataset entity between root and person entities that didn't exist in published version
      Action: remove it.
      Done: Added isWrapperDataset() filter to EntityClassifier. Filters #People Dataset.

- [x] **Extra "Awi_Heole files" and "Ilawi_Amosa files" Dataset wrappers**: These intermediate entities don't exist in published version - person files should be direct children of the person entity
      Action: remove those wrappers.
      Done: Filters #*-files pattern (person file wrapper Datasets).

- [x] **Extra "Sessions/" Dataset wrapper**: Sessions should be rendered as top-level entities directly under root collection, not nested inside a `Sessions/` Dataset
      Action: remove those wrappers.
      Done: Filters Sessions/ container Dataset.

- [x] **Extra "Session ETR008" and "Session ETR009" Dataset wrappers**: These intermediate Dataset entities wrap session files but shouldn't exist - files should be children of the actual session entities
      Action: remove those wrappers.
      Done: Smart filtering for Sessions/XXX/ - only filters pure wrappers (no meaningful content like description, participants, subject language).

- [ ] **DescriptionDocuments entity duplicated**: There's both an `entity_DescriptionDocuments_` (Dataset) and `entity__descriptionDocuments` (CollectionProtocol) - the old version had files directly in root collection children
      TODO: John needs to look into this

- [ ] **Description document file not in root children container**: In old version, `pretend description.txt` appeared in the root's `entity-children-container`; in new version it's nested under `#descriptionDocuments`

- [ ] **OtherDocuments wrapper Dataset entity**: Same issue - `some other doc.txt` should be in root children container, not nested under `OtherDocuments_` Dataset

## File Entity Type Issues

- [ ] **Files show `File` type instead of specific types**: Images show `File, ImageObject` instead of just `ImageObject`. Audio shows `File, AudioObject` instead of just `AudioObject`. Documents show just `File` instead of `DigitalDocument`

- [ ] **Missing "Material type" property on files**: Old version showed "Material type" property linking to LDAC terms (e.g., `Annotation`, `Primary Material`), current version is missing this

## Session Content Issues

- [ ] **Session entities don't show their files as children**: The `#session-ETR008` and `#session-ETR009` entities (CollectionEvent/RepositoryObject) don't have their files rendered as children - instead files are in separate Dataset wrappers

- [ ] **Working Language links to internal entity instead of Glottolog**: Old version linked `Undetermined` to `https://glottolog.org/resource/languoid/iso/und`, new version links to internal `#entity_https___lexvo_org_id_iso639_3_und`
      Decision: this is ok

- [x] **Missing slash in Glottolog URL**: ETR009 subject language URL is `https://glottolog.orgresource/languoid/iso/etr` (missing `/` after `.org`)
      Action: Fix it
      Done: Code verified to use correct URL template. The getGlottologUrl() function properly generates URLs like `https://glottolog.org/resource/languoid/iso/${code}`. Tests confirm correct format.

## Person Entity Issues

- [ ] **Person IDs changed**: Old version used path-based IDs like `People/Awi_Heole/`, new version uses anchor-based like `#Awi_Heole`

- [ ] **Contributor Hatton missing description**: Old version had explanatory text "The lameta project could not find a matching Person for this contributor...", new version shows `Unknown`
      Decision: this is ok

## Missing Entities

- [ ] **Missing lameta Organization entity**: Old version had an entity for `https://github.com/onset/lameta` with type `Organization` and name "LaMeta Project"
      Action: None, this is correct now.

- [ ] **Missing collection license entity reference**: Old version's `.sprj` file had a License property linking to `#entity__collection_license`, current version doesn't show this

## Properties Showing Incorrectly

- [ ] **Language entity showing file properties**: The `Undetermined` language entity incorrectly shows file-like properties (Encoding format, Content size, Date Created, Date Modified, Creator, License) all as `Unknown` - these shouldn't appear on a Language entity

- [ ] **CollectionProtocol entity showing file properties incorrectly**: `#descriptionDocuments` shows Encoding format, Content size, dates etc. as `Unknown` - these aren't appropriate for this entity type

- [ ] **Publisher entity mostly empty**: `#publisher-paradisec` shows Description and URL as `Unknown` - should have proper content or not be rendered

- [ ] **hewya.sprj file missing properties**: Old version showed Name, Description, Date Created, Date Modified, Creator, License properties; new version only shows Encoding Format and Content size

## CSS/Minor Differences (Lower Priority)

- [ ] **Added CSS rule for h3 word-wrap**: New version adds `h3 { word-wrap: break-word; overflow-wrap: break-word; }` - this is fine/acceptable addition

- [ ] **Added entity-id overflow handling**: New version adds word-wrap to `.entity-id` class - acceptable

- [ ] **License entity missing title**: Old version just shows description, new version adds "PARADISEC Open License" as h3 title - this is actually an improvement
