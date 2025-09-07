import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrderService } from '../order/order.service';
import { MenuItemService } from '../menu-item/menu-item.service';
import { UserService } from '../user/user.service';
import { PaymentService } from '../payment/payment.service';
import { Order, OrderDocument } from '../order/schemas/order.schema';
import { User, UserDocument } from '../user/schemas/user.schema';
import { Payment, PaymentDocument } from '../payment/schemas/payment.schema';
import { OrderStatus } from '../order/schemas/order.schema';
import {
  startOfDay,
  endOfDay,
  format,
  subDays,
  subWeeks,
  subMonths,
  parseISO,
  startOfWeek,
  startOfMonth,
  endOfWeek,
  endOfMonth,
} from 'date-fns';

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly orderService: OrderService,
    private readonly menuItemService: MenuItemService,
    private readonly userService: UserService,
    private readonly paymentService: PaymentService,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>
  ) {}

  private parsePeriod(period?: string, startDate?: string, endDate?: string) {
    let start: Date;
    let end: Date = new Date();

    if (period === 'custom' && startDate && endDate) {
      start = parseISO(startDate);
      end = parseISO(endDate);
    } else {
      // Default periods
      switch (period) {
        case '7d':
          start = subDays(end, 7);
          break;
        case '30d':
        default:
          start = subDays(end, 30);
          break;
        case '90d':
          start = subDays(end, 90);
          break;
        case '1y':
          start = subDays(end, 365);
          break;
      }
    }

    return {
      start: startOfDay(start),
      end: endOfDay(end),
    };
  }

  async getTodayStats() {
    const today = new Date();
    const orders = await this.orderService.findOrdersInPeriod(
      startOfDay(today),
      endOfDay(today)
    );
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce(
      (sum, order) => sum + order.totalPrice,
      0
    );

    return { totalOrders, totalRevenue };
  }

  async getWeeklyTrends() {
    const today = new Date();
    const dailyStats = [];
    for (let i = 0; i < 7; i++) {
      const day = subDays(today, i);
      const orders = await this.orderService.findOrdersInPeriod(
        startOfDay(day),
        endOfDay(day)
      );
      const totalOrders = orders.length;
      const totalRevenue = orders.reduce(
        (sum, order) => sum + order.totalPrice,
        0
      );
      dailyStats.push({
        date: format(day, 'yyyy-MM-dd'),
        totalOrders,
        totalRevenue,
      } as never);
    }
    return dailyStats.reverse();
  }

  // Revenue Analytics
  async getRevenueStats(period?: string, startDate?: string, endDate?: string) {
    const { start, end } = this.parsePeriod(period, startDate, endDate);

    // Current period stats
    const [currentStats] = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: OrderStatus.SERVED, // Only count served orders for revenue
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    // Previous period for comparison
    const periodLength = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodLength);
    const prevEnd = new Date(end.getTime() - periodLength);

    const [previousStats] = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: prevStart, $lte: prevEnd },
          status: OrderStatus.SERVED,
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalPrice' },
          totalOrders: { $sum: 1 },
        },
      },
    ]);

    const current = currentStats || { totalRevenue: 0, totalOrders: 0 };
    const previous = previousStats || { totalRevenue: 0, totalOrders: 0 };

    const averageOrderValue =
      current.totalOrders > 0 ? current.totalRevenue / current.totalOrders : 0;

    // Calculate growth percentages
    const revenueGrowth =
      previous.totalRevenue > 0
        ? ((current.totalRevenue - previous.totalRevenue) /
            previous.totalRevenue) *
          100
        : 0;

    const ordersGrowth =
      previous.totalOrders > 0
        ? ((current.totalOrders - previous.totalOrders) /
            previous.totalOrders) *
          100
        : 0;

    return {
      data: {
        totalRevenue: current.totalRevenue,
        totalOrders: current.totalOrders,
        averageOrderValue,
        growth: {
          revenue: Math.round(revenueGrowth * 100) / 100,
          orders: Math.round(ordersGrowth * 100) / 100,
        },
        periodComparison: {
          current: current.totalRevenue,
          previous: previous.totalRevenue,
          change: Math.round(revenueGrowth * 100) / 100,
        },
      },
    };
  }

  async getRevenueChart(
    period?: string,
    groupBy: 'day' | 'week' | 'month' = 'day',
    startDate?: string,
    endDate?: string
  ) {
    const { start, end } = this.parsePeriod(period, startDate, endDate);

    let dateFormat: string;
    let groupFormat: any;

    switch (groupBy) {
      case 'week':
        dateFormat = '%Y-%u'; // Year-Week
        groupFormat = {
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' },
        };
        break;
      case 'month':
        dateFormat = '%Y-%m'; // Year-Month
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        };
        break;
      case 'day':
      default:
        dateFormat = '%Y-%m-%d'; // Year-Month-Day
        groupFormat = {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        };
        break;
    }

    const chartData = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: OrderStatus.SERVED,
        },
      },
      {
        $group: {
          _id: groupFormat,
          revenue: { $sum: '$totalPrice' },
          orders: { $sum: 1 },
        },
      },
      {
        $addFields: {
          date: {
            $dateToString: {
              format: dateFormat,
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: '$_id.day',
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: 1,
          revenue: 1,
          orders: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    return { data: chartData };
  }

  // Menu Items Analytics
  async getTopSellingItems(
    period?: string,
    limit = 10,
    startDate?: string,
    endDate?: string
  ) {
    const { start, end } = this.parsePeriod(period, startDate, endDate);

    const topItems = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
          status: OrderStatus.SERVED,
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.item',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.subtotal' },
        },
      },
      {
        $lookup: {
          from: 'menuitems',
          localField: '_id',
          foreignField: '_id',
          as: 'menuItem',
        },
      },
      { $unwind: '$menuItem' },
      {
        $project: {
          _id: 1,
          name: '$menuItem.name',
          category: '$menuItem.category',
          totalSold: 1,
          totalRevenue: 1,
          image: { $arrayElemAt: ['$menuItem.images', 0] },
        },
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
    ]);

    return { data: topItems };
  }

  // Orders Analytics
  async getOrderAnalytics(
    period?: string,
    startDate?: string,
    endDate?: string
  ) {
    const { start, end } = this.parsePeriod(period, startDate, endDate);

    const [orderStats] = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$status', OrderStatus.PENDING] }, 1, 0] },
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', OrderStatus.SERVED] }, 1, 0] },
          },
          cancelledOrders: {
            $sum: {
              $cond: [{ $eq: ['$status', OrderStatus.CANCELLED] }, 1, 0],
            },
          },
        },
      },
    ]);

    // Status distribution
    const statusDistribution = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Daily orders trend
    const dailyOrders = await this.orderModel.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $addFields: {
          date: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: {
                $dateFromParts: {
                  year: '$_id.year',
                  month: '$_id.month',
                  day: '$_id.day',
                },
              },
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          date: 1,
          count: 1,
        },
      },
      { $sort: { date: 1 } },
    ]);

    const stats = orderStats || {
      totalOrders: 0,
      pendingOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
    };

    // Calculate percentages for status distribution
    const statusDistributionWithPercentages = statusDistribution.map(
      (status) => ({
        status: status._id,
        count: status.count,
        percentage:
          stats.totalOrders > 0
            ? Math.round((status.count / stats.totalOrders) * 100 * 100) / 100
            : 0,
      })
    );

    return {
      data: {
        ...stats,
        statusDistribution: statusDistributionWithPercentages,
        dailyOrders,
      },
    };
  }

  // Customer Analytics
  async getCustomerAnalytics(
    period?: string,
    startDate?: string,
    endDate?: string
  ) {
    const { start, end } = this.parsePeriod(period, startDate, endDate);

    // Current period customer stats
    const totalCustomers = await this.userModel.countDocuments();
    const newCustomers = await this.userModel.countDocuments({
      createdAt: { $gte: start, $lte: end },
    });

    // Previous period for comparison
    const periodLength = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - periodLength);
    const prevEnd = new Date(end.getTime() - periodLength);

    const prevTotalCustomers = await this.userModel.countDocuments({
      createdAt: { $lte: prevEnd },
    });

    const returningCustomers = totalCustomers - newCustomers;

    // Calculate growth
    const customerGrowth =
      prevTotalCustomers > 0
        ? ((totalCustomers - prevTotalCustomers) / prevTotalCustomers) * 100
        : 0;

    return {
      data: {
        totalCustomers,
        newCustomers,
        returningCustomers,
        customerGrowth: {
          current: totalCustomers,
          previous: prevTotalCustomers,
          change: Math.round(customerGrowth * 100) / 100,
        },
      },
    };
  }
}
