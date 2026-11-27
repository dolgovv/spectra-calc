import { StorageSweeperService } from './storage-sweeper.service';
import type { PruneResult, StorageService } from './storage.service';
import { fakeConfig } from '../../test/helpers/spectra-zip';

const NOTHING: PruneResult = { removed: 0, remaining: 0, skipped: 0, failed: 0 };
const TTL_MS = 3_600_000;
const INTERVAL_MS = 60_000;

describe('StorageSweeperService', () => {
  let prune: jest.Mock<Promise<PruneResult>, [number]>;
  let sweeper: StorageSweeperService;

  function createSweeper(storageTtlMs: number): StorageSweeperService {
    return new StorageSweeperService(
      { prune } as unknown as StorageService,
      fakeConfig({ storageTtlMs, storageSweepIntervalMs: INTERVAL_MS }),
    );
  }

  beforeEach(() => {
    jest.useFakeTimers();
    prune = jest.fn<Promise<PruneResult>, [number]>(async () => NOTHING);
    sweeper = createSweeper(TTL_MS);
  });

  afterEach(() => {
    sweeper.onModuleDestroy();
    jest.useRealTimers();
  });

  it('sweeps on startup and then on every interval, passing the TTL', async () => {
    sweeper.onModuleInit();
    await jest.advanceTimersByTimeAsync(0);
    expect(prune).toHaveBeenCalledTimes(1);
    expect(prune).toHaveBeenCalledWith(TTL_MS);

    await jest.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(prune).toHaveBeenCalledTimes(2);
  });

  it('does nothing when the TTL is 0', async () => {
    sweeper = createSweeper(0);

    sweeper.onModuleInit();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS * 3);

    expect(prune).not.toHaveBeenCalled();
  });

  it('stops sweeping once destroyed', async () => {
    sweeper.onModuleInit();
    await jest.advanceTimersByTimeAsync(0);

    sweeper.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS * 3);

    expect(prune).toHaveBeenCalledTimes(1);
  });

  it('survives a failing sweep and tries again on the next tick', async () => {
    prune.mockRejectedValueOnce(new Error('EACCES'));

    sweeper.onModuleInit();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS);

    expect(prune).toHaveBeenCalledTimes(2);
  });

  it('skips a tick while the previous sweep is still running', async () => {
    let finish!: (result: PruneResult) => void;
    prune.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));

    sweeper.onModuleInit();
    await jest.advanceTimersByTimeAsync(INTERVAL_MS * 2);
    expect(prune).toHaveBeenCalledTimes(1);

    finish(NOTHING);
    await jest.advanceTimersByTimeAsync(INTERVAL_MS);
    expect(prune).toHaveBeenCalledTimes(2);
  });
});
