#!/usr/bin/env python3
"""
Simple script to test RO-Crate validation using the rocrate Python package.
"""

import json
import sys
from pathlib import Path
from rocrate.rocrate import ROCrate


def validate_rocrate(crate_path):
    """
    Validate an RO-Crate at the given path.

    Args:
        crate_path (str): Path to the RO-Crate directory or ro-crate-metadata.json file
    """
    try:
        # If it's a directory, use it directly; if it's a file, use its parent directory
        path = Path(crate_path)
        if path.is_file():
            crate_dir = path.parent
        else:
            crate_dir = path

        print(f"Validating RO-Crate: {crate_dir}")

        # Load the RO-Crate
        crate = ROCrate(source=str(crate_dir))

        # Basic validation - check if we can load it
        print("✅ Successfully loaded RO-Crate")

        # Get the root dataset
        root = crate.root_dataset
        print(f"📦 Root dataset ID: {root.id}")
        print(f"📝 Name: {root.get('name', 'No name')}")
        print(f"📄 Description: {root.get('description', 'No description')}")

        # List entities
        entities = list(crate.get_entities())
        print(f"🔢 Total entities: {len(entities)}")

        # Check for required properties in the metadata file
        metadata_file = crate_dir / "ro-crate-metadata.json"
        if metadata_file.exists():
            required_props = ["@context", "@graph"]
            with open(metadata_file, "r") as f:
                data = json.load(f)

            missing_props = [prop for prop in required_props if prop not in data]
            if missing_props:
                print(f"⚠️  Missing required properties: {missing_props}")
            else:
                print("✅ All required top-level properties present")
        else:
            print("⚠️  No ro-crate-metadata.json file found")

        return True

    except Exception as e:
        print(f"❌ Validation failed: {e}")
        return False


def main():
    if len(sys.argv) != 2:
        print(
            "Usage: python test_rocrate_validation.py <path_to_rocrate_or_metadata_file>"
        )
        sys.exit(1)

    crate_path = sys.argv[1]
    success = validate_rocrate(crate_path)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
