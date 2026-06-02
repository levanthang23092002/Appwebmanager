/** Parse CSV text (hỗ trợ quoted fields) — giống finance.js */
export function parseCSV(str: string): string[][] {
  const arr: string[][] = [];
  let quote = false;
  let row: string[] = [];
  let col = '';
  for (let c = 0; c < str.length; c++) {
    const cc = str[c];
    const nc = str[c + 1];
    if (cc === '"' && quote && nc === '"') {
      col += cc;
      c++;
      continue;
    }
    if (cc === '"') {
      quote = !quote;
      continue;
    }
    if (cc === ',' && !quote) {
      row.push(col);
      col = '';
      continue;
    }
    if (cc === '\r' && nc === '\n' && !quote) {
      row.push(col);
      arr.push(row);
      col = '';
      row = [];
      c++;
      continue;
    }
    if (cc === '\n' && !quote) {
      row.push(col);
      arr.push(row);
      col = '';
      row = [];
      continue;
    }
    col += cc;
  }
  if (col !== '') row.push(col);
  if (row.length > 0) arr.push(row);
  return arr;
}
