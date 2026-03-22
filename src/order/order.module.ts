import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { MenuItem, MenuItemSchema } from '../menu-item/schemas/menu-item.schema';
import { Guest, GuestSchema } from '../guest/schemas/guest.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { LoyaltyModule } from '../loyalty/loyalty.module';
import { DeliveryModule } from '../delivery/delivery.module';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationModule } from '../notification/notification.module';
import { MenuItemModule } from '../menu-item/menu-item.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
      { name: Guest.name, schema: GuestSchema },
      { name: User.name, schema: UserSchema },
    ]),
    LoyaltyModule,
    DeliveryModule,
    InventoryModule,
    NotificationModule,
    MenuItemModule,
  ],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderModule, MongooseModule, OrderService],
})
export class OrderModule {}
