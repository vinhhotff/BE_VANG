import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { MenuItem, MenuItemSchema } from '../menu-item/schemas/menu-item.schema';
import { Guest, GuestSchema } from '../guest/schemas/guest.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { LoyaltyModule } from '../loyalty/loyalty.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Guest.name, schema: GuestSchema },
      { name: User.name, schema: UserSchema },
    ]),
    LoyaltyModule, // Import LoyaltyModule để sử dụng LoyaltyService
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderModule,MongooseModule,OrderService],
})
export class OrderModule {}
