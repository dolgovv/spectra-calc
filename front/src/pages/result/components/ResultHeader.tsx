import { ArrowLeft, Download, FileImage, FileText, Table } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../../common/components/Button';
import { ROUTES } from '../../../router/routes';
import type { SpectrumResult } from '../../../types/spectra';

export interface ResultHeaderProps {
  result: SpectrumResult;
}

export default function ResultHeader({ result }: ResultHeaderProps) {
  const { files } = result;
  return (
    <div className="mb-8">
      <Link
        to={ROUTES.home}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Карта интенсивности спектра</h1>
          <p className="mt-1 text-sm text-muted">
            {result.sourceFileName} &middot; Интервал {result.interval.from}-{result.interval.to}{' '}
            см⁻¹
          </p>
          <div className="mt-3 flex flex-wrap gap-4 text-sm">
            <a
              href={files.heatmapPng}
              download
              className="inline-flex items-center gap-1.5 text-muted transition hover:text-accent"
            >
              <FileImage className="h-4 w-4" /> PNG
            </a>
            <a
              href={files.matrixCsv}
              download
              className="inline-flex items-center gap-1.5 text-muted transition hover:text-accent"
            >
              <Table className="h-4 w-4" /> CSV
            </a>
            <a
              href={files.metaJson}
              download
              className="inline-flex items-center gap-1.5 text-muted transition hover:text-accent"
            >
              <FileText className="h-4 w-4" /> JSON
            </a>
          </div>
        </div>
        <a href={files.reportPdf} download>
          <Button variant="primary" leftIcon={<Download className="h-4 w-4" />}>
            Скачать PDF-отчёт
          </Button>
        </a>
      </div>
    </div>
  );
}
