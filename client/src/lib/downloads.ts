import { getDownloadFileName, brandCsvHeaderRow } from "@/lib/branding";

function toCsvValue(v: unknown): string {
  return `"${(v ?? "").toString().replace(/"/g, '""')}"`;
}

export function downloadBrandedCsv(
  headers: string[],
  rows: Array<Array<unknown>>, // 2D array of values
  fileBase: string
) {
  const brandRow = brandCsvHeaderRow();
  const csv = [brandRow, headers, ...rows]
    .map(r => r.map(toCsvValue).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const base = getDownloadFileName(fileBase);
  a.download = `${base}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
