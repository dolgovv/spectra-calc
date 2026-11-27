import { HttpStatus } from '@nestjs/common';
import { QueueFullException, QueueService } from './queue.service';
import { fakeConfig } from '../../test/helpers/spectra-zip';

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('QueueService', () => {
  const queue = (queueMax: number) => new QueueService(fakeConfig({ queueMax }));

  it('returns the result of the task', async () => {
    await expect(queue(1).run(async () => 42)).resolves.toBe(42);
  });

  it('rejects with 429 once the capacity is taken, without running the task', async () => {
    const service = queue(1);
    const gate = deferred();
    const running = service.run(() => gate.promise);
    const rejected = jest.fn();

    await expect(service.run(rejected)).rejects.toMatchObject({
      constructor: QueueFullException,
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
    expect(rejected).not.toHaveBeenCalled();

    gate.resolve();
    await running;
  });

  it('frees the slot once a task finishes', async () => {
    const service = queue(1);

    await service.run(async () => undefined);

    expect(service.pending).toBe(0);
    await expect(service.run(async () => 'next')).resolves.toBe('next');
  });

  it('frees the slot when a task fails', async () => {
    const service = queue(1);

    await expect(
      service.run(async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');

    expect(service.pending).toBe(0);
  });

  it('counts the tasks in flight', async () => {
    const service = queue(2);
    const gate = deferred();
    const running = [service.run(() => gate.promise), service.run(() => gate.promise)];

    expect(service.pending).toBe(2);
    expect(service.capacity).toBe(2);

    gate.resolve();
    await Promise.all(running);
    expect(service.pending).toBe(0);
  });
});
