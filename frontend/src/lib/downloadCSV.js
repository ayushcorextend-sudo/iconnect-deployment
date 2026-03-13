/**
 * downloadCSV(filename, headers, rows)
 * headers: string[]
 * rows: (string | number)[][]
 */
export function downloadCSV(filename, headers, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""').replace(/\n/g, ' ')}"`;
  const lines = [headers.map(esc), ...rows.map(r => r.map(esc))];
  const csv = lines.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
