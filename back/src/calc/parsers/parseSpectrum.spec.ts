import { parseSpectrum } from './parseSpectrum';

describe('parseSpectrum', () => {
  it('reads two whitespace-separated columns', () => {
    const spectrum = parseSpectrum('1.esp', '100.5 10\n200.5\t20\n300.5   30');

    expect(spectrum).toEqual({
      name: '1.esp',
      wavenumbers: [100.5, 200.5, 300.5],
      intensities: [10, 20, 30],
    });
  });

  it('handles CRLF line endings, as the instrument writes them', () => {
    const { wavenumbers } = parseSpectrum('1.esp', '133.556059 24922.17\r\n135.212175 25139.54\r\n');

    expect(wavenumbers).toEqual([133.556059, 135.212175]);
  });

  it('skips comments, blank lines, headers and single-column lines', () => {
    const text = ['# comment', '', 'wavenumber intensity', '42', '100 10'].join('\n');

    const { wavenumbers, intensities } = parseSpectrum('1.esp', text);

    expect(wavenumbers).toEqual([100]);
    expect(intensities).toEqual([10]);
  });

  it('accepts a comma decimal separator', () => {
    const { wavenumbers, intensities } = parseSpectrum('1.esp', '4062,959929 1359,256098');

    expect(wavenumbers).toEqual([4062.959929]);
    expect(intensities).toEqual([1359.256098]);
  });

  it('returns empty arrays for a file with no data', () => {
    expect(parseSpectrum('1.esp', '')).toEqual({ name: '1.esp', wavenumbers: [], intensities: [] });
  });
});
