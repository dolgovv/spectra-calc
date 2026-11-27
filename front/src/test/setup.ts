import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

// jsdom has no canvas backend and logs "not implemented" on every call; the components already
// handle a missing context, so answer with one instead of filling the report with noise.
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(cleanup);
