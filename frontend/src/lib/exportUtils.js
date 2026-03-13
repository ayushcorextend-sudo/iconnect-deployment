/**
 * exportUtils.js — CSV generation engine
 *
 * downloadCSV(data, fileName)
 *   data     : Array of plain objects. Keys of data[0] become CSV headers.
 *   fileName : Output filename (`.csv` appended automatically if missing).
 *
 * Returns true on success, false if data is empty.
 */
export function downloadCSV(data, fileName) {
  if (!Array.isArray(data) || data.length === 0) return false;

  // Escape a single cell value: wrap in quotes, escape inner quotes, strip line-breaks
  const esc = (v) =>
    `"${String(v ?? '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ')}"`;

  const headers = Object.keys(data[0]);

  const lines = [
    headers.map(esc).join(','),
    ...data.map(row => headers.map(h => esc(row[h])).join(',')),
  ];

  // Prepend BOM so Excel opens UTF-8 correctly
  const csv = '\uFEFF' + lines.join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href    = url;
  a.download = fileName.endsWith('.csv') ? fileName : `${fileName}.csv`;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Defer revoke so the browser has time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 200);
  return true;
}
