import { Controller, Get, UseGuards } from '@nestjs/common'
import type { User } from '@supabase/supabase-js'
import { CurrentUser } from './current-user.decorator'
import { SupabaseAuthGuard } from './supabase-auth.guard'

@Controller('v1/auth')
export class AuthController {
  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  getCurrentUser(@CurrentUser() user: User) {
    return {
      data: {
        id: user.id,
        email: user.email ?? null,
        metadata: user.user_metadata,
      },
    }
  }
}
