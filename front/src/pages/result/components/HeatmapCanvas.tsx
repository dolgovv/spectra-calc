import { useEffect, useRef } from 'react';
import type { HeatmapScale } from '../../../lib/heatmapPalette';

export interface HeatmapCanvasProps {
  /** matrix[row][col] — row 0 is the bottom of the map (Y=0), col 0 the left (X=0). */
  matrix: number[][];
  scale: HeatmapScale;
}

const RESOLUTION = 600;

/**
 * Paints the intensity matrix client-side in the app's colour ramp.
 *
 * The grid is small (gridSize×gridSize), so it is drawn at native size onto an offscreen canvas
 * and then scaled up with image smoothing on — the browser's bilinear filter does the
 * interpolation, which is what gives the smooth field instead of hard squares.
 */
export default function HeatmapCanvas({ matrix, scale }: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const rows = matrix.length;
    const cols = matrix[0]?.length ?? 0;
    if (!rows || !cols) return;

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
        const [r, g, b] = scale.colorAt(matrix[row][col]);
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
    for (let i = 1; i < cols; i++) {
      const x = (i / cols) * RESOLUTION;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, RESOLUTION);
      ctx.stroke();
    }
    for (let i = 1; i < rows; i++) {
      const y = (i / rows) * RESOLUTION;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(RESOLUTION, y);
      ctx.stroke();
    }
  }, [matrix, scale]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="Тепловая карта интенсивности"
      className="block h-full w-full"
    />
  );
}
