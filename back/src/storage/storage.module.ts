import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalStorageService } from './local-storage.service';
import { StorageSweeperService } from './storage-sweeper.service';

@Module({
  // The sweeper is a provider but not exported: nothing calls it, it runs on its own timer.
  providers: [{ provide: StorageService, useClass: LocalStorageService }, StorageSweeperService],
  exports: [StorageService],
})
export class StorageModule {}
