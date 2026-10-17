import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly pool: Pool
  private readonly hasDatabaseUrl: boolean

  constructor(config: ConfigService) {
    const databaseUrl = config.get<string>('DATABASE_URL')
    const pool = new Pool({ connectionString: databaseUrl ?? 'postgresql://localhost:5432/pokelab' })
    super({ adapter: new PrismaPg(pool) })
    this.pool = pool
    this.hasDatabaseUrl = Boolean(databaseUrl)
  }

  async onModuleInit() {
    if (this.hasDatabaseUrl && process.env.NODE_ENV !== 'test') await this.$connect()
  }

  async onModuleDestroy() {
    await this.$disconnect()
    await this.pool.end()
  }
}
