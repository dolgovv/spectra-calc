import type { ReactNode } from 'react';
import { ArrowLeft, Download, FileImage, FileText, Table } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../../../common/components/Button';
import { ROUTES } from '../../../router/routes';
import type { SpectrumResult } from '../../../types/spectra';

export interface ResultHeaderProps {
  result: SpectrumResult;
}

function FileTab({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-[7px] font-mono text-xs text-muted transition hover:border-accent hover:text-accent"
    >
      {icon}
      {label}
    </a>
  );
}

export default function ResultHeader({ result }: ResultHeaderProps) {
  const { files } = result;
  return (
    <>
      <Link
        to={ROUTES.home}
        className="mb-[22px] inline-flex items-center gap-1.5 font-mono text-[12.5px] text-muted transition hover:text-accent"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Назад
      </Link>

      <div className="mb-7 flex flex-wrap items-start justify-between gap-[18px]">
        <div>
          <h1 className="mb-2 font-display text-[28px] font-semibold">
            Карта интенсивности спектра
          </h1>
          <p className="mb-4 break-all font-mono text-[12.5px] text-muted-faint">
            {result.sourceFileName} · Интервал {result.interval.from}-{result.interval.to} см⁻¹
          </p>
          <div className="flex flex-wrap gap-2.5">
            <FileTab
              href={files.heatmapPng}
              icon={<FileImage className="h-3.5 w-3.5" />}
              label="PNG"
            />
            <FileTab href={files.matrixCsv} icon={<Table className="h-3.5 w-3.5" />} label="CSV" />
            <FileTab href={files.metaJson} icon={<FileText className="h-3.5 w-3.5" />} label="JSON" />
          </div>
        </div>
        <a href={files.reportPdf} download>
          <Button variant="primary" leftIcon={<Download className="h-4 w-4" />}>
            Скачать PDF-отчёт
          </Button>
        </a>
      </div>
    </>
  );
}
