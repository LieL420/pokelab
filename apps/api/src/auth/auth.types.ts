import type { User } from '@supabase/supabase-js'

export type AuthenticatedRequestUser = Pick<User, 'id' | 'email' | 'user_metadata' | 'app_metadata'>
