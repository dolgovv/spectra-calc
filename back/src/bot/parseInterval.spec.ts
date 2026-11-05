import { parseInterval } from './bot.service';

describe('parseInterval', () => {
  it.each(['590-625', '590 625', '590/625', '/calc 590 625', 'интервал 590 до 625', '590-625 см⁻¹'])(
    'reads %j as 590–625',
    (caption) => {
      expect(parseInterval(caption)).toEqual({ from: 590, to: 625 });
    },
  );

  it('orders the bounds', () => {
    expect(parseInterval('625-590')).toEqual({ from: 590, to: 625 });
  });

  it('keeps decimals', () => {
    expect(parseInterval('590.5-625.5')).toEqual({ from: 590.5, to: 625.5 });
  });

  it('uses only the first two numbers', () => {
    expect(parseInterval('590 625 700')).toEqual({ from: 590, to: 625 });
  });

  it.each([undefined, '', 'без чисел', '590', '600-600'])('rejects %j', (caption) => {
    expect(parseInterval(caption)).toBeNull();
  });
});
