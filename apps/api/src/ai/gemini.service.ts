import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GoogleGenAI } from '@google/genai'
import { createHash } from 'node:crypto'
import { PROMPT_VERSION } from './ai.prompts'

export class AiResponseInvalidError extends Error {}

@Injectable()
export class GeminiService {
  private readonly client?: GoogleGenAI
  readonly model: string
  private readonly timeoutMs: number
  private readonly cacheTtlMs: number
  private readonly cache = new Map<string, { expiresAt: number; value: unknown }>()
  private readonly inFlight = new Map<string, Promise<unknown>>()

  constructor(config: ConfigService) {
    const key = config.get<string>('GEMINI_API_KEY')
    this.model = config.get<string>('GEMINI_MODEL', 'gemini-3.5-flash-lite')
    this.timeoutMs = config.get<number>('GEMINI_TIMEOUT_MS', 15000)
    this.cacheTtlMs = config.get<number>('AI_CACHE_TTL_MS', 300000)
    if (key) this.client = new GoogleGenAI({ apiKey: key })
  }

  isConfigured() { return Boolean(this.client) }
  get promptVersion() { return PROMPT_VERSION }

  async generate<T>(prompt: string, schema: Record<string, unknown>): Promise<T> {
    if (!this.client) throw new ServiceUnavailableException('A IA está temporariamente indisponível. Configure o Gemini no backend.')
    const cacheKey = createHash('sha256').update(this.model).update(prompt).update(JSON.stringify(schema)).digest('hex')
    const cached = this.cache.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) return cached.value as T
    if (cached) this.cache.delete(cacheKey)
    const pending = this.inFlight.get(cacheKey)
    if (pending) return pending as Promise<T>
    const request = this.generateUncached<T>(prompt, schema, cacheKey)
    this.inFlight.set(cacheKey, request)
    try { return await request }
    finally { if (this.inFlight.get(cacheKey) === request) this.inFlight.delete(cacheKey) }
  }

  private async generateUncached<T>(prompt: string, schema: Record<string, unknown>, cacheKey: string): Promise<T> {
    const request = this.client!.models.generateContent({ model: this.model, contents: prompt, config: { responseMimeType: 'application/json', responseSchema: schema as never, temperature: 0.2, maxOutputTokens: 1200 } })
    let response: Awaited<typeof request>
    let timeout: ReturnType<typeof setTimeout> | undefined
    try { response = await Promise.race([request, new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Gemini timeout')), this.timeoutMs) })]) }
    catch (error) {
      const message = error instanceof Error ? error.message : ''
      if (/429|resource_exhausted|quota/i.test(message)) throw new ServiceUnavailableException('A cota da IA foi atingida. Tente novamente mais tarde.')
      throw new ServiceUnavailableException('A IA está temporariamente indisponível. O Team Builder continua funcionando sem ela.')
    }
    finally { if (timeout) clearTimeout(timeout) }
    const text = response.text?.trim()
    if (!text) throw new AiResponseInvalidError('A IA retornou uma resposta vazia.')
    try {
      const parsed = JSON.parse(text) as T
      if (this.cacheTtlMs > 0) {
        if (this.cache.size >= 100) this.cache.delete(this.cache.keys().next().value as string)
        this.cache.set(cacheKey, { expiresAt: Date.now() + this.cacheTtlMs, value: parsed })
      }
      return parsed
    } catch { throw new AiResponseInvalidError('A IA retornou JSON inválido.') }
  }
}
