/**
 * GTFS is CSV with quoted fields (RFC 4180): a stop called `Union  (Green Line )` and a comma
 * inside a name both have to survive. Rows go to a callback rather than into an array, because
 * `stop_times.txt` is 1.4 million rows and the whole point of the converter is to not keep them.
 */
export type CsvRow = Readonly<Record<string, string>>;

export function readCsv(text: string, onRow: (row: CsvRow) => void): void {
  const body = text.startsWith('﻿') ? text.slice(1) : text;
  let header: string[] | null = null;
  let fields: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;

  const endField = (): void => {
    fields.push(field);
    field = '';
  };
  const endRow = (): void => {
    endField();
    if (header === null) {
      header = fields.map((name) => name.trim());
    } else if (fields.length > 1 || fields[0] !== '') {
      const row: Record<string, string> = {};
      header.forEach((name, index) => {
        row[name] = fields[index] ?? '';
      });
      onRow(row);
    }
    fields = [];
  };

  while (i < body.length) {
    const ch = body[i] ?? '';
    if (quoted) {
      if (ch === '"') {
        if (body[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      endField();
    } else if (ch === '\n') {
      endRow();
    } else if (ch !== '\r') {
      field += ch;
    }
    i++;
  }
  if (field !== '' || fields.length > 0) endRow();
}

export function csvRows(text: string): readonly CsvRow[] {
  const rows: CsvRow[] = [];
  readCsv(text, (row) => rows.push(row));
  return rows;
}
