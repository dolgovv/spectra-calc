/**
 * Storage abstraction (DI token). LocalStorageService writes to the filesystem now;
 * an S3StorageService can be swapped in later without touching callers.
 */
export abstract class StorageService {
  /** Persists one artifact under a job namespace. */
  abstract save(jobId: string, name: string, data: Buffer | string): Promise<void>;

  /** Public URL at which a saved artifact is served. */
  abstract publicUrl(jobId: string, name: string): string;
}
