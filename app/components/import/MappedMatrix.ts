export interface IMappedCell {
  value: string;
  column: IMappedColumnInfo;
  importStatus: CellImportStatus;
}
export enum CellImportStatus {
  OK,
  /* will be added to an open list */ Addition,
  NotInClosedVocabulary,
  ProgramError,
}

export interface IMappedColumnInfo {
  incomingLabel: string;
  lametaProperty: string;
  //validationType: "unknown"|"string" | "date";
  mappingStatus: "Identity" | "Matched" | "Unmatched" | "MissingIncomingLabel";
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
  columnInfos: IMappedColumnInfo[];
  // these rows don't include the incoming column labels, the lameta labels, or the column indexes (A, B, C, ...)
  rows: MappedRow[];
}
