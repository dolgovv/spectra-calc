import { GRID_SIZE } from '../../common/constants';

/**
 * Reshapes a flat list of `GRID_SIZE²` values into a GRID_SIZE×GRID_SIZE matrix:
 * the first `GRID_SIZE` values form row 0, the next `GRID_SIZE` form row 1, etc.
 */
export function buildMatrix(values: number[], gridSize = GRID_SIZE): number[][] {
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
