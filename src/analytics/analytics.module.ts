import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { OrderModule } from '../order/order.module';
import { MenuItemModule } from '../menu-item/menu-item.module';
import { UserModule } from '../user/user.module';
import { PaymentModule } from '../payment/payment.module';
import { Payment, PaymentSchema } from '../payment/schemas/payment.schema';
import { Order, OrderSchema } from '../order/schemas/order.schema';
import { User, UserSchema } from '../user/schemas/user.schema';

@Module({
  imports: [
    OrderModule,
    MenuItemModule,
    UserModule,
    PaymentModule,
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
