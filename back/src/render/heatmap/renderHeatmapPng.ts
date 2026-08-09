import { createCanvas, type SKRSContext2D } from "@napi-rs/canvas";
import { createHeatmapScale } from "./colorScale";
import { ensureCanvasFonts, CANVAS_FONT_FAMILY } from "../fonts";
import type { SpectrumComputation } from "../../common/types/spectra.types";

export interface HeatmapRenderOptions {
  /** Overall pixel scale multiplier for a crisp export (default 2). */
  scale?: number;
}

const BASE = {
  plot: 520,
  marginLeft: 78,
  marginTop: 60,
  marginBottom: 74,
  colorbarGap: 26,
  colorbarWidth: 26,
  colorbarLabelWidth: 84,
};

/**
 * Renders the square intensity matrix as a smooth heatmap PNG on a white scientific background,
 * with X/Y axes in µm, a vertical colorbar and an "I <peak> см⁻¹" title. Field, colours and
 * colorbar are built the same way as the web preview (HeatmapCanvas.tsx/HeatmapCard.tsx) - native-
 * resolution colour raster upscaled with smoothing, same magma ramp fitted to the same data - so
 * this exported PNG (and the PDF report, which embeds it) look identical to the result page.
 */
export function renderHeatmapPng(
  computation: SpectrumComputation,
  options: HeatmapRenderOptions = {},
): Buffer {
  ensureCanvasFonts();
  const scale = options.scale ?? 2;
  const { matrix, xTicks, yTicks, colorScaleMin, colorScaleMax, peakLabel } =
    computation;
  const getColor = createHeatmapScale(matrix.flat(), colorScaleMin, colorScaleMax);

  const totalWidth =
    BASE.marginLeft +
    BASE.plot +
    BASE.colorbarGap +
    BASE.colorbarWidth +
    BASE.colorbarLabelWidth;
  const totalHeight = BASE.marginTop + BASE.plot + BASE.marginBottom;

  const canvas = createCanvas(totalWidth * scale, totalHeight * scale);
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  // White background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, totalWidth, totalHeight);

  const plotLeft = BASE.marginLeft;
  const plotTop = BASE.marginTop;
  const plotSize = BASE.plot;

  drawHeatmapField(ctx, matrix, getColor, plotLeft, plotTop, plotSize);
  drawAxes(ctx, xTicks, yTicks, plotLeft, plotTop, plotSize);
  drawColorbar(
    ctx,
    getColor,
    colorScaleMin,
    colorScaleMax,
    peakLabel,
    plotLeft,
    plotTop,
    plotSize,
  );

  return canvas.toBuffer("image/png");
}

function drawHeatmapField(
  ctx: SKRSContext2D,
  matrix: number[][],
  getColor: (value: number) => readonly [number, number, number],
  left: number,
  top: number,
  size: number,
): void {
  const rows = matrix.length;
  const cols = matrix[0].length;

  // Native-resolution colour raster upscaled with smoothing - matches HeatmapCanvas.tsx exactly,
  // rather than interpolating in value space, so the two surfaces render the identical field.
  const buffer = createCanvas(cols, rows);
  const bctx = buffer.getContext("2d");
  const image = bctx.createImageData(cols, rows);

  for (let row = 0; row < rows; row++) {
    // Matrix row 0 is Y=0 at the bottom; image row 0 is the top → flip.
    const y = rows - 1 - row;
    for (let col = 0; col < cols; col++) {
      const [r, g, b] = getColor(matrix[row][col]);
      const idx = (y * cols + col) * 4;
      image.data[idx] = r;
      image.data[idx + 1] = g;
      image.data[idx + 2] = b;
      image.data[idx + 3] = 255;
    }
  }
  bctx.putImageData(image, 0, 0);

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(buffer, left, top, size, size);

  // Faint per-cell gridlines, same 6% white overlay as the web preview.
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1;
  for (let i = 1; i < cols; i++) {
    const x = left + (i / cols) * size;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, top + size);
    ctx.stroke();
  }
  for (let i = 1; i < rows; i++) {
    const y = top + (i / rows) * size;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(left + size, y);
    ctx.stroke();
  }

  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(left, top, size, size);
}

function drawAxes(
  ctx: SKRSContext2D,
  xTicks: number[],
  yTicks: number[],
  left: number,
  top: number,
  size: number,
): void {
  const n = xTicks.length;
  ctx.strokeStyle = "#000000";
  ctx.fillStyle = "#000000";
  ctx.lineWidth = 1.2;
  ctx.font = `13px "${CANVAS_FONT_FAMILY}"`;

  // X ticks + labels
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  xTicks.forEach((tick, i) => {
    const x = left + (i / (n - 1)) * size;
    ctx.beginPath();
    ctx.moveTo(x, top + size);
    ctx.lineTo(x, top + size + 6);
    ctx.stroke();
    ctx.fillText(String(tick), x, top + size + 10);
  });

  // Y ticks + labels (0 at bottom)
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  yTicks.forEach((tick, i) => {
    const y = top + size - (i / (n - 1)) * size;
    ctx.beginPath();
    ctx.moveTo(left - 6, y);
    ctx.lineTo(left, y);
    ctx.stroke();
    ctx.fillText(String(tick), left - 10, y);
  });

  // Axis titles
  ctx.font = `bold 15px "${CANVAS_FONT_FAMILY}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText("X, мкм", left + size / 2, top + size + 52);

  ctx.save();
  ctx.translate(left - 52, top + size / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "center";
  ctx.fillText("Y, мкм", 0, 0);
  ctx.restore();
}

function drawColorbar(
  ctx: SKRSContext2D,
  getColor: (value: number) => readonly [number, number, number],
  min: number,
  max: number,
  peakLabel: number,
  plotLeft: number,
  plotTop: number,
  plotSize: number,
): void {
  const barLeft = plotLeft + plotSize + BASE.colorbarGap;
  const barTop = plotTop;
  const barWidth = BASE.colorbarWidth;
  const barHeight = plotSize;

  // Gradient bar: max at top, min at bottom - same ramp (and fit) as the field above.
  const steps = 128;
  for (let i = 0; i < steps; i++) {
    const t = 1 - i / (steps - 1);
    const [r, g, b] = getColor(min + t * (max - min));
    ctx.fillStyle = `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    const y = barTop + (i / steps) * barHeight;
    ctx.fillRect(barLeft, y, barWidth, barHeight / steps + 1);
  }
  ctx.strokeStyle = "#000000";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(barLeft, barTop, barWidth, barHeight);

  // Tick labels
  const tickCount = 6;
  ctx.fillStyle = "#000000";
  ctx.font = `12px "${CANVAS_FONT_FAMILY}"`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  for (let i = 0; i <= tickCount; i++) {
    const frac = i / tickCount;
    const value = max - frac * (max - min);
    const y = barTop + frac * barHeight;
    ctx.beginPath();
    ctx.moveTo(barLeft + barWidth, y);
    ctx.lineTo(barLeft + barWidth + 5, y);
    ctx.stroke();
    ctx.fillText(formatTick(value), barLeft + barWidth + 9, y);
  }

  // Title "I <peak> см⁻¹" (italic I; superscript −1 drawn manually since the
  // bundled font lacks the Unicode superscript-minus glyph).
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const titleY = barTop - 16;
  let cursor = barLeft - 2;

  ctx.font = `italic bold 15px "${CANVAS_FONT_FAMILY}"`;
  ctx.fillText("I", cursor, titleY);
  cursor += ctx.measureText("I").width + 3;

  ctx.font = `13px "${CANVAS_FONT_FAMILY}"`;
  const mainText = `${peakLabel} см`;
  ctx.fillText(mainText, cursor, titleY);
  cursor += ctx.measureText(mainText).width + 1;

  ctx.font = `10px "${CANVAS_FONT_FAMILY}"`;
  ctx.fillText("-1", cursor, titleY - 6);
}

function formatTick(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(value));
}
