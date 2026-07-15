export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

const ZIP_MIME_TYPES = ['application/zip', 'application/x-zip-compressed', 'application/octet-stream', ''];

export function validateZipFile(file: File): FileValidationResult {
  const hasZipExtension = file.name.toLowerCase().endsWith('.zip');
  if (!hasZipExtension) {
    return { valid: false, error: 'Поддерживаются только .zip архивы' };
  }
  if (!ZIP_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Файл не распознан как .zip архив' };
  }
  if (file.size === 0) {
    return { valid: false, error: 'Архив пуст' };
  }
  return { valid: true };
}
