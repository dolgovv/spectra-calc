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
        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-surface-2 px-6 py-16 text-center transition-colors',
        isDragOver && 'border-accent bg-accent/5',
        error && 'border-red-500/50',
      )}
    >
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-surface">
        <Archive className="h-7 w-7 text-accent" />
      </div>
      {file ? (
        <p className="font-medium text-foreground">{file.name}</p>
      ) : (
        <p className="font-medium text-foreground">Перетащите архив с данными спектров</p>
      )}
      <p className="mt-1 text-sm text-muted">Формат .zip содержащий файлы спектров .txt</p>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <Button variant="ghost" size="md" className="mt-6" onClick={() => inputRef.current?.click()}>
        Выбрать файл
      </Button>
      <input ref={inputRef} type="file" accept=".zip" hidden onChange={handleInputChange} />
    </div>
  );
}
