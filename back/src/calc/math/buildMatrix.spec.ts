import { buildMatrix } from './buildMatrix';

describe('buildMatrix', () => {
  it('fills rows in order: the first gridSize values are row 0', () => {
    expect(buildMatrix([1, 2, 3, 4], 2)).toEqual([
      [1, 2],
      [3, 4],
    ]);
  });

  it('works for any square side', () => {
    const matrix = buildMatrix(Array.from({ length: 144 }, (_, i) => i), 12);

    expect(matrix).toHaveLength(12);
    expect(matrix[1][0]).toBe(12);
    expect(matrix[11][11]).toBe(143);
  });

  it('rejects a value count that does not fill the grid', () => {
    expect(() => buildMatrix([1, 2, 3], 2)).toThrow('Ожидалось 4 значений, получено 3');
  });
});
