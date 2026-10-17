import { ExecutionContext, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import { SupabaseAuthGuard } from './supabase-auth.guard'

function contextFor(headers: Record<string, string>): ExecutionContext {
  const request = { header: (name: string) => headers[name.toLowerCase()] } as Request
  return { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext
}

describe('SupabaseAuthGuard', () => {
  it('rejects requests without a Bearer token', async () => {
    const service = { verifyAccessToken: jest.fn() }
    const guard = new SupabaseAuthGuard(service as never)

    await expect(guard.canActivate(contextFor({}))).rejects.toBeInstanceOf(UnauthorizedException)
    expect(service.verifyAccessToken).not.toHaveBeenCalled()
  })

  it('validates the token and attaches the authenticated user', async () => {
    const user = { id: 'user-1', email: 'user@example.com' }
    const service = { verifyAccessToken: jest.fn().mockResolvedValue(user) }
    const guard = new SupabaseAuthGuard(service as never)
    const context = contextFor({ authorization: 'Bearer access-token' })

    await expect(guard.canActivate(context)).resolves.toBe(true)
    expect(service.verifyAccessToken).toHaveBeenCalledWith('access-token')
    expect((context.switchToHttp().getRequest() as Request & { user?: unknown }).user).toEqual(user)
  })
})
