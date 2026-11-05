import { describe, expect, it } from 'vitest';
import { loadResultData } from './loadResultData';
import { saveResultToSession } from '../../../lib/resultStorage';
import { EXAMPLE_RESULT } from '../../example/exampleResult';

describe('loadResultData', () => {
  it('prefers the result passed through the router', () => {
    saveResultToSession({ ...EXAMPLE_RESULT, id: 'stale' });

    expect(loadResultData({ result: EXAMPLE_RESULT })?.id).toBe(EXAMPLE_RESULT.id);
  });

  it('falls back to the session after a hard refresh', () => {
    saveResultToSession(EXAMPLE_RESULT);

    expect(loadResultData(null)?.id).toBe(EXAMPLE_RESULT.id);
  });

  it('falls back to the session when the router state is malformed', () => {
    saveResultToSession(EXAMPLE_RESULT);

    expect(loadResultData({ result: { id: 'broken' } })?.id).toBe(EXAMPLE_RESULT.id);
  });

  it('returns null when there is nothing to show', () => {
    expect(loadResultData(null)).toBeNull();
    expect(loadResultData({ result: { id: 'broken' } })).toBeNull();
  });
});
