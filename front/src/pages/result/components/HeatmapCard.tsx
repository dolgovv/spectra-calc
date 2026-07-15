import { LayoutGrid } from 'lucide-react';
import Card from '../../../common/components/Card';
import Badge from '../../../common/components/Badge';
import type { SpectrumResult } from '../../../types/spectra';

export interface HeatmapCardProps {
  result: SpectrumResult;
}

export default function HeatmapCard({ result }: HeatmapCardProps) {
  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Матрица интенсивности</h2>
        <Badge icon={<LayoutGrid className="h-3.5 w-3.5" />}>
          {result.gridSize} &times; {result.gridSize} точек
        </Badge>
      </div>
      {/* Server-rendered PNG already includes axes (X/Y, мкм) and the colorbar. */}
      <div className="overflow-x-auto rounded-lg bg-white p-2">
        <img
          src={result.files.heatmapPng}
          alt="Тепловая карта интенсивности"
          className="mx-auto block max-w-full"
        />
      </div>
    </Card>
  );
}
