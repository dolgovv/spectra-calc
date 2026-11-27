import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminAuthService, readSessionCookie } from './admin-auth.service';

export const ADMIN_DISABLED_MESSAGE = 'Админка отключена: на сервере не задан ADMIN_PASSWORD';

/** 404 while the admin is not configured at all, 401 without a valid session. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}

  canActivate(context: ExecutionContext): boolean {
    if (!this.auth.enabled) throw new NotFoundException(ADMIN_DISABLED_MESSAGE);
    const req = context.switchToHttp().getRequest<Request>();
    if (!this.auth.verifySession(readSessionCookie(req))) {
      throw new UnauthorizedException('Требуется вход');
    }
    return true;
  }
}
