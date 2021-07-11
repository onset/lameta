// this engages a babel macro that does cool emotion stuff (like source maps). See https://emotion.sh/docs/babel-macros
import css from "@emotion/css/macro";
// these two lines make the css prop work on react elements
import { jsx } from "@emotion/core";
/** @jsx jsx */

import React, { useMemo } from "react";
import { Column, TableCommonProps, useTable } from "react-table";
import * as XLSX from "xlsx";
import { WorkBook, WorkSheet } from "xlsx";

export const SpreadsheetTable: React.FunctionComponent<{}> = () => {
  const [tableRows, tableColumns] = useMemo(() => {
    const workbook = XLSX.readFile("c:/dev/lameta/sample data/LingMetaX.xlsx", {
      cellDates: false,
    });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    let columnsCount = 0;
    const rowObjects: Array<object> = [];
    const columnObjects: Column<any>[] = [];
    var range = XLSX.utils.decode_range(worksheet["!ref"]!); // get the range
    for (var R = range.s.r; R <= range.e.r; ++R) {
      const row = {};
      for (var C = range.s.c; C <= range.e.c; ++C) {
        var cellref = XLSX.utils.encode_cell({ c: C, r: R }); // construct A1 reference for cell
        var cell = worksheet[cellref];
        const value = cell ? cell.w : "";
        const columnProperty = `col${C + 1}`;
        row[columnProperty] = value;
        if (columnObjects.length <= C) {
          columnObjects.push({
            Header: toExcelHeader(C + 1),
            accessor: `col${C + 1}`,
          });
        }
        columnsCount = Math.max(columnsCount, C + 1);
      }
      rowObjects.push(row);
    }
    return [rowObjects, columnObjects];
  }, []);

  const tableInstance = useTable<any>({
    columns: tableColumns,
    data: tableRows,
  });

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = tableInstance;

  return (
    <div
      css={css`
        overflow-x: scroll;
        max-width: 800px;
        margin-top: 20px;
      `}
    >
      <table
        css={css`
          border: 1px solid #b0cbef;
          border-width: 1px 0px 0px 1px;
          font-size: 11pt;
          font-family: Calibri;
          font-weight: 100;
          border-spacing: 0px;
          border-collapse: collapse;
        `}
        {...(getTableProps() as TableCommonProps)}
      >
        <thead
          css={css`
            font-weight: normal;
            font-size: 14px;
            border: 1px solid #9eb6ce;
            border-width: 0px 1px 1px 0px;
            height: 17px;
          `}
        >
          {
            // Loop over the header rows
            headerGroups.map((headerGroup) => (
              // Apply the header row props
              <tr {...headerGroup.getHeaderGroupProps()}>
                {
                  // Loop over the headers in each row
                  headerGroup.headers.map((column) => (
                    // Apply the header cell props
                    <th
                      css={css`
                        font-weight: normal;
                      `}
                      {...column.getHeaderProps()}
                    >
                      {
                        // Render the header
                        column.render("Header")
                      }
                    </th>
                  ))
                }
              </tr>
            ))
          }
        </thead>
        {/* Apply the table body props */}
        <tbody {...getTableBodyProps()}>
          {
            // Loop over the table rows
            rows.map((row) => {
              // Prepare the row for display
              prepareRow(row);
              return (
                // Apply the row props
                <tr {...row.getRowProps()}>
                  {
                    // Loop over the rows cells
                    row.cells.map((cell) => {
                      // Apply the cell props
                      return (
                        <td
                          css={css`
                            background-color: white;
                            padding: 0px 4px 0px 2px;
                            border: 1px solid #d0d7e5;
                            border-width: 0px 1px 1px 0px;
                            font-weight: ${cell.row.index === 0 ? "bold" : ""};
                          `}
                          {...cell.getCellProps()}
                        >
                          {
                            // Render the cell contents
                            cell.render("Cell")
                          }
                        </td>
                      );
                    })
                  }
                </tr>
              );
            })
          }
        </tbody>
      </table>
    </div>
  );
};

function toExcelHeader(num: number): string {
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
