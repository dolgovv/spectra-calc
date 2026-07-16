import { useEffect, useRef } from 'react';
import { sampleHeatmapColor } from '../../../lib/heatmapPalette';

export interface HeatmapCanvasProps {
  /** matrix[row][col] — row 0 is the bottom of the map (Y=0), col 0 the left (X=0). */
  matrix: number[][];
  colorScaleMin: number;
  colorScaleMax: number;
}

const RESOLUTION = 600;

/**
 * Paints the intensity matrix client-side in the app's colour ramp.
 *
 * The grid is only 10×10, so it is drawn at native size onto an offscreen canvas and then scaled
 * up with image smoothing on — the browser's bilinear filter does the interpolation, which is what
 * gives the smooth field instead of 100 hard squares.
 */
export default function HeatmapCanvas({
  matrix,
  colorScaleMin,
  colorScaleMax,
}: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    if (!rows || !cols) return;

    const span = colorScaleMax - colorScaleMin || 1;

    const cells = document.createElement('canvas');
    cells.width = cols;
    cells.height = rows;
    const cellsCtx = cells.getContext('2d');
    if (!cellsCtx) return;

    const image = cellsCtx.createImageData(cols, rows);
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Matrix row 0 is the bottom of the map; canvas row 0 is the top.
        const y = rows - 1 - row;
        const [r, g, b] = sampleHeatmapColor((matrix[row][col] - colorScaleMin) / span);
        const offset = (y * cols + col) * 4;
        image.data[offset] = r;
        image.data[offset + 1] = g;
        image.data[offset + 2] = b;
        image.data[offset + 3] = 255;
      }
    }
    cellsCtx.putImageData(image, 0, 0);

    canvas.width = RESOLUTION;
    canvas.height = RESOLUTION;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(cells, 0, 0, RESOLUTION, RESOLUTION);

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const p = (i / 10) * RESOLUTION;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, RESOLUTION);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(RESOLUTION, p);
      ctx.stroke();
    }
  }, [matrix, colorScaleMin, colorScaleMax]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Тепловая карта интенсивности"
      className="block h-full w-full"
    />
  );
}
