import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Permission } from '../auth/decoration/setMetadata';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // @Permission('analytics:getTodayStats')
  @Get('today')
  async getTodayStats() {
    return this.analyticsService.getTodayStats();
  }

  // @Permission('analytics:getWeeklyTrends')
  @Get('weekly-trends')
  async getWeeklyTrends() {
    return this.analyticsService.getWeeklyTrends();
  }
}
