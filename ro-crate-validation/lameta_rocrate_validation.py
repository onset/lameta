#!/usr/bin/env python3
"""
Comprehensive RO-Crate validation script for Lameta/LDAC profiles.
"""

import json
import sys
from pathlib import Path
from rocrate.rocrate import ROCrate
from urllib.parse import urlparse


def validate_lameta_rocrate(crate_path):
    """
    Validate a Lameta RO-Crate with LDAC profile requirements.

    Args:
        crate_path (str): Path to the RO-Crate directory or ro-crate-metadata.json file
    """
    errors = []
    warnings = []
    info = []

    try:
        # If it's a directory, use it directly; if it's a file, use its parent directory
        path = Path(crate_path)
        if path.is_file():
            crate_dir = path.parent
        else:
            crate_dir = path

        info.append(f"Validating RO-Crate: {crate_dir}")

        # Load the RO-Crate
        crate = ROCrate(source=str(crate_dir))
        info.append("Successfully loaded RO-Crate")

        # Get the root dataset
        root = crate.root_dataset
        info.append(f"Root dataset ID: {root.id}")

        # Check basic metadata
        name = root.get("name", "")
        description = root.get("description", "")

        if not name or name.strip() == "":
            warnings.append("Root dataset has no name")
        else:
            info.append(f"Name: {name}")

        if not description or description.strip() == "":
            warnings.append("Root dataset has no description")
        else:
            info.append(f"Description: {description}")

        # List entities
        entities = list(crate.get_entities())
        info.append(f"Total entities: {len(entities)}")

        # Load raw JSON for detailed checks
        metadata_file = crate_dir / "ro-crate-metadata.json"
        if not metadata_file.exists():
            errors.append("No ro-crate-metadata.json file found")
            return errors, warnings, info

        with open(metadata_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Check @context
        context = data.get("@context", [])
        required_contexts = [
            "https://w3id.org/ro/crate/1.2-DRAFT/context",
            "http://purl.archive.org/language-data-commons/context.json",
            "https://w3id.org/ldac/context",
        ]

        context_strs = []
        if isinstance(context, list):
            for item in context:
                if isinstance(item, str):
                    context_strs.append(item)
                elif isinstance(item, dict) and "@vocab" in item:
                    context_strs.append(f"@vocab: {item['@vocab']}")

        for req_context in required_contexts:
            if req_context not in context_strs:
                warnings.append(f"Missing expected context: {req_context}")
            else:
                info.append(f"✓ Found context: {req_context}")

        # Check for LDAC profile conformance
        ldac_conformance = False
        for entity in data.get("@graph", []):
            conforms_to = entity.get("conformsTo", {})
            if isinstance(conforms_to, dict):
                conforms_id = conforms_to.get("@id", "")
                if "language-data-commons" in conforms_id and "profile" in conforms_id:
                    ldac_conformance = True
                    info.append(f"✓ LDAC profile conformance: {conforms_id}")
                    break

        if not ldac_conformance:
            warnings.append("No LDAC profile conformance found")

        # Check for language information
        languages = []
        subject_languages = root.get("subjectLanguages", [])

        if subject_languages:
            info.append(f"Subject languages found: {len(subject_languages)}")
            for lang_ref in subject_languages:
                # Find the actual language entity
                lang_entity = crate.dereference(lang_ref)
                if lang_entity:
                    lang_code = lang_entity.get("code", "unknown")
                    lang_name = lang_entity.get("name", "unknown")
                    languages.append(f"{lang_code} ({lang_name})")

            if languages:
                info.append(f"Languages: {', '.join(languages)}")
        else:
            warnings.append("No subject languages specified")

        # Check for Lameta-specific file types
        lameta_files = []
        for entity in entities:
            if hasattr(entity, "get"):
                encoding_format = entity.get("encodingFormat", "")
                if "lameta" in encoding_format:
                    lameta_files.append(
                        {
                            "id": entity.id,
                            "format": encoding_format,
                            "name": entity.get("name", "unnamed"),
                        }
                    )

        if lameta_files:
            info.append(f"Lameta files found: {len(lameta_files)}")
            for lf in lameta_files:
                info.append(f"  - {lf['name']} ({lf['format']})")

        # Check for broken references
        broken_refs = []
        for entity in entities:
            if hasattr(entity, "_jsonld"):
                for key, value in entity._jsonld.items():
                    if key.startswith("@"):
                        continue
                    refs_to_check = []

                    if isinstance(value, dict) and "@id" in value:
                        refs_to_check.append(value["@id"])
                    elif isinstance(value, list):
                        for item in value:
                            if isinstance(item, dict) and "@id" in item:
                                refs_to_check.append(item["@id"])
                            elif isinstance(item, str) and item.startswith("#"):
                                refs_to_check.append(item)
                    elif isinstance(value, str) and value.startswith("#"):
                        refs_to_check.append(value)

                    for ref in refs_to_check:
                        if ref.startswith("http"):
                            continue  # External reference, skip
                        try:
                            referenced = crate.dereference(ref)
                            if not referenced:
                                broken_refs.append(f"{entity.id} -> {ref}")
                        except:
                            broken_refs.append(f"{entity.id} -> {ref}")

        if broken_refs:
            for broken_ref in broken_refs:
                errors.append(f"Broken internal reference: {broken_ref}")

        # Check required top-level properties
        required_props = ["@context", "@graph"]
        missing_props = [prop for prop in required_props if prop not in data]
        if missing_props:
            errors.append(f"Missing required properties: {missing_props}")
        else:
            info.append("All required top-level properties present")

        # Check for publisher information
        publisher = root.get("publisher")
        if publisher:
            if isinstance(publisher, dict) and "@id" in publisher:
                pub_id = publisher["@id"]
                if "lameta" in pub_id:
                    info.append(f"✓ Lameta publisher: {pub_id}")
                else:
                    info.append(f"Publisher: {pub_id}")
            else:
                info.append(f"Publisher: {publisher}")
        else:
            warnings.append("No publisher information")

        return errors, warnings, info

    except Exception as e:
        errors.append(f"Validation failed: {e}")
        return errors, warnings, info


def print_results(errors, warnings, info):
    """Print validation results in a nice format."""
    print("🔍 Validating RO-Crate: .")
    print("=" * 50)
    print("📊 VALIDATION RESULTS")
    print("=" * 30)

    if info:
        print(f"ℹ️  INFO ({len(info)}):")
        for item in info:
            print(f"   ✅ {item}")

    if warnings:
        print(f"⚠️  WARNINGS ({len(warnings)}):")
        for item in warnings:
            print(f"   ⚠️  {item}")

    if errors:
        print(f"❌ ERRORS ({len(errors)}):")
        for item in errors:
            print(f"   ❌ {item}")

    print(
        f"🎯 SUMMARY: {len(errors)} errors, {len(warnings)} warnings, {len(info)} info"
    )

    return len(errors) == 0


def main():
    if len(sys.argv) != 2:
        print(
            "Usage: python lameta_rocrate_validation.py <path_to_rocrate_or_metadata_file>"
        )
        sys.exit(1)

    crate_path = sys.argv[1]
    errors, warnings, info = validate_lameta_rocrate(crate_path)
    success = print_results(errors, warnings, info)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
