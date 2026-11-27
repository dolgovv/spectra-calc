import { describe, expect, it } from 'vitest';
import { validateZipFile } from './validateZipFile';

const file = (name: string, type: string, content = 'data') => new File([content], name, { type });

describe('validateZipFile', () => {
  // Browsers and OSes disagree about the MIME type of a .zip, some send none at all.
  it.each(['application/zip', 'application/x-zip-compressed', 'application/octet-stream', ''])(
    'accepts a .zip with the type %j',
    (type) => {
      expect(validateZipFile(file('map.zip', type))).toEqual({ valid: true });
    },
  );

  it('ignores the case of the extension', () => {
    expect(validateZipFile(file('MAP.ZIP', 'application/zip')).valid).toBe(true);
  });

  it('rejects other extensions', () => {
    expect(validateZipFile(file('map.rar', 'application/zip'))).toEqual({
      valid: false,
      error: 'Поддерживаются только .zip архивы',
    });
  });

  it('rejects a misnamed file of another type', () => {
    expect(validateZipFile(file('photo.zip', 'image/png'))).toEqual({
      valid: false,
      error: 'Файл не распознан как .zip архив',
    });
  });

  it('rejects an empty file', () => {
    expect(validateZipFile(file('map.zip', 'application/zip', ''))).toEqual({
      valid: false,
      error: 'Архив пуст',
    });
  });
});
