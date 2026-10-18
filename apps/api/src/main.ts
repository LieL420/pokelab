import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import type { NestExpressApplication } from '@nestjs/platform-express'
import type { NextFunction, Request, Response } from 'express'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const config = app.get(ConfigService)
  app.disable('x-powered-by')
  app.use((request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'")
    response.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=()')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('X-Frame-Options', 'DENY')
    if (/^\/api\/v1\/(?:auth|teams|ai)(?:\/|$)/.test(request.path)) response.setHeader('Cache-Control', 'no-store')
    next()
  })
  app.setGlobalPrefix('api')
  app.set('trust proxy', 1)
  const configuredOrigins = config
    .get<string>('WEB_ORIGIN', 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean)
  const allowedOrigins = new Set([...configuredOrigins, 'http://localhost:5173', 'http://127.0.0.1:5173'])
  app.enableCors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin.replace(/\/$/, ''))) return callback(null, true)
      return callback(new Error('Origin não permitida pelo CORS.'), false)
    },
    credentials: true,
  })
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  app.useGlobalFilters(new HttpExceptionFilter())
  const port = config.get<number>('PORT') ?? config.get<number>('API_PORT', 3000)
  await app.listen(port, '0.0.0.0')
}

void bootstrap()
