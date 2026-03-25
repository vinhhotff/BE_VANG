// payment.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/pay-ment.schema';
import { PaymentController } from './pay-ment.controller';
import { PayOSController } from './payos.controller';
import { PayMentService } from './pay-ment.service';
import { OrderModule } from 'src/order/order.module';
import { InventoryModule } from '../inventory/inventory.module';
import { MenuItemIngredient, MenuItemIngredientSchema } from '../inventory/schemas/menu-item-ingredient.schema';
import { Ingredient, IngredientSchema } from '../inventory/schemas/ingredient.schema';
import { MenuItem, MenuItemSchema } from '../menu-item/schemas/menu-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Payment.name, schema: PaymentSchema },
      { name: MenuItemIngredient.name, schema: MenuItemIngredientSchema },
      { name: Ingredient.name, schema: IngredientSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
    ]),
    OrderModule,
    InventoryModule,
  ],
  controllers: [PaymentController, PayOSController],
  providers: [PayMentService],
  exports: [PayMentService, PayMentModule],
})
export class PayMentModule {}
