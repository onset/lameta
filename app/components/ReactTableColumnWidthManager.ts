import { Resize } from "react-table-6";

export class ReactTableColumnWidthManager {
  private columnKeys: any;
  private defaults: any;
  private storageKey: string;
  public columnWidths: object = {};
  public constructor(
    storageKey: string,
    columnKeys: string[],
    defaultWidths: number[]
  ) {
    this.storageKey = storageKey;
    this.columnKeys = columnKeys;
    this.defaults = defaultWidths;
    this.columnWidths = {};
    this.load();
  }
  private load() {
    this.columnWidths = {};
    // first load with the defaults that came as props
    this.columnKeys.forEach((value, index) => {
      this.columnWidths[value] = this.defaults[index];
    });

    const columnWidthKey = this.storageKey;
    const widthString = localStorage.getItem(columnWidthKey);
    if (widthString) {
      try {
        this.columnWidths = JSON.parse(widthString);
        //        console.log(`found in storage: ${columnWidthKey} = ${JSON.stringify(this.columnWidths)});
      } catch (err) {
        console.error("Error parsing " + columnWidthKey);
      }
    }
  }
  public handleResizedChange(resizedState: Resize[]): any {
    {
      resizedState.forEach((r: Resize) => (this.columnWidths[r.id] = r.value));
      localStorage.setItem(this.storageKey, JSON.stringify(this.columnWidths));
    }
  }
}
