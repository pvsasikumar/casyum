export function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase() || 'export';
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function yearStr(): string {
  return String(new Date().getFullYear());
}

function triggerDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildCSV(rows: Record<string, unknown>[]): string {
  const headers = Object.keys(rows[0]);
  return [
    headers.join(','),
    ...rows.map((r) =>
      headers
        .map((h) => {
          const v = r[h];
          const s = v === null || v === undefined ? '' : String(v);
          return `"${s.replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\n');
}

function buildExcelHtml(headers: string[], rows: unknown[][]): string {
  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="UTF-8">
<!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Sheet1</x:Name></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]-->
<style>
  th{background:#6d28d9;color:#fff;padding:8px 12px;font-weight:600;text-align:left;font-size:11px;font-family:Outfit,sans-serif}
  td{padding:6px 12px;border:1px solid #d0d0d0;font-size:11px;font-family:Outfit,sans-serif;vertical-align:top}
  table{border-collapse:collapse;width:100%}
  tr:nth-child(even){background:#f8f6ff}
</style></head><body><table>
  <tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr>
  ${rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? ''}</td>`).join('')}</tr>`).join('')}
</table></body></html>`;
}

function buildPdfHtml(
  title: string,
  headers: string[],
  rows: unknown[][]
): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8">
<title>${title} - CASYUM</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Outfit','Segoe UI',sans-serif;padding:30px;color:#111;background:#fff}
  h1{font-size:22px;color:#5b21b6;border-bottom:3px solid #6d28d9;padding-bottom:10px;margin-bottom:4px}
  p.sub{color:#666;font-size:12px;margin-bottom:20px}
  table{width:100%;border-collapse:collapse;font-size:12px}
  th{background:#6d28d9;color:#fff;padding:10px 12px;text-align:left;font-weight:600}
  td{padding:8px 12px;border-bottom:1px solid #ddd}
  tr:nth-child(even){background:#f9fafb}
  .footer{margin-top:30px;padding-top:12px;border-top:2px solid #eee;font-size:10px;color:#888;text-align:center}
</style></head><body>
  <h1>${title}</h1>
  <p class="sub">Generated on ${new Date().toLocaleString()} &middot; CASYUM 2K26 Event Management System</p>
  <table>
    <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows
        .map(
          (r) => `<tr>${r.map((c) => `<td>${c ?? ''}</td>`).join('')}</tr>`
        )
        .join('')}
    </tbody>
  </table>
  <div class="footer">
    CASYUM 2K26 &middot; Department of Computer Applications &middot; SRM Institute of Science and Technology
  </div>
  <script>window.onload=function(){window.print()}</script>
</body></html>`;
}

export function downloadCSV(
  rows: Record<string, unknown>[],
  filename: string
): void {
  if (!rows.length) throw new Error('No data available to export.');
  const csv = buildCSV(rows);
  const blob = new Blob(['\uFEFF' + csv], {
    type: 'text/csv;charset=utf-8;',
  });
  triggerDownload(URL.createObjectURL(blob), filename);
}

export function downloadExcel(
  headers: string[],
  rows: unknown[][],
  filename: string
): void {
  if (!rows.length) throw new Error('No data available to export.');
  const html = buildExcelHtml(headers, rows);
  const blob = new Blob([html], {
    type: 'application/vnd.ms-excel',
  });
  const fname = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  triggerDownload(URL.createObjectURL(blob), fname);
}

export function downloadPDF(
  title: string,
  headers: string[],
  rows: unknown[][],
  _filename?: string
): void {
  if (!rows.length) throw new Error('No data available to export.');
  const printWindow = window.open('', '_blank');
  if (!printWindow) throw new Error('Popup blocked. Allow popups for PDF export.');
  const html = buildPdfHtml(title, headers, rows);
  printWindow.document.write(html);
  printWindow.document.close();
}

export function csvRowsFromArrays(
  headers: string[],
  rows: unknown[][]
): Record<string, unknown>[] {
  return rows.map((r) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = r[i] ?? '';
    });
    return obj;
  });
}
