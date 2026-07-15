import Card from '../../../common/components/Card';
import { buildTextOutput } from '../actions/buildTextOutput';
import type { SpectrumResult } from '../../../types/spectra';

export interface TextOutputBoxProps {
  result: SpectrumResult;
}

export default function TextOutputBox({ result }: TextOutputBoxProps) {
  return (
    <Card className="bg-surface-2 p-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
        Текстовый вывод
      </p>
      <pre className="whitespace-pre-wrap font-mono text-sm text-foreground">
        {buildTextOutput(result)}
      </pre>
    </Card>
  );
}
