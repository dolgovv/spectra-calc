import AdmZip from 'adm-zip';
import { extractSpectraFromZip } from './extractSpectraFromZip';

function zipOf(names: string[]): Buffer {
  const zip = new AdmZip();
  for (const name of names) zip.addFile(name, Buffer.from('100 10\n'));
  return zip.toBuffer();
}

describe('extractSpectraFromZip', () => {
  it('orders files by number, not lexicographically', () => {
    const spectra = extractSpectraFromZip(zipOf(['specs/10.esp', 'specs/2.esp', 'specs/1.esp']));

    expect(spectra.map((s) => s.name)).toEqual(['1.esp', '2.esp', '10.esp']);
  });

  it('ignores auxiliary files and folders', () => {
    const spectra = extractSpectraFromZip(
      zipOf(['specs/', 'specs/1.esp', 'points.dat', 'maps/590-625.dat', 'properties.properties']),
    );

    expect(spectra.map((s) => s.name)).toEqual(['1.esp']);
  });

  it.each(['1.esp', '1.txt', '1.asc', '1.csv', '1.ESP'])('accepts %s', (name) => {
    expect(extractSpectraFromZip(zipOf([name]))).toHaveLength(1);
  });

  it('puts numbered files before unnumbered ones', () => {
    const spectra = extractSpectraFromZip(zipOf(['a.txt', '5.txt']));

    expect(spectra.map((s) => s.name)).toEqual(['5.txt', 'a.txt']);
  });

  it('rejects a buffer that is not a zip', () => {
    expect(() => extractSpectraFromZip(Buffer.from('not a zip'))).toThrow(
      'Не удалось прочитать ZIP-архив',
    );
  });
});
