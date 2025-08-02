import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { OrderModule } from '../order/order.module';
import { MenuItemModule } from '../menu-item/menu-item.module';

@Module({
  imports: [OrderModule, MenuItemModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
