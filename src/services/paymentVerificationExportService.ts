import { zipSync, type Zippable } from 'fflate';
import { paymentMethodLabel } from './paymentProofService';
import type { PaymentRegistrationRow } from './registrationService';

/* ─── Helpers ────────────────────────────────────────────────────────── */

function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

function formatExportDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const mon = months[d.getMonth()];
  const yr = d.getFullYear();
  const hrs = d.getHours();
  const min = String(d.getMinutes()).padStart(2, '0');
  const ampm = hrs >= 12 ? 'PM' : 'AM';
  const h12 = hrs % 12 || 12;
  return `${day}-${mon}-${yr} ${h12}:${min} ${ampm}`;
}

function formatExportDateShort(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const mon = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${mon}/${d.getFullYear()}`;
}

function filterLabel(filter: string): string {
  if (filter === 'All') return 'All Statuses';
  return filter.charAt(0).toUpperCase() + filter.slice(1);
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // eslint-disable-next-line eslint(no-control-regex) -- intentional: strip NUL
    .replace(/\u0000/g, '')
    // eslint-disable-next-line eslint(no-control-regex) -- intentional: invalid XML chars only
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

function columnLetters(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function cellRef(row: number, col: number): string {
  return `${columnLetters(col)}${row + 1}`;
}

function triggerDownload(data: ArrayBuffer, filename: string, mimeType: string): void {
  const blob = new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ─── Column Definitions ─────────────────────────────────────────────── */

const COLUMNS: Array<{
  header: string;
  width: number;
  get: (r: PaymentRegistrationRow) => string;
}> = [
  { header: 'Registration ID', width: 22, get: (r) => r.registration_id },
  { header: 'Participant Name', width: 22, get: (r) => r.user_full_name },
  { header: 'Participant Email', width: 28, get: (r) => r.participant_email },
  { header: 'Participant Phone', width: 16, get: (r) => r.user_phone || '—' },
  { header: 'College / Institution', width: 30, get: (r) => r.college },
  { header: 'CAS ID', width: 12, get: (r) => r.casyum_id || '—' },
  { header: 'Department', width: 20, get: (r) => r.department || r.user_department || '—' },
  { header: 'Event Name', width: 26, get: (r) => r.event_name || r.event_id || '—' },
  {
    header: 'All Events',
    width: 36,
    get: (r) => {
      if (!r.selectedEvents) return r.event_name || r.event_id || '—';
      const parts: string[] = [];
      if (Array.isArray(r.selectedEvents.regular)) {
        parts.push(...r.selectedEvents.regular.map((e: { eventName: string }) => e.eventName));
      }
      if (r.selectedEvents.gaming) {
        parts.push(r.selectedEvents.gaming.eventName);
      }
      return parts.length > 0 ? parts.join(', ') : r.event_name || r.event_id || '—';
    },
  },
  { header: 'Fee / Amount (₹)', width: 16, get: (r) => String(r.registrationFee) },
  { header: 'Regular Fee (₹)', width: 14, get: (r) => String(r.regularFee || 0) },
  { header: 'Gaming Fee (₹)', width: 14, get: (r) => String(r.gamingFee || 0) },
  { header: 'Payment Method', width: 18, get: (r) => paymentMethodLabel(r.paymentMethod) },
  { header: 'Transaction ID', width: 28, get: (r) => r.transactionId || '—' },
  { header: 'Payment Date', width: 18, get: (r) => formatExportDateShort(r.paymentDate) },
  { header: 'Payment Status', width: 16, get: (r) => r.paymentStatus.charAt(0).toUpperCase() + r.paymentStatus.slice(1) },
  { header: 'Submitted Date', width: 20, get: (r) => formatExportDate(r.registered_at) },
  { header: 'Payment Screenshot URL', width: 36, get: (r) => r.paymentScreenshotUrl || '—' },
  { header: 'Verified By', width: 20, get: (r) => r.paymentVerifiedByName || '—' },
  { header: 'Verified At', width: 20, get: (r) => formatExportDate(r.paymentVerifiedAt) },
  { header: 'Rejection Reason', width: 30, get: (r) => r.paymentRejectionReason || '—' },
  { header: 'Resubmission Count', width: 14, get: (r) => String(r.paymentResubmissionCount || 0) },
];

/* ─── Excel OOXML Export ─────────────────────────────────────────────── */

const SHEET_NAME = 'Payment Verification';

function stylesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="4">
<font><sz val="11"/><name val="Calibri"/></font>
<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
<font><b/><color rgb="FF5B21B6"/><name val="Calibri"/></font>
<font><i/><sz val="10"/><color rgb="FF64748B"/><name val="Calibri"/></font>
</fonts>
<fills count="3">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF6D28D9"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="2">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border>
  <left style="thin"><color rgb="FFE2E8F0"/></left>
  <right style="thin"><color rgb="FFE2E8F0"/></right>
  <top style="thin"><color rgb="FFE2E8F0"/></top>
  <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
  <diagonal/>
</border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<numFmts count="1"><numFmt numFmtId="164" formatCode="dd\\-mmm\\-yyyy\\ hh:mm\\ AM/PM"/></numFmts>
<cellXfs count="5">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function workbookXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${escapeXml(SHEET_NAME)}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;
}

function relsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;
}

function rootRelsXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;
}

function contentTypesXml(): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;
}

function inlineStrCell(ref: string, value: string, styleIndex: number): string {
  const s = styleIndex ? ` s="${styleIndex}"` : '';
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function buildSheetXml(
  rows: PaymentRegistrationRow[],
  filter: string
): string {
  const colCount = COLUMNS.length;
  const lastCol = columnLetters(colCount - 1);

  const titleRows: Array<{ style: number; text: string }> = [
    { style: 2, text: 'CASYUM - Payment Verification Report' },
    { style: 3, text: `Generated on ${formatExportDate(new Date().toISOString())}` },
    { style: 3, text: `Filter: ${filterLabel(filter)}    |    Total Records: ${rows.length}` },
  ];

  const headerRowIdx = titleRows.length;

  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetPr><outlinePr/></sheetPr>
<dimension ref="A1:${lastCol}${rows.length + headerRowIdx + 1}"/>
<sheetViews>
  <sheetView tabSelected="1" workbookViewId="0">
    <pane ySplit="${headerRowIdx + 1}" topLeftCell="A${headerRowIdx + 2}" activePane="bottomLeft" state="frozen"/>
    <selection pane="bottomLeft" activeCell="A${headerRowIdx + 2}" sqref="A${headerRowIdx + 2}"/>
  </sheetView>
</sheetViews>
<sheetFormatPr defaultRowHeight="15"/>`;

  xml += '<cols>';
  COLUMNS.forEach((c, i) => {
    xml += `<col min="${i + 1}" max="${i + 1}" width="${Math.min(Math.max(c.width, 8), 50)}" customWidth="1"/>`;
  });
  xml += '</cols><sheetData>';

  titleRows.forEach((t, i) => {
    xml += `<row r="${i + 1}" spans="1:${colCount}">${inlineStrCell(`A${i + 1}`, t.text, t.style)}</row>`;
  });

  xml += `<row r="${headerRowIdx + 1}" spans="1:${colCount}">`;
  COLUMNS.forEach((c, i) => {
    xml += inlineStrCell(cellRef(headerRowIdx, i), c.header, 1);
  });
  xml += '</row>';

  rows.forEach((r, ri) => {
    const rowNum = headerRowIdx + 1 + ri;
    xml += `<row r="${rowNum + 1}" spans="1:${colCount}">`;
    COLUMNS.forEach((c, ci) => {
      const ref = cellRef(rowNum, ci);
      xml += inlineStrCell(ref, c.get(r), 2);
    });
    xml += '</row>';
  });

  xml += `</sheetData><autoFilter ref="A${headerRowIdx + 1}:${lastCol}${rows.length + headerRowIdx + 1}"/></worksheet>`;
  return xml;
}

function buildPaymentVerificationXlsx(rows: PaymentRegistrationRow[], filter: string): Uint8Array {
  const files: Zippable = {
    '[Content_Types].xml': new TextEncoder().encode(contentTypesXml()),
    '_rels/.rels': new TextEncoder().encode(rootRelsXml()),
    'xl/workbook.xml': new TextEncoder().encode(workbookXml()),
    'xl/_rels/workbook.xml.rels': new TextEncoder().encode(relsXml()),
    'xl/styles.xml': new TextEncoder().encode(stylesXml()),
    'xl/worksheets/sheet1.xml': new TextEncoder().encode(buildSheetXml(rows, filter)),
  };
  return zipSync(files, { level: 6 });
}

export function exportPaymentVerificationExcel(
  filteredRows: PaymentRegistrationRow[],
  filter: string
): void {
  if (filteredRows.length === 0) {
    throw new Error('No records available to export.');
  }
  const bytes = buildPaymentVerificationXlsx(filteredRows, filter);
  const filename = `CASYUM_Payment_Verification_${todayDateString()}.xlsx`;
  triggerDownload(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    filename,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

/* ─── PDF Export (jsPDF + autotable — multi-section layout) ───────────── */

const VIOLET: [number, number, number] = [109, 40, 217];
const VIOLET_DARK: [number, number, number] = [91, 33, 182];
const SLATE: [number, number, number] = [71, 85, 105];
const LIGHT_FILL: [number, number, number] = [247, 245, 255];
const BORDER: [number, number, number] = [226, 232, 240];
const MUTED: [number, number, number] = [100, 116, 139];

const MARGIN_LEFT = 13;
const MARGIN_RIGHT = 13;
const CONTENT_WIDTH_MM = 297 - MARGIN_LEFT - MARGIN_RIGHT; // A4 landscape: 271mm usable

/** Wrap a single line into multiple lines that fit maxWidthMm, using helvetica. */
function wrapTextMm(
  doc: any,
  text: string,
  fontSize: number,
  maxWidthMm: number
): string[] {
  const unit = doc.internal.scaleFactor;
  const words = String(text || '').split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';
  const widthMm = (s: string) =>
    (doc.getStringUnitWidth(s) * fontSize) / unit;
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (widthMm(candidate) <= maxWidthMm) {
      current = candidate;
    } else if (!current) {
      // A single word is wider than the column: break mid-word at sensible points.
      let chunk = '';
      for (const ch of word) {
        if (widthMm(chunk + ch) > maxWidthMm && chunk) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk += ch;
        }
      }
      lines.push(chunk);
      current = '';
      return;
    } else {
      lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [''];
}

/**
 * Draw the branded CASYUM header band on the current page (no meta below).
 * Used for continuation pages so content can start right under the band.
 */
function drawBandOnly(doc: any, pageWidth: number, filter: string, total: number): void {
  const bandH = 16;
  doc.setFillColor(...VIOLET);
  doc.rect(0, 0, pageWidth, bandH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text('CASYUM', MARGIN_LEFT, 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Payment Verification Report', MARGIN_LEFT + 42, 9.5);
  doc.setFontSize(8);
  doc.setTextColor(235, 230, 255);
  doc.text(
    `Filter: ${filterLabel(filter)}   |   Total: ${total}`,
    pageWidth - MARGIN_RIGHT,
    9.5,
    { align: 'right' }
  );
}

/**
 * Draw the branded CASYUM header band + the meta lines below it on the
 * current page. Returns the y cursor to start content beneath the meta.
 */
function drawReportHeader(
  doc: any,
  pageWidth: number,
  filter: string,
  generatedOn: string,
  total: number,
  firstPage: boolean
): number {
  const bandH = 16;
  doc.setFillColor(...VIOLET);
  doc.rect(0, 0, pageWidth, bandH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.text('CASYUM', MARGIN_LEFT, 9.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Payment Verification Report', MARGIN_LEFT + 42, 9.5);

  if (!firstPage) {
    doc.setFontSize(8);
    doc.setTextColor(235, 230, 255);
    doc.text(
      `Filter: ${filterLabel(filter)}   |   Total: ${total}`,
      pageWidth - MARGIN_RIGHT,
      9.5,
      { align: 'right' }
    );
  }

  let y = bandH + 7;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...VIOLET_DARK);
  doc.setFontSize(10);
  doc.text(`Filter: ${filterLabel(filter)}`, MARGIN_LEFT, y);
  y += 4.6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE);
  doc.setFontSize(9);
  doc.text(`Generated On: ${generatedOn}`, MARGIN_LEFT, y);
  doc.text(
    `Total Records: ${total}`,
    MARGIN_LEFT + 70,
    y
  );
  y += 6.5;
  return y;
}

/** Draw a pale divider line to separate content bands. */
function drawDivider(doc: any, y: number, pageWidth: number): number {
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_LEFT, y, pageWidth - MARGIN_RIGHT, y);
  return y + 5;
}

/** Draw a section heading with a violet underline. */
function drawSectionHeading(doc: any, text: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...VIOLET_DARK);
  doc.setFontSize(13);
  doc.text(text, MARGIN_LEFT, y);
  const lineY = y + 1.6;
  doc.setDrawColor(...VIOLET);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_LEFT, lineY, MARGIN_LEFT + 55, lineY);
  return y + 7;
}

/** Layout context shared by drawing helpers (for header re-draw on page-break). */
interface PdfCtx {
  filter: string;
  generatedOn: string;
  total: number;
  pageWidth: number;
  pageHeight: number;
  footerZone: number;
}

function addFreshPage(doc: any, ctx: PdfCtx): number {
  doc.addPage();
  drawBandOnly(doc, ctx.pageWidth, ctx.filter, ctx.total);
  return 18;
}

/**
 * Draw a single bordered block of [label, value] pairs in a two-column layout.
 * Computes the exact height first so it can page-break before drawing, then
 * draws wrapped values. Returns the next cursor y.
 */
function drawLabelValueBlock(
  doc: any,
  ctx: PdfCtx,
  pairs: Array<[string, string]>,
  yStart: number
): number {
  const labelWidth = 46;
  const gap = 6;
  const innerPad = 5;
  const valueWidth = CONTENT_WIDTH_MM - labelWidth - gap - innerPad * 2;
  const cellPad = 2.6;
  const lineHeight = 4.6;
  const fontSize = 9;

  // Compute the exact drawn height of this block.
  let totalLines = 0;
  pairs.forEach(([, value]) => {
    const v = String(value || '—');
    totalLines += wrapTextMm(doc, v, fontSize, valueWidth).length;
  });
  const blockHeightMm = totalLines * lineHeight + cellPad * 2;

  if (yStart + blockHeightMm > ctx.pageHeight - ctx.footerZone) {
    yStart = addFreshPage(doc, ctx);
  }

  // Outer border
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.rect(MARGIN_LEFT, yStart - cellPad - 2, CONTENT_WIDTH_MM, blockHeightMm, 'S');

  let y = yStart + cellPad;
  doc.setFontSize(fontSize);
  pairs.forEach(([label, value]) => {
    const v = String(value || '—');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SLATE);
    doc.text(label, MARGIN_LEFT + innerPad, y + lineHeight - 1);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 30, 36);
    const lines = wrapTextMm(doc, v, fontSize, valueWidth);
    let ly = y + lineHeight - 1;
    lines.forEach((line, idx) => {
      if (idx > 0) ly += lineHeight;
      doc.text(line, MARGIN_LEFT + labelWidth + gap, ly);
    });
    y += lines.length * lineHeight;
  });

  return yStart + blockHeightMm + 3;
}

/**
 * Section 1: a readable payment summary table (autotable). Only the most
 * important payment fields, never the whole model.
 */
function drawSummaryTable(
  doc: any,
  autoTable: any,
  ctx: PdfCtx,
  rows: PaymentRegistrationRow[],
  startY: number
): number {
  const summaryCols = [
    { head: 'S.No', width: 10 },
    { head: 'Registration ID', width: 30 },
    { head: 'Participant Name', width: 34 },
    { head: 'Event', width: 40 },
    { head: 'Amount', width: 16 },
    { head: 'Payment Method', width: 24 },
    { head: 'Transaction ID', width: 34 },
    { head: 'Payment Date', width: 20 },
    { head: 'Payment Status', width: 18 },
    { head: 'Submitted Date', width: 22 },
    { head: 'Verification Status', width: 22 },
  ];

  const tableWidth = summaryCols.reduce((s, c) => s + c.width, 0);
  const scale = CONTENT_WIDTH_MM / tableWidth;
  const widths = summaryCols.map((c) => c.width * scale);

  const body = rows.map((r, i) => [
    String(i + 1),
    r.registration_id,
    r.user_full_name,
    r.event_name || r.event_id || '—',
    `Rs. ${r.registrationFee}`,
    paymentMethodLabel(r.paymentMethod),
    r.transactionId || '—',
    formatExportDateShort(r.paymentDate),
    r.paymentStatus.charAt(0).toUpperCase() + r.paymentStatus.slice(1),
    formatExportDate(r.registered_at),
    r.paymentStatus === 'verified'
      ? 'Verified'
      : r.paymentStatus === 'rejected'
      ? 'Rejected'
      : 'Submitted',
  ]);

  autoTable(doc, {
    head: [summaryCols.map((c) => c.head)],
    body,
    startY,
    margin: { left: MARGIN_LEFT, right: MARGIN_RIGHT, top: 20 },
    columnStyles: Object.fromEntries(
      widths.map((w, i) => [i, { cellWidth: w }])
    ),
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1.8,
      overflow: 'linebreak',
      textColor: SLATE,
      lineWidth: 0.1,
      lineColor: BORDER,
      valign: 'middle',
    },
    headStyles: {
      fillColor: VIOLET,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
      valign: 'middle',
    },
    alternateRowStyles: { fillColor: LIGHT_FILL },
    showHead: 'everyPage',
    didDrawPage: () => {
      // Draw a compact header band on continuation pages so the repeating
      // table header sits cleanly below it.
      const pageNum = doc.getCurrentPageInfo().pageNumber;
      if (pageNum > 1) {
        drawBandOnly(doc, ctx.pageWidth, ctx.filter, ctx.total);
      }
    },
  });

  // After autotable, find the last drawn Y from finalY (autotable stores it).
  const finalY = (doc as any).lastAutoTable?.finalY ?? startY + 30;
  return finalY + 8;
}

/** Draw the per-record participant & registration details (Section 2). */
function drawParticipantDetails(
  doc: any,
  ctx: PdfCtx,
  r: PaymentRegistrationRow,
  recordNumber: number,
  yStart: number
): number {
  let y = drawSectionHeading(doc, `Registration #${recordNumber}`, yStart);

  const pairs: Array<[string, string]> = [
    ['Registration ID', r.registration_id],
    ['Participant Name', r.user_full_name],
    ['Participant Email', r.participant_email || '—'],
    ['Participant Phone', r.user_phone || '—'],
    ['CAS ID', r.casyum_id || '—'],
    ['College / Institution', r.college || '—'],
    ['Department', r.department || r.user_department || '—'],
  ];
  y = drawLabelValueBlock(doc, ctx, pairs, y);

  // Event(s) section
  y = drawSectionHeading2(doc, 'Event(s)', y);
  const allEvents = allEventsLabel(r);
  const eventPairs: Array<[string, string]> = [
    ['Event', r.event_name || r.event_id || '—'],
    ['All Events', allEvents],
  ];
  y = drawLabelValueBlock(doc, ctx, eventPairs, y);
  return y + 2;
}

function drawSectionHeading2(doc: any, text: string, y: number): number {
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...VIOLET_DARK);
  doc.setFontSize(11);
  doc.text(text, MARGIN_LEFT, y);
  const lineY = y + 1.4;
  doc.setDrawColor(...VIOLET);
  doc.setLineWidth(0.5);
  doc.line(MARGIN_LEFT, lineY, MARGIN_LEFT + 35, lineY);
  return y + 6;
}

function allEventsLabel(r: PaymentRegistrationRow): string {
  if (!r.selectedEvents) return r.event_name || r.event_id || '—';
  const parts: string[] = [];
  if (Array.isArray(r.selectedEvents.regular)) {
    parts.push(...r.selectedEvents.regular.map((e: { eventName: string }) => e.eventName));
  }
  if (r.selectedEvents.gaming) {
    parts.push(r.selectedEvents.gaming.eventName);
  }
  return parts.length > 0 ? parts.join(', ') : r.event_name || r.event_id || '—';
}

/** Draw the per-record payment details (Section 3) with clickable screenshot. */
function drawPaymentDetails(
  doc: any,
  ctx: PdfCtx,
  r: PaymentRegistrationRow,
  yStart: number
): number {
  let y = drawSectionHeading2(doc, 'Payment Details', yStart);

  const basePairs: Array<[string, string]> = [
    ['Payment Amount', `Rs. ${r.registrationFee}`],
    ['Regular Fee', `Rs. ${r.regularFee || 0}`],
    ['Registration Fee', `Rs. ${r.registrationFee}`],
    ['Payment Method', paymentMethodLabel(r.paymentMethod)],
    ['Transaction ID', r.transactionId || '—'],
    ['Payment Date', formatExportDate(r.paymentDate)],
    ['Payment Status', r.paymentStatus.charAt(0).toUpperCase() + r.paymentStatus.slice(1)],
    ['Submitted Date', formatExportDate(r.registered_at)],
  ];
  y = drawLabelValueBlock(doc, ctx, basePairs, y);

  // Screenshot line
  const safeY = ctx.pageHeight - ctx.footerZone - 12;
  if (y > safeY) {
    y = addFreshPage(doc, ctx);
  }
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...SLATE);
  doc.setFontSize(9);
  doc.text('Payment Screenshot:', MARGIN_LEFT + 4, y + 3);
  if (r.paymentScreenshotUrl) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235);
    doc.setFontSize(9);
    doc.textWithLink('View Screenshot', MARGIN_LEFT + 50, y + 3, {
      url: r.paymentScreenshotUrl,
    });
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.2);
    doc.line(MARGIN_LEFT + 50, y + 3.4, MARGIN_LEFT + 50 + 19, y + 3.4);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MUTED);
    doc.setFontSize(9);
    doc.text('Not Available', MARGIN_LEFT + 50, y + 3);
  }
  return y + 7;
}

/** Draw the per-record verification details (Section 4). */
function drawVerificationDetails(
  doc: any,
  ctx: PdfCtx,
  r: PaymentRegistrationRow,
  yStart: number
): number {
  let y = drawSectionHeading2(doc, 'Verification Details', yStart);

  const statusText =
    r.paymentStatus === 'verified'
      ? 'Verified'
      : r.paymentStatus === 'rejected'
      ? 'Rejected'
      : 'Submitted';
  const pairs: Array<[string, string]> = [
    ['Verification Status', statusText],
    ['Verified By', r.paymentVerifiedByName || '—'],
    ['Verified At', formatExportDate(r.paymentVerifiedAt)],
    ['Rejection Reason', r.paymentRejectionReason || '—'],
    ['Reviewer Comments / Notes', r.paymentVerifiedByName || r.paymentRejectionReason || '—'],
    ['Resubmission Count', String(r.paymentResubmissionCount || 0)],
  ];
  y = drawLabelValueBlock(doc, ctx, pairs, y);
  return y + 4;
}

export async function exportPaymentVerificationPdf(
  filteredRows: PaymentRegistrationRow[],
  filter: string
): Promise<void> {
  if (filteredRows.length === 0) {
    throw new Error('No records available to export.');
  }

  const { jsPDF } = await import('jspdf');
  const mod = await import('jspdf-autotable');
  const autoTable = (mod as any).default ?? (mod as any).autoTable;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const footerZone = 14;
  const generatedOn = new Date().toLocaleString();

  const ctx: PdfCtx = {
    filter,
    generatedOn,
    total: filteredRows.length,
    pageWidth,
    pageHeight,
    footerZone,
  };

  let cursorY = drawReportHeader(doc, pageWidth, filter, generatedOn, filteredRows.length, true);
  cursorY = drawDivider(doc, cursorY, pageWidth);

  // SECTION 1 — Payment Summary Table
  cursorY = drawSectionHeading(doc, '1. Payment Summary', cursorY);
  cursorY = drawSummaryTable(doc, autoTable, ctx, filteredRows, cursorY);

  // SECTIONS 2–4 — Detailed per-record sections
  cursorY = drawSectionHeading(doc, '2. Participant, Payment & Verification Details', cursorY + 2);

  filteredRows.forEach((r, idx) => {
    // Estimate one record's full vertical extent so we can page-break before
    // starting it, never splitting a record across pages.
    const recordNumber = idx + 1;
    const estimatedRecordH = 175; // generous upper bound for one full record
    if (cursorY + estimatedRecordH > pageHeight - footerZone) {
      cursorY = addFreshPage(doc, ctx) - 2;
    }
    const sep = drawDivider(doc, cursorY, pageWidth);
    cursorY = drawParticipantDetails(doc, ctx, r, recordNumber, sep);
    cursorY = drawPaymentDetails(doc, ctx, r, cursorY);
    cursorY = drawVerificationDetails(doc, ctx, r, cursorY);
  });

  // Page footers with "Page X of Y".
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - MARGIN_RIGHT,
      pageHeight - 6,
      { align: 'right' }
    );
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...VIOLET_DARK);
    doc.text(
      'CASYUM - Payment Verification Report',
      MARGIN_LEFT,
      pageHeight - 6
    );
  }

  const filename = `CASYUM_Payment_Verification_${todayDateString()}.pdf`;
  triggerDownload(doc.output('arraybuffer'), filename, 'application/pdf');
}
