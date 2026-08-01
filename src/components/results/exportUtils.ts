import type { ResultEntry } from './types';
import { resultDisplayName, resultMemberNames, resultPositionLabel } from './types';

export interface ResultsExportContext {
  eventName: string;
  eventDate: string;
}

const COLUMNS = [
  'Position',
  'Entry Type',
  'Winner Details',
  'Register No',
  'College',
  'Department',
  'Year',
  'Prize',
  'Remarks',
];

function exportRows(entries: ResultEntry[]): string[][] {
  return entries.map((e) => {
    const members = resultMemberNames(e);
    return [
      resultPositionLabel(e),
      e.entryType,
      members ? `${resultDisplayName(e)} — ${members}` : resultDisplayName(e),
      e.registerNumber,
      e.college,
      e.department,
      e.year,
      e.prize,
      e.remarks,
    ];
  });
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'event'
  );
}

export async function exportResultsPdf(
  entries: ResultEntry[],
  ctx: ResultsExportContext
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const mod: any = await import('jspdf-autotable');
  const autoTable = typeof mod.default === 'function' ? mod.default : mod.autoTable;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFillColor(10, 10, 14);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Event Results — Official Record', 14, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Event Name: ${ctx.eventName || '—'}`, 14, 22);
  doc.setFontSize(9);
  doc.text(`Event Date: ${ctx.eventDate || '—'}`, 14, 26);

  autoTable(doc, {
    startY: 34,
    head: [COLUMNS],
    body: exportRows(entries),
    styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [230, 230, 235], lineColor: [40, 40, 50], lineWidth: 0.1 },
    headStyles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [20, 20, 26] },
    theme: 'grid',
  });

  doc.save(`results-${slugify(ctx.eventName)}.pdf`);
}

export async function exportResultsExcel(
  entries: ResultEntry[],
  ctx: ResultsExportContext
): Promise<void> {
  const XLSX: any = await import('xlsx');

  const aoa: any[][] = [
    ['Event Name', ctx.eventName || ''],
    ['Event Date', ctx.eventDate || ''],
    [],
    COLUMNS,
    ...exportRows(entries),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = COLUMNS.map((_, i) => ({ wch: i === 2 ? 40 : 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Results');
  XLSX.writeFile(wb, `results-${slugify(ctx.eventName)}.xlsx`);
}
