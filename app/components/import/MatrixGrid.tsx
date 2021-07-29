// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */
import styled from "@emotion/styled";
import {
  Grid,
  Table,
  TableFixedColumns,
  TableHeaderRow,
  TableSelection,
} from "@devexpress/dx-react-grid-material-ui";
import Paper from "@material-ui/core/Paper";
import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { IntegratedSelection, SelectionState } from "@devexpress/dx-react-grid";
import { Theme, withStyles } from "@material-ui/core/styles";
import {
  CellImportStatus,
  IMappedCell,
  MappedColumnInfo,
  MappedMatrix,
  MappedRow,
  RowImportStatus,
} from "./MappedMatrix";
import { lameta_dark_green, lameta_green } from "../../containers/theme";
import Tooltip from "react-tooltip-lite";
const styles = (theme: Theme) => ({
  // tableStriped: {
  //   "& tbody tr:nth-of-type(odd)": {
  //     backgroundColor: "#effdda57",
  //   },
  // },
  tableCell: {
    borderRight: `1px solid rgba(224,224,224,1)`,
    "&:last-child": {
      borderRight: 0,
    },
  },
});
const TableComponentBase = ({ classes, ...restProps }) => (
  <Table.Table {...restProps} className={classes.tableStriped} />
);
const TableComponent = withStyles(styles, { name: "TableComponent" })(
  TableComponentBase
);
const tableColumnExtensions = [{ columnName: "row_header", width: 45 }];
export const MatrixGrid: React.FunctionComponent<{
  matrix: MappedMatrix;
}> = (props) => {
  const [leftColumns] = useState([TableSelection.COLUMN_TYPE, "row_header"]);

  const [selectedIndices, setSelectedIndices] = useState<number[]>(() =>
    props.matrix.rows
      .filter((r) => r.importStatus === RowImportStatus.Yes)
      .map((r) => r.index)
  );

  const tableRows = props.matrix.rows;

  // <div css={getRowHeaderStyling(row)}>{1 + row.index}</div>

  const tableColumns = useMemo(() => {
    const columnObjects: any[] = [
      // first column is for check boxes, we don't seem to have access to that here.
      // The second is for our row number:
      {
        name: "row_header",
        title: " ",
        getCellValue: (row: MappedRow) => {
          return (
            <span
              css={css`
                display: flex;
              `}
            >
              <span css={css``}>{1 + row.index}</span>
              {row.importStatus === RowImportStatus.NotAllowed && (
                <span
                  css={css`
                    color: red;
                    margin-left: auto;
                  `}
                >
                  <Tooltip
                    content={
                      <div>
                        {row.problemDescriptions.join(". ")}
                        {row.cells
                          .filter((c) => c.problemDescription)
                          .map((c) => c.problemDescription)
                          .join(",")}
                      </div>
                    }
                    background={"red"}
                    color={"white"}
                  >
                    ⚠
                  </Tooltip>
                </span>
              )}
            </span>
          );
        },
      },
      // followed by the columns of the spreadsheet
      ...props.matrix.columnInfos.map((columnInfo, columnIndex) => {
        return {
          name: columnInfo.incomingLabel, // review: not clear how this is used. Should it just be "A, B, C, ..."?
          title: (
            <div>
              <div
                css={css`
                  text-align: center;
                  font-weight: normal;
                `}
              >
                {getLetterIndexForColumn(columnIndex + 1)}
              </div>
              <div>{columnInfo.incomingLabel}</div>
              {getMappingStatusComponents(columnInfo)}
            </div>
          ),
          getCellValue: (row: MappedRow) => {
            return getCellComponent(row.cells[columnIndex]);
          },
        };
      }),
    ];
    return columnObjects;
  }, []);

  return (
    <div
      css={css`
        margin: 1px;
        margin-top: 10px;
        thead {
          th {
            font-weight: bold;
          }
          background-color: #f5f5f5;
        }
        * {
          cursor: pointer;
        }
      `}
    >
      <Paper
        css={css`
          td {
            padding-top: 0 !important;
            padding-bottom: 2px !important;
          }
          th {
            vertical-align: top;
            text-align: center;
          }
        `}
      >
        {/* Documentation on this material thing is hard to find. See https://github.com/DevExpress/devextreme-reactive/tree/master/packages/dx-react-grid-material-ui
         */}
        <Grid rows={tableRows} columns={tableColumns}>
          <SelectionState
            selection={selectedIndices}
            onSelectionChange={(rowsTheControlWantsSelected) => {
              props.matrix.rows.forEach((row) => {
                if (row.importStatus !== RowImportStatus.NotAllowed) {
                  row.importStatus = rowsTheControlWantsSelected.includes(
                    row.index
                  )
                    ? RowImportStatus.Yes
                    : RowImportStatus.No;
                }
              });

              const selectedRowIndices = props.matrix.rows
                .filter((r) => r.importStatus === RowImportStatus.Yes)
                .map((r) => r.index);
              setSelectedIndices(selectedRowIndices);
            }}
          />
          <IntegratedSelection />
          <Table
            columnExtensions={tableColumnExtensions}
            tableComponent={TableComponent}
          />
          <TableHeaderRow />
          <TableSelection />
          <TableFixedColumns leftColumns={leftColumns} />
        </Grid>
      </Paper>
    </div>
  );
};

function getLetterIndexForColumn(num: number): string {
  if (num <= 0) {
    return "";
  }

  var str = num.toString(26);
  var arr = str.split("").map((char) => {
    var code = char.charCodeAt(0);
    if (code >= 48 && code <= 57) {
      code += 16; // convert 1-9 to A-I and 0 to @
    } else {
      code -= 23; // convert a-p to J-Z
    }
    return code;
  });

  // convert 'A@' to 'Z', 'B@' to 'AZ', etc.
  // ascii code of '@' is 64
  var index = arr.indexOf(64);
  while (index >= 0) {
    if (index == 0) {
      arr.shift(); // remove head '@'
    } else {
      arr[index] += 26;
      arr[index - 1]--;
    }
    index = arr.indexOf(64);
  }

  var chars = arr.map((code) => String.fromCharCode(code));
  return chars.join("");
}

function getMappingStatusComponents(column: MappedColumnInfo) {
  switch (column.mappingStatus) {
    case "Identity":
      return <div>✔</div>;
    case "Matched":
      return <div>🡒{column.lametaProperty}</div>;
    case "MissingIncomingLabel":
      return <div></div>;
    case "Custom":
      return (
        <div
          css={css`
            color: ${lameta_dark_green};
          `}
        >
          🡒Custom
        </div>
      );
    case "Skip":
      return (
        <div
          css={css`
            color: red;
          `}
        >
          SKIP
        </div>
      );
  }
}

// function getCellComponent(cell?: IMappedCell) {
//   const specialFormatting = getCellStyling(cell);
//   return (
//     <div
//       css={css`
//         overflow-wrap: break-word;
//         white-space: break-spaces;
//         ${specialFormatting}
//       `}
//     >
//       {cell?.value}
//     </div>
//   );
// }

function getRowHeaderStyling(row: MappedRow) {
  if (
    row.cells.find(
      (c) => c.importStatus === CellImportStatus.NotInClosedVocabulary
    )
  ) {
    return css`
      color: white;
      background-color: red;
      padding: 3px;
    `;
  }

  if (
    row.cells.find(
      (c, index) => c.importStatus === CellImportStatus.ProgramError
    )
  ) {
    return css`
      color: white;
      background-color: purple;
      padding: 3px;
    `;
  }
  return css``;
}

function getCellComponent(cell?: IMappedCell) {
  const defaultStyling = css`
    overflow-wrap: break-word;
    white-space: break-spaces;
  `;

  if (!cell || cell.importStatus === "ProgramError") {
    return (
      <div
        css={css`
          color: white;
          background-color: blue;
        `}
      >
        PROGRAM ERROR
      </div>
    );
  }
  switch (cell.importStatus) {
    case CellImportStatus.OK:
      return <div css={defaultStyling}>{cell?.value}</div>;

    case CellImportStatus.NotInClosedVocabulary:
      return (
        <Tooltip
          content={cell.problemDescription}
          background={"red"}
          color={"white"}
        >
          <div
            css={css`
              ${defaultStyling}
              //text-decoration: line-through red;
              color:red;
              border: solid red 1px;
              text-align: center;
            `}
          >
            <span
              css={css`
                font-size: large;
                margin-right: 5px;
              `}
            >
              ⚠
            </span>
            {cell?.value}
          </div>
        </Tooltip>
      );
    case CellImportStatus.Addition:
      return (
        <Tooltip
          content={"This will be a new choice for this field."}
          background={lameta_dark_green}
          color={"white"}
        >
          <div
            css={css`
              display: flex;
              align-items: center;
            `}
          >
            <span
              css={css`
                margin-right: 5px;
                font-weight: bold;
                color: ${lameta_dark_green};
                font-size: x-large;
              `}
            >
              +
            </span>
            {cell?.value}
          </div>
        </Tooltip>
      );
  }
}
