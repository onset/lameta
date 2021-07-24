// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

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
import { withStyles } from "@material-ui/core/styles";
import {
  IMappedCell,
  makeImportMatrixFromWorksheet,
} from "./SpreadsheetImport";
const styles = (theme) => ({
  tableStriped: {
    "& tbody tr:nth-of-type(odd)": {
      backgroundColor: "#F2FDFF",
    },
  },
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

export const SpreadsheetGrid: React.FunctionComponent<{
  worksheet: XLSX.WorkSheet;
}> = (props) => {
  const [tableColumnExtensions] = useState([
    { columnName: "checkbox_and_row_number", width: 30 },
  ]);
  const [leftColumns] = useState([
    TableSelection.COLUMN_TYPE,
    "checkbox_and_row_number",
  ]);

  const [tableRows, tableColumns] = useMemo(() => {
    const matrix = makeImportMatrixFromWorksheet(props.worksheet);
    const rowObjects: Array<object> = matrix.dataRows.map((r) => {
      return r;
    });

    const columnObjects: any[] = [
      // first column is for check boxes
      { name: "checkbox_and_row_number", title: " " },

      // followed by the columns of the spreadsheet
      ...matrix.columnInfos.map((columnInfo, columnIndex) => {
        return {
          name: columnInfo.incomingLabel, // review: not clear how this is used. Should it just be "A, B, C, ..."?
          title: (
            <div>
              <div>{getLetterIndexForColumn(columnIndex + 1)}</div>
              <div>{columnInfo.incomingLabel}</div>
              <div>{`lameta: ${columnInfo.lametaProperty}`}</div>
            </div>
          ),
          getCellValue: (row) => {
            const cell: IMappedCell = row[columnIndex];
            return (
              <div
                css={
                  cell.status === "Error"
                    ? css`
                        color: white;
                        background-color: red;
                        padding: 3px;
                      `
                    : ""
                }
              >
                {row[columnIndex].v}
              </div>
            );
          },
        };
      }),
    ];

    // let columnsCount = 0;
    // const rowObjects: Array<object> = rows.map((r) => {
    //   return {};
    // });
    // const columnObjects: any[] = [
    //   //{ name: "import_select", title: "Import" },
    //   { name: "checkbox_and_row_number", title: " " },
    // ];
    // const kOneColumnForSelectAndRowNumber = 1;
    // var range = XLSX.utils.decode_range(worksheet["!ref"]!); // get the range
    // for (var R = range.s.r; R <= range.e.r; ++R) {
    //   const row = { checkbox_and_row_number: R + 1 };
    //   for (var C = range.s.c; C <= range.e.c; ++C) {
    //     var cellref = XLSX.utils.encode_cell({ c: C, r: R }); // construct A1 reference for cell
    //     var cell = worksheet[cellref];
    //     const colName = cell ? cell.w : "";
    //     const columnProperty = `col${C + 1}`;
    //     row[columnProperty] = colName;
    //     //console.log(`C:${C} R:${R} row[${columnProperty}]=${value}`);
    //     if (columnObjects.length - kOneColumnForSelectAndRowNumber <= C) {
    //       //console.log(`Adding Column col${C + 1} title:${value}`);
    //       const n = `col${C + 1}`;
    //       columnObjects.push({
    //         name: n,
    //         title: colName,
    //         getCellValue: (r) => {
    //           switch (colName) {
    //             case "genre":
    //               return (
    //                 <div
    //                   css={
    //                     r[n] === "Bogus"
    //                       ? css`
    //                           color: white;
    //                           background-color: red;
    //                           padding: 3px;
    //                         `
    //                       : ""
    //                   }
    //                 >
    //                   {r[n]}
    //                 </div>
    //               );
    //               break;
    //             default:
    //               return r[n];
    //           }
    //         },
    //       });
    //     }
    //     columnsCount = Math.max(columnsCount, C + 1);
    //   }
    //   if (R > 0) rowObjects.push(row); // first row is the header and the grid will show it based on our column definitions
    // }
    return [rowObjects, columnObjects];
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
          background-color: #e6e6e6;
        }
      `}
    >
      <Paper>
        {/* Documentation on this material thing is hard to find. See https://github.com/DevExpress/devextreme-reactive/tree/master/packages/dx-react-grid-material-ui
         */}
        <Grid rows={tableRows} columns={tableColumns}>
          <SelectionState />
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
