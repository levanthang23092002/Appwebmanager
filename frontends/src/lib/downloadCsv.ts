function escapeCsvCell(value: string | number) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/** CSV UTF-8 BOM — mở trực tiếp bằng Excel, hỗ trợ tiếng Việt. */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][]
) {
  const content =
    `\uFEFF${[headers, ...rows].map((line) => line.map(escapeCsvCell).join(',')).join('\r\n')}`;
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
