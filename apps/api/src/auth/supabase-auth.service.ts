import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'

@Injectable()
export class SupabaseAuthService {
  private readonly client: SupabaseClient | null

  constructor(private readonly config: ConfigService) {
    const url = this.config.get<string>('SUPABASE_URL')
    const key = this.config.get<string>('SUPABASE_ANON_KEY')

    if (!url || !key) {
      this.client = null
      return
    }

    this.client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
    })
  }

  async verifyAccessToken(accessToken: string): Promise<User> {
    if (!this.client) {
      throw new InternalServerErrorException('Supabase Auth não está configurado no backend.')
    }

    const { data, error } = await this.client.auth.getUser(accessToken)
    if (error || !data.user) {
      throw new UnauthorizedException('Token de autenticação inválido ou expirado.')
    }

    return data.user
  }
}
