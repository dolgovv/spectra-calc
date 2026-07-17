/** Outcome of one sweep. Returned as data so the caller owns the logging and this stays pure I/O. */
export interface PruneResult {
  /** Job directories deleted. */
  removed: number;
  /** Job directories left behind — multiply by ~1.1 MB for a disk estimate. */
  remaining: number;
  /**
   * Entries that did not look like a job directory and were left alone. A climbing `skipped`
   * next to `removed: 0` is the signal that the id scheme drifted away from what prune matches.
   */
  skipped: number;
  /** Directories whose removal threw. Already reported per-directory; never fatal. */
  failed: number;
}

/**
 * Storage abstraction (DI token). LocalStorageService writes to the filesystem now;
 * an S3StorageService can be swapped in later without touching callers.
 */
export abstract class StorageService {
  /** Persists one artifact under a job namespace. */
  abstract save(jobId: string, name: string, data: Buffer | string): Promise<void>;

  /** Public URL at which a saved artifact is served. */
  abstract publicUrl(jobId: string, name: string): string;

  /**
   * Deletes job artifacts older than `maxAgeMs`, bounding disk use at
   * `jobs_per_hour × (ttl + sweep_interval) × artifact_size`.
   * Implementations own the enumeration and deletion; an S3 backend would legitimately do
   * nothing here and let a lifecycle policy expire objects instead.
   */
  abstract prune(maxAgeMs: number): Promise<PruneResult>;
}
