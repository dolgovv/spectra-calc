import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { StorageService } from './storage.service';
import type { AppConfig } from '../config/configuration';

@Injectable()
export class LocalStorageService extends StorageService {
  private readonly root: string;
  private readonly publicBaseUrl: string;

  constructor(config: ConfigService<AppConfig, true>) {
    super();
    this.root = config.get('storageRoot', { infer: true });
    this.publicBaseUrl = config.get('publicBaseUrl', { infer: true });
  }

  async save(jobId: string, name: string, data: Buffer | string): Promise<void> {
    const dir = join(this.root, jobId);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, name), data);
  }

  publicUrl(jobId: string, name: string): string {
    return `${this.publicBaseUrl}/files/${jobId}/${name}`;
  }
}
