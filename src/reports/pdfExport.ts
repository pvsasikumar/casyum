import { REPORT_COLUMNS } from './reportColumns';
import type { ExportMeta, ReportRow, ReportSummary } from './types';
import { buildExportFilename, triggerDownload } from './exportFilename';

/**
 * Branded PDF report via jsPDF + jspdf-autotable v5 (same dynamic import
 * pattern as src/components/results/exportUtils.ts). Landscape A4 because the
 * table has 14 columns; the branded header band and page footers are redrawn
 * on every page and the table header repeats automatically.
 */

const VIOLET: [number, number, number] = [109, 40, 217];
const VIOLET_DARK: [number, number, number] = [91, 33, 182];
const SLATE: [number, number, number] = [71, 85, 105];
const LIGHT_ROW: [number, number, number] = [245, 243, 255];

function chipText(summary: ReportSummary): string {
  return [
    `Total Registrations: ${summary.total}`,
    `Verified: ${summary.verified}`,
    `Not Verified: ${summary.notVerified}`,
    `Paid: ${summary.paid}`,
    `Pending Payment: ${summary.pendingPayment}`,
    `Present: ${summary.present}`,
    `Absent: ${summary.absent}`,
  ].join('    ');
}

/** Builds and saves the PDF. Pure byte-building happens inside jsPDF. */
export async function exportReportToPdf(
  rows: ReportRow[],
  summary: ReportSummary,
  meta: ExportMeta
): Promise<void> {
  if (rows.length === 0) return;
  const { jsPDF } = await import('jspdf');
  const mod = await import('jspdf-autotable');
  const autoTable = (mod as any).default ?? (mod as any).autoTable;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  const drawHeaderBand = () => {
    doc.setFillColor(...VIOLET);
    doc.rect(0, 0, pageWidth, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.text('CASYUM EVENT MANAGEMENT SYSTEM', 14, 8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(meta.eventName ? `Participant Report - ${meta.eventName}` : 'Participant Report', 14, 14);
  };

  drawHeaderBand();

  // Meta lines under the band.
  let cursorY = 24;
  doc.setTextColor(...SLATE);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(meta.filterSummary, 14, cursorY);
  cursorY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated on ${new Date().toLocaleString()}   |   Total Records: ${rows.length}`,
    14,
    cursorY
  );
  cursorY += 6;

  // Summary chips.
  doc.setDrawColor(...VIOLET);
  doc.setFillColor(...LIGHT_ROW);
  doc.roundedRect(14, cursorY, pageWidth - 28, 10, 2, 2, 'FD');
  doc.setTextColor(...VIOLET_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(chipText(summary), 17, cursorY + 6.4);
  cursorY += 14;

  autoTable(doc, {
    head: [REPORT_COLUMNS.map((c) => c.header)],
    body: rows.map((r) => REPORT_COLUMNS.map((c) => c.get(r))),
    startY: cursorY,
    margin: { left: 14, right: 14, top: 26 },
    styles: {
      font: 'helvetica',
      fontSize: 7,
      cellPadding: 1.6,
      overflow: 'linebreak',
      textColor: SLATE,
      lineWidth: 0.1,
      lineColor: [226, 232, 240],
    },
    headStyles: {
      fillColor: VIOLET,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      halign: 'left',
    },
    alternateRowStyles: { fillColor: [250, 249, 254] },
    showHead: 'everyPage',
    didDrawPage: () => {
      if (doc.getCurrentPageInfo().pageNumber > 1) drawHeaderBand();
    },
  });

  // Page footers drawn once the total count is known.
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 14, doc.internal.pageSize.getHeight() - 6, {
      align: 'right',
    });
  }

  const filename = buildExportFilename(meta.eventName, meta.filters, 'pdf');
  triggerDownload(doc.output('arraybuffer'), filename, 'application/pdf');
}
