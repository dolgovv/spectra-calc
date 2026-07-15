export function matrixToCsv(matrix: number[][], xTicks: number[], yTicks: number[]): string {
  const header = ['Y \\ X', ...xTicks.map(String)].join(',');
  const rows = matrix.map((row, i) =>
    [yTicks[i], ...row.map((v) => v.toFixed(2))].join(','),
  );
  return [header, ...rows].join('\n');
}
