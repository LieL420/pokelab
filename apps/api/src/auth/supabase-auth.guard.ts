import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import { SupabaseAuthService } from './supabase-auth.service'

type AuthenticatedRequest = Request & { user?: Awaited<ReturnType<SupabaseAuthService['verifyAccessToken']>> }

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly authService: SupabaseAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const authorization = request.header('authorization')
    const [scheme, token] = authorization?.split(' ') ?? []

    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      throw new UnauthorizedException('É necessário enviar um Bearer token.')
    }

    request.user = await this.authService.verifyAccessToken(token)
    return true
  }
}
