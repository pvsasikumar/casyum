import { zipSync, type Zippable } from 'fflate';
import { REPORT_COLUMNS, formatReportDate } from './reportColumns';
import type { ExportMeta, ReportRow } from './types';
import { buildExportFilename, triggerDownload } from './exportFilename';

/**
 * Professional XLSX writer.
 *
 * The installed `xlsx` package (0.18.5) cannot write frozen header panes or
 * styled cells, so this module emits the OOXML parts by hand and zips them
 * with `fflate`. Output opens cleanly in Excel / LibreOffice / Google Sheets:
 * branded bold header row on violet fill, white text, thin borders, one
 * decimal-free text column per field, frozen top row, auto-filter and sized
 * columns.
 */

const SHEET_NAME = 'CASYUM Participants';

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    // eslint-disable-next-line eslint(no-control-regex) -- intentional: strip NUL
    .replace(/\u0000/g, '')
    // strip control chars invalid in XML 1.0
    // eslint-disable-next-line eslint(no-control-regex) -- intentional: invalid XML chars only
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, '');
}

/** 0-based column index -> spreadsheet letters (0->A, 27->AB). */
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
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="${xmlEscape(SHEET_NAME)}" sheetId="1" r:id="rId1"/></sheets>
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

/** Excel serial datetime (days since 1899-12-30) from an ISO string; NaN if unknown. */
function excelDateSerial(iso: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const msPerDay = 86400000;
  const epoch = Date.UTC(1899, 11, 30);
  return (d.getTime() - epoch) / msPerDay;
}

function inlineStrCell(ref: string, value: string, styleIndex: number): string {
  const s = styleIndex ? ` s="${styleIndex}"` : '';
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function numberCell(ref: string, value: number, styleIndex: number): string {
  return `<c r="${ref}" s="${styleIndex}"><v>${value}</v></c>`;
}

function buildSheetXml(rows: ReportRow[], meta: ExportMeta): string {
  const colCount = REPORT_COLUMNS.length;
  const lastCol = columnLetters(colCount - 1);

  // Title block rows (1..3): report title, generated timestamp, filter line.
  const titleRows: Array<{ style: number; text: string }> = [
    { style: 2, text: 'CASYUM - Participant Report' },
    { style: 3, text: `Generated on ${formatReportDate(new Date().toISOString())}` },
    { style: 3, text: meta.filterSummary },
  ];

  const headerRowIdx = titleRows.length; // 0-based index of header row
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><outlinePr/></sheetPr><dimension ref="A1:${lastCol}${rows.length + headerRowIdx + 1}"/><sheetViews><sheetView tabSelected="1" workbookViewId="0"><pane ySplit="${headerRowIdx + 1}" topLeftCell="A${headerRowIdx + 2}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${headerRowIdx + 2}" sqref="A${headerRowIdx + 2}"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>`;

  xml += '<cols>';
  REPORT_COLUMNS.forEach((c, i) => {
    xml += `<col min="${i + 1}" max="${i + 1}" width="${Math.min(Math.max(c.width, 8), 45)}" customWidth="1"/>`;
  });
  xml += '</cols><sheetData>';

  titleRows.forEach((t, i) => {
    xml += `<row r="${i + 1}" spans="1:${colCount}">${inlineStrCell(`A${i + 1}`, t.text, t.style)}</row>`;
  });

  xml += `<row r="${headerRowIdx + 1}" spans="1:${colCount}">`;
  REPORT_COLUMNS.forEach((c, i) => {
    xml += inlineStrCell(cellRef(headerRowIdx, i), c.header, 1);
  });
  xml += '</row>';

  rows.forEach((row, ri) => {
    const rowNum = headerRowIdx + 1 + ri;
    xml += `<row r="${rowNum + 1}" spans="1:${colCount}">`;
    REPORT_COLUMNS.forEach((c, ci) => {
      const ref = cellRef(rowNum, ci);
      if (c.header === 'Registration Date') {
        const serial = excelDateSerial(row.registeredAt);
        if (serial !== null) {
          xml += numberCell(ref, serial, 3);
        } else {
          xml += inlineStrCell(ref, '', 2);
        }
      } else {
        xml += inlineStrCell(ref, c.get(row), 2);
      }
    });
    xml += '</row>';
  });

  xml += `</sheetData><autoFilter ref="A${headerRowIdx + 1}:${lastCol}${rows.length + headerRowIdx + 1}"/></worksheet>`;
  return xml;
}

/** Builds the .xlsx file as a Uint8Array (pure, testable without a DOM). */
export function buildReportXlsx(rows: ReportRow[], meta: ExportMeta): Uint8Array {
  const files: Zippable = {
    '[Content_Types].xml': new TextEncoder().encode(contentTypesXml()),
    '_rels/.rels': new TextEncoder().encode(rootRelsXml()),
    'xl/workbook.xml': new TextEncoder().encode(workbookXml()),
    'xl/_rels/workbook.xml.rels': new TextEncoder().encode(relsXml()),
    'xl/styles.xml': new TextEncoder().encode(stylesXml()),
    'xl/worksheets/sheet1.xml': new TextEncoder().encode(buildSheetXml(rows, meta)),
  };
  return zipSync(files, { level: 6 });
}

export function exportReportToExcel(rows: ReportRow[], meta: ExportMeta): void {
  if (rows.length === 0) return;
  const bytes = buildReportXlsx(rows, meta);
  const filename = buildExportFilename(meta.eventName, meta.filters, 'xlsx');
  triggerDownload(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}

