import { Controller, Get, Query } from '@nestjs/common';
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

  // Revenue Analytics Endpoints
  @Get('revenue/stats')
  async getRevenueStats(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getRevenueStats(period, startDate, endDate);
  }

  @Get('revenue/chart')
  async getRevenueChart(
    @Query('period') period?: string,
    @Query('groupBy') groupBy?: 'day' | 'week' | 'month',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getRevenueChart(period, groupBy, startDate, endDate);
  }

  // Menu Items Analytics Endpoints
  @Get('menu-items/top-selling')
  async getTopSellingItems(
    @Query('period') period?: string,
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.analyticsService.getTopSellingItems(period, limitNum, startDate, endDate);
  }

  // Orders Analytics Endpoints
  @Get('orders/stats')
  async getOrderAnalytics(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getOrderAnalytics(period, startDate, endDate);
  }

  // Customers Analytics Endpoints
  @Get('customers/stats')
  async getCustomerAnalytics(
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.analyticsService.getCustomerAnalytics(period, startDate, endDate);
  }
}
