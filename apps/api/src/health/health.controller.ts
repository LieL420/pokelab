import { Controller, Get } from '@nestjs/common'
import { getHealthResponse } from './health.contract'

@Controller('health')
export class HealthController {
  @Get()
  getHealth() {
    return getHealthResponse()
  }
}
