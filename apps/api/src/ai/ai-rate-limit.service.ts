import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class AiRateLimitService {
  private readonly entries = new Map<string, number[]>()
  private readonly maxRequests: number
  constructor(config: ConfigService) { this.maxRequests = config.get<number>('AI_REQUESTS_PER_MINUTE', 6) }
  assertAllowed(key: string) {
    const now = Date.now()
    const timestamps = (this.entries.get(key) ?? []).filter((timestamp) => now - timestamp < 60_000)
    if (timestamps.length >= this.maxRequests) throw new HttpException('Limite de uso da IA atingido. Tente novamente em alguns segundos.', HttpStatus.TOO_MANY_REQUESTS)
    timestamps.push(now)
    this.entries.set(key, timestamps)
    if (this.entries.size > 10_000) {
      for (const [entryKey, values] of this.entries) {
        if (values.every((timestamp) => now - timestamp >= 60_000)) this.entries.delete(entryKey)
      }
    }
  }
}
