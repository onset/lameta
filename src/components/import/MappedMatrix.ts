export interface IMappedCell {
  value: string;
  column: MappedColumnInfo;
  importStatus: CellImportStatus;
  problemDescription?: string;
}
export enum CellImportStatus {
  OK = "OK",
  /* will be added to an open list */ Addition = "Addition",
  NotInClosedVocabulary = "NotInClosedVocabulary",
  MissingKeyDef = "MissingKeyDef"
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
  public explanation: string;

  public closedList: boolean;
  // choices can be from an open or closed list
  public choices: string[];

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
  NotAllowed
}
export class MappedRow {
  public importStatus: RowImportStatus;
  public cells: IMappedCell[] = [];
  public index: number;
  public problemDescriptions: string[] = [];
  public matchesExistingRecord: boolean = false;

  public asObjectByLametaProperties(): any {
    const o = {};
    this.cells.forEach((c) => {
      o[c.column.lametaProperty] = c.value;
    });
    return o;
  }
  public addProblemDescription(problem: string) {
    this.problemDescriptions.push(problem);
  }
}
export class MappedMatrix {
  columnInfos: MappedColumnInfo[];
  // these rows don't include the incoming column labels, the lameta labels, or the column indexes (A, B, C, ...)
  rows: MappedRow[];

  public getCountOfChosenRows(): number {
    return this.rows.filter((r) => r.importStatus === RowImportStatus.Yes)
      .length;
  }
}
