export type CsvCell = string | number | boolean | null | undefined;

// Missing values become empty cells: student records are not guaranteed to
// have every field, and one undefined cell must not abort the whole export.
function escapeCell(cell: CsvCell): string {
  const text = cell == null ? '' : String(cell);
  return `"${text.replace(/"/g, '""')}"`;
}

// YYYY-MM-DD, or '' for a missing or unparseable date (toISOString would throw).
export function csvDate(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<CsvCell>>): string {
  return rows.map((row) => row.map(escapeCell).join(',')).join('\r\n');
}

export function downloadCsv(filename: string, rows: ReadonlyArray<ReadonlyArray<CsvCell>>): void {
  // The BOM makes Excel read the file as UTF-8, so non-ASCII names survive.
  const blob = new Blob(['﻿', toCsv(rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Revoking immediately can cancel the download in Safari.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
