export interface IMappedCell {
  value: string;
  column: MappedColumnInfo;
  importStatus: CellImportStatus;
}
export enum CellImportStatus {
  OK = "OK",
  /* will be added to an open list */ Addition = "Addition",
  NotInClosedVocabulary = "NotInClosedVocabulary",
  ProgramError = "ProgramError",
}

export class MappedColumnInfo {
  public incomingLabel: string;
  public lametaProperty: string;
  //validationType: "unknown"|"string" | "date";
  public mappingStatus:
    | "Identity"
    | "Matched"
    | "Skip"
    | "Custom"
    | "MissingIncomingLabel";

  public validChoices: string[];
  // review: not clear if this is good
  // what about "unmatched"? Shouldn't that have  been sent to "custom"?
  public get doImport(): boolean {
    return (
      this.mappingStatus !== "MissingIncomingLabel" &&
      this.mappingStatus !== "Skip"
    );
  }
}

export enum RowImportStatus {
  Yes,
  No,
  NotAllowed,
}
export class MappedRow {
  public importStatus: RowImportStatus;
  public cells: IMappedCell[] = [];
  public index: number;

  public asObjectByLametaProperties(): any {
    const o = {};
    this.cells.forEach((c) => {
      o[c.column.lametaProperty] = c.value;
    });
    return o;
  }
}
export class MappedMatrix {
  columnInfos: MappedColumnInfo[];
  // these rows don't include the incoming column labels, the lameta labels, or the column indexes (A, B, C, ...)
  rows: MappedRow[];
}
