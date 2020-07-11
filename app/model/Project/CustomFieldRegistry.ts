import { Dictionary } from "typescript-collections";

// Users can add custom fields, but we don't make them define them in some central location,
// and we don't store them in a central either. Instead, when a user adds a new field, this
// gets told about it (encountered()). Also, when file is being read and it encounters a custom field with a value,
// that name is registered here (encountered()).
// Then whenever the UI needs to know what are all the known custom fields for a given file type,
// we provide that (getKeysForFileType()).
// CustomFieldRegistry is a central place to
// Currently this is just a dictionary of array with some wrapper methods.
// In the future, we could add a way to track what *values* have been encountered, for auto-complete or even closed lists.
export class CustomFieldRegistry {
  private fileTypeToCustomNameArray: Dictionary<string, string[]>;

  public constructor() {
    this.fileTypeToCustomNameArray = new Dictionary<string, string[]>();
  }

  public encountered(type: string, key: string) {
    const namesForType = this.getKeysForFileType(type);
    if (namesForType.indexOf(key) === -1) {
      namesForType.push(key);
    }
  }

  public getKeysForFileType(type: string): string[] {
    if (!this.fileTypeToCustomNameArray.containsKey(type)) {
      this.fileTypeToCustomNameArray.setValue(type, new Array<string>());
    }
    return this.fileTypeToCustomNameArray.getValue(type)!;
  }
}
