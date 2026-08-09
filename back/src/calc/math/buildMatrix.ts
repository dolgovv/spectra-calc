/**
 * Reshapes a flat list of `gridSize²` values into a gridSize×gridSize matrix:
 * the first `gridSize` values form row 0, the next `gridSize` form row 1, etc.
 */
export function buildMatrix(values: number[], gridSize: number): number[][] {
  const expected = gridSize * gridSize;
  if (values.length !== expected) {
    throw new Error(`Ожидалось ${expected} значений, получено ${values.length}`);
  }
  const matrix: number[][] = [];
  for (let row = 0; row < gridSize; row++) {
    matrix.push(values.slice(row * gridSize, row * gridSize + gridSize));
  }
  return matrix;
}
