import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import IntervalNumberInputs from './IntervalNumberInputs';

function commit(label: string, raw: string): void {
  const input = screen.getByLabelText(new RegExp(label));
  fireEvent.change(input, { target: { value: raw } });
  fireEvent.blur(input);
}

describe('IntervalNumberInputs', () => {
  function setup() {
    const onChange = vi.fn();
    render(
      <IntervalNumberInputs
        min={200}
        max={3000}
        value={{ from: 580, to: 650 }}
        onChange={onChange}
      />,
    );
    return onChange;
  }

  it('commits a new lower bound on blur', () => {
    const onChange = setup();

    commit('От', '600');

    expect(onChange).toHaveBeenCalledWith({ from: 600, to: 650 });
  });

  it('commits a new upper bound on blur', () => {
    const onChange = setup();

    commit('До', '700');

    expect(onChange).toHaveBeenCalledWith({ from: 580, to: 700 });
  });

  it('does not let the bounds cross', () => {
    const onChange = setup();

    commit('От', '900');
    expect(onChange).toHaveBeenLastCalledWith({ from: 649, to: 650 });

    commit('До', '100');
    expect(onChange).toHaveBeenLastCalledWith({ from: 580, to: 581 });
  });

  it('clamps to the scale', () => {
    const onChange = setup();

    commit('От', '50');
    expect(onChange).toHaveBeenLastCalledWith({ from: 200, to: 650 });

    commit('До', '5000');
    expect(onChange).toHaveBeenLastCalledWith({ from: 580, to: 3000 });
  });

  it('resets an emptied field to the edge of the scale', () => {
    const onChange = setup();

    commit('От', '');
    expect(onChange).toHaveBeenLastCalledWith({ from: 200, to: 650 });

    commit('До', '');
    expect(onChange).toHaveBeenLastCalledWith({ from: 580, to: 3000 });
  });
});
