import { createParamDecorator, type ExecutionContext, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import type { User } from '@supabase/supabase-js'

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): User => {
  const request = context.switchToHttp().getRequest<Request & { user?: User }>()
  if (!request.user) throw new UnauthorizedException('Usuário autenticado não encontrado.')
  return request.user
})
