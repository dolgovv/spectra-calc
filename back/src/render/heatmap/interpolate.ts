/** Bilinear-sample `matrix` at fractional grid coordinates u,v ∈ [0,1]. */
export function bilinearSample(matrix: number[][], u: number, v: number): number {
  const gridSize = matrix.length;
  const x = u * (gridSize - 1);
  const y = v * (gridSize - 1);

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, gridSize - 1);
  const y1 = Math.min(y0 + 1, gridSize - 1);

  const tx = x - x0;
  const ty = y - y0;

  const top = matrix[y0][x0] * (1 - tx) + matrix[y0][x1] * tx;
  const bottom = matrix[y1][x0] * (1 - tx) + matrix[y1][x1] * tx;
  return top * (1 - ty) + bottom * ty;
}
