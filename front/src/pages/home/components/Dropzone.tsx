import { useRef, useState, type DragEvent } from 'react';
import { Archive } from 'lucide-react';
import Button from '../../../common/components/Button';
import { cn } from '../../../lib/cn';

export interface DropzoneProps {
  file: File | null;
  error?: string | null;
  onFileSelected: (file: File) => void;
}

export default function Dropzone({ file, error, onFileSelected }: DropzoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragOver(false);
    const dropped = event.dataTransfer.files[0];
    if (dropped) onFileSelected(dropped);
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];
    if (selected) onFileSelected(selected);
    event.target.value = '';
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        'rounded-lg border-[1.5px] border-dashed border-muted-faint bg-surface-2 px-6 py-[52px]',
        'text-center transition-colors hover:border-accent',
        isDragOver && 'border-accent',
        error && 'border-red-500/60',
      )}
    >
      <div className="mx-auto mb-[18px] flex h-[52px] w-[52px] items-center justify-center rounded-lg border border-border bg-surface">
        <Archive className="h-[22px] w-[22px] text-foreground" strokeWidth={1.6} />
      </div>

      <p className="mb-1 text-[15px] font-semibold text-foreground">
        Перетащите архив с данными спектров
      </p>
      <p className="mb-5 font-mono text-[13px] text-muted-faint">
        Формат .zip содержащий файлы спектров .txt
      </p>

      <Button variant="ink" onClick={() => inputRef.current?.click()}>
        Выбрать файл
      </Button>

      {file && !error && (
        <div className="mt-3.5 inline-block max-w-full break-all rounded-full border border-accent bg-accent-dim px-3 py-1.5 font-mono text-[12.5px] text-foreground">
          ✓ {file.name}
        </div>
      )}
      {error && <p className="mt-3.5 font-mono text-[12.5px] text-red-400">{error}</p>}

      <input ref={inputRef} type="file" accept=".zip" hidden onChange={handleInputChange} />
    </div>
  );
}
