import { Injectable } from '@nestjs/common';
import { OrderService } from '../order/order.service';
import { MenuItemService } from '../menu-item/menu-item.service';
import { startOfDay, endOfDay, format, subDays } from 'date-fns';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly orderService: OrderService,
    private readonly menuItemService: MenuItemService,
  ) {}

  async getTodayStats() {
    const today = new Date();
    const orders = await this.orderService.findOrdersInPeriod(startOfDay(today), endOfDay(today));
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);

    return { totalOrders, totalRevenue };
  }

  async getWeeklyTrends() {
    const today = new Date();
    const dailyStats = [];
    for (let i = 0; i < 7; i++) {
      const day = subDays(today, i);
      const orders = await this.orderService.findOrdersInPeriod(startOfDay(day), endOfDay(day));
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + order.totalPrice, 0);
      dailyStats.push({ date: format(day, 'yyyy-MM-dd'), totalOrders, totalRevenue } as never);
    }
    return dailyStats.reverse();
  }
}

