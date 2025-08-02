import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('today')
  async getTodayStats() {
    return this.analyticsService.getTodayStats();
  }

  @Get('weekly-trends')
  async getWeeklyTrends() {
    return this.analyticsService.getWeeklyTrends();
  }
}
