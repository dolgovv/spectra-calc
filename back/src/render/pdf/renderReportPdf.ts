import PDFDocument from 'pdfkit';
import { FONT_BOLD, FONT_REGULAR } from '../fonts';
import type {
  CategoryKey,
  SpectrumComputation,
} from '../../common/types/spectra.types';

const nf = new Intl.NumberFormat('ru-RU');

/** The bundled font lacks the Unicode superscript-minus, so render the unit as "см-1" in PDF text. */
const PDF_CM = 'см⁻¹'.replace('⁻¹', '-1');

const CATEGORY_COLORS: Record<CategoryKey, string> = {
  excellent: '#12b886',
  acceptable: '#2fb8a0',
  satisfactory: '#e8a13a',
  unacceptable: '#e35d5d',
};

/**
 * Renders the A4 PDF report: heatmap image, statistics with verdict, and the square
 * intensity table. Returns the PDF as a Buffer.
 */
export function renderReportPdf(
  computation: SpectrumComputation,
  heatmapPng: Buffer,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.registerFont('body', FONT_REGULAR);
    doc.registerFont('bold', FONT_BOLD);

    const { interval, stats } = computation;
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const left = doc.page.margins.left;

    // Header
    doc.font('bold').fontSize(20).fillColor('#111111');
    doc.text('Отчёт по карте спектров', left, doc.y);
    doc.moveDown(0.2);
    doc.font('body').fontSize(10).fillColor('#555555');
    doc.text(
      `${computation.sourceFileName}  ·  интервал ${interval.from}–${interval.to} ${PDF_CM}  ·  ${new Date(
        computation.computedAt,
      ).toLocaleString('ru-RU')}`,
    );
    doc.moveDown(0.8);

    if (computation.spectraDropped > 0) {
      const used = computation.gridSize * computation.gridSize;
      doc.font('bold').fontSize(9.5).fillColor('#e8a13a');
      doc.text(
        `⚠ Показаны первые ${used} из ${computation.spectraFound} найденных спектров — ${computation.spectraDropped} отброшено (сетка ${computation.gridSize}×${computation.gridSize}).`,
        left,
        doc.y,
        { width: pageWidth },
      );
      doc.fillColor('#111111');
      doc.moveDown(0.6);
    }

    // Heatmap image, centered
    const imgWidth = Math.min(360, pageWidth);
    const imgX = left + (pageWidth - imgWidth) / 2;
    const imgY = doc.y;
    doc.image(heatmapPng, imgX, imgY, { width: imgWidth });
    doc.y = imgY + imgWidth * (654 / 734) + 10; // preserve aspect ratio of the PNG

    // Statistics block
    doc.font('bold').fontSize(13).fillColor('#111111').text('Статистические показатели');
    doc.moveDown(0.4);
    statRow(doc, left, 'Средняя интенсивность (μ)', `${nf.format(Math.round(stats.meanIntensity))} отн. ед.`);
    statRow(doc, left, 'Стандартное отклонение (σ)', `${nf.format(Math.round(stats.stdDeviation))} отн. ед.`);
    statRow(doc, left, 'Отн. стандартное отклонение (Sr)', `${stats.relStdDeviationPercent.toFixed(1)} %`);
    statRow(doc, left, 'Обработано точек / файлов', `${stats.pointsProcessed} / ${stats.filesProcessed}`);
    doc.moveDown(0.6);

    // Verdict badge
    const badgeColor = CATEGORY_COLORS[stats.category];
    const badgeText = `Вердикт: ${stats.categoryLabel.toUpperCase()}`;
    doc.font('bold').fontSize(12);
    const badgeWidth = doc.widthOfString(badgeText) + 24;
    const badgeY = doc.y;
    doc.roundedRect(left, badgeY, badgeWidth, 26, 6).fill(badgeColor);
    doc.fillColor('#ffffff').text(badgeText, left + 12, badgeY + 7);
    doc.fillColor('#111111');

    // Matrix table on a fresh page
    doc.addPage();
    doc
      .font('bold')
      .fontSize(13)
      .fillColor('#111111')
      .text(`Матрица полезной интенсивности (${computation.gridSize} × ${computation.gridSize})`);
    doc.moveDown(0.5);
    drawMatrixTable(doc, computation, left, pageWidth);

    doc.end();
  });
}

function statRow(doc: PDFKit.PDFDocument, left: number, label: string, value: string): void {
  const y = doc.y;
  doc.font('body').fontSize(11).fillColor('#444444').text(label, left, y);
  doc.font('bold').fontSize(11).fillColor('#111111').text(value, left, y, {
    width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
    align: 'right',
  });
  doc.moveDown(0.3);
}

function drawMatrixTable(
  doc: PDFKit.PDFDocument,
  computation: SpectrumComputation,
  left: number,
  pageWidth: number,
): void {
  const { matrix, xTicks, yTicks } = computation;
  const cols = matrix[0].length + 1;
  const colWidth = pageWidth / cols;
  const rowHeight = 20;
  const startY = doc.y;

  doc.fontSize(8);

  // Header row (X ticks)
  cell(doc, left, startY, colWidth, rowHeight, 'Y \\ X', 'bold', '#eef2f7');
  xTicks.forEach((tick, c) => {
    cell(doc, left + colWidth * (c + 1), startY, colWidth, rowHeight, String(tick), 'bold', '#eef2f7');
  });

  // Data rows (row 0 = bottom physically, but printed top-down here with its Y label)
  for (let r = 0; r < matrix.length; r++) {
    const y = startY + rowHeight * (r + 1);
    cell(doc, left, y, colWidth, rowHeight, String(yTicks[r]), 'bold', '#eef2f7');
    for (let c = 0; c < matrix[r].length; c++) {
      cell(doc, left + colWidth * (c + 1), y, colWidth, rowHeight, nf.format(Math.round(matrix[r][c])), 'body', '#ffffff');
    }
  }
}

function cell(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  font: 'body' | 'bold',
  fill: string,
): void {
  doc.rect(x, y, w, h).fillAndStroke(fill, '#d0d7e2');
  doc.fillColor('#222222').font(font).text(text, x, y + 6, { width: w, align: 'center' });
}
