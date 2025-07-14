#!/usr/bin/env python3
"""
Comprehensive RO-Crate validation script using the rocrate Python package.
"""

import json
import sys
from pathlib import Path
from rocrate.rocrate import ROCrate
from urllib.parse import urlparse


def validate_rocrate_comprehensive(crate_path):
    """
    Perform comprehensive validation of an RO-Crate.

    Args:
        crate_path (str): Path to the RO-Crate directory
    """
    errors = []
    warnings = []
    info = []

    try:
        # If it's a file, use its parent directory
        path = Path(crate_path)
        if path.is_file():
            crate_dir = path.parent
        else:
            crate_dir = path

        print(f"🔍 Validating RO-Crate: {crate_dir}")
        print("=" * 50)

        # Load the RO-Crate
        crate = ROCrate(source=str(crate_dir))
        info.append("✅ Successfully loaded RO-Crate")

        # Check root dataset
        root = crate.root_dataset
        if root:
            info.append(f"📦 Root dataset ID: {root.id}")
            info.append(f"📝 Name: {root.get('name', 'No name')}")
            info.append(f"📄 Description: {root.get('description', 'No description')}")

            # Check required root properties
            required_root_props = ["name", "description"]
            for prop in required_root_props:
                if not root.get(prop):
                    warnings.append(
                        f"Root dataset missing recommended property: {prop}"
                    )

        else:
            errors.append("No root dataset found")

        # Check entities
        entities = list(crate.get_entities())
        info.append(f"🔢 Total entities: {len(entities)}")

        # Validate each entity
        for entity in entities:
            entity_id = entity.id
            entity_type = entity.type

            # Check for required @id and @type
            if not entity_id:
                errors.append(f"Entity missing @id: {entity}")
            if not entity_type:
                errors.append(f"Entity {entity_id} missing @type")

            # Check for broken references
            for prop, values in entity.properties().items():
                if isinstance(values, list):
                    for value in values:
                        if isinstance(value, dict) and "@id" in value:
                            ref_id = value["@id"]
                            if ref_id.startswith("#") or ref_id.startswith("./"):
                                # Internal reference - check if it exists
                                if not crate.dereference(ref_id):
                                    errors.append(
                                        f"Broken internal reference: {entity_id} -> {ref_id}"
                                    )
                elif isinstance(values, dict) and "@id" in values:
                    ref_id = values["@id"]
                    if ref_id.startswith("#") or ref_id.startswith("./"):
                        if not crate.dereference(ref_id):
                            errors.append(
                                f"Broken internal reference: {entity_id} -> {ref_id}"
                            )

        # Check metadata file structure
        metadata_file = crate_dir / "ro-crate-metadata.json"
        if metadata_file.exists():
            with open(metadata_file, "r", encoding="utf-8") as f:
                try:
                    data = json.load(f)

                    # Check required top-level properties
                    required_props = ["@context", "@graph"]
                    for prop in required_props:
                        if prop not in data:
                            errors.append(
                                f"Missing required top-level property: {prop}"
                            )

                    # Check @context
                    context = data.get("@context")
                    if context:
                        if isinstance(context, str):
                            if "w3id.org/ro/crate" not in context:
                                warnings.append(
                                    "@context should reference RO-Crate specification"
                                )
                        elif isinstance(context, list):
                            has_rocrate_context = any(
                                "w3id.org/ro/crate" in str(c) for c in context
                            )
                            if not has_rocrate_context:
                                warnings.append(
                                    "@context should include RO-Crate specification"
                                )

                    # Check @graph structure
                    graph = data.get("@graph", [])
                    if not isinstance(graph, list):
                        errors.append("@graph must be an array")
                    elif len(graph) < 2:
                        warnings.append(
                            "@graph should contain at least 2 entities (metadata descriptor and root dataset)"
                        )

                    # Check for metadata descriptor
                    metadata_descriptor = None
                    root_dataset = None

                    for item in graph:
                        if item.get("@id") == "ro-crate-metadata.json":
                            metadata_descriptor = item
                        elif item.get("@id") == "./":
                            root_dataset = item

                    if not metadata_descriptor:
                        errors.append(
                            "Missing metadata descriptor entity (ro-crate-metadata.json)"
                        )
                    else:
                        # Check metadata descriptor properties
                        if metadata_descriptor.get("@type") != "CreativeWork":
                            warnings.append(
                                "Metadata descriptor should have @type 'CreativeWork'"
                            )
                        if not metadata_descriptor.get("conformsTo"):
                            warnings.append(
                                "Metadata descriptor should have 'conformsTo' property"
                            )
                        if metadata_descriptor.get("about", {}).get("@id") != "./":
                            warnings.append(
                                "Metadata descriptor 'about' should reference root dataset ('./')"
                            )

                    if not root_dataset:
                        errors.append("Missing root dataset entity ('./')")
                    else:
                        if "Dataset" not in root_dataset.get("@type", []):
                            warnings.append(
                                "Root dataset should have @type including 'Dataset'"
                            )

                except json.JSONDecodeError as e:
                    errors.append(f"Invalid JSON in metadata file: {e}")
        else:
            errors.append("Missing ro-crate-metadata.json file")

        # Check for data files referenced but not present
        data_entities = crate.data_entities
        for entity in data_entities:
            if entity.id.startswith("./") and not entity.id.startswith("./http"):
                # Local file reference
                file_path = crate_dir / entity.id[2:]  # Remove './'
                if not file_path.exists():
                    warnings.append(f"Referenced file not found: {entity.id}")

        # Print results
        print("\n📊 VALIDATION RESULTS")
        print("=" * 30)

        if info:
            print(f"\nℹ️  INFO ({len(info)}):")
            for msg in info:
                print(f"   {msg}")

        if warnings:
            print(f"\n⚠️  WARNINGS ({len(warnings)}):")
            for msg in warnings:
                print(f"   {msg}")

        if errors:
            print(f"\n❌ ERRORS ({len(errors)}):")
            for msg in errors:
                print(f"   {msg}")

        # Summary
        print(
            f"\n🎯 SUMMARY: {len(errors)} errors, {len(warnings)} warnings, {len(info)} info"
        )

        return len(errors) == 0

    except Exception as e:
        print(f"❌ Validation failed with exception: {e}")
        return False


def main():
    if len(sys.argv) != 2:
        print(
            "Usage: python rocrate_comprehensive_validation.py <path_to_rocrate_directory>"
        )
        print(
            "\nThis script validates an RO-Crate directory containing ro-crate-metadata.json"
        )
        sys.exit(1)

    crate_path = sys.argv[1]
    success = validate_rocrate_comprehensive(crate_path)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
