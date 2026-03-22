import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { Ingredient, IngredientSchema } from './schemas/ingredient.schema';
import { StockMovement, StockMovementSchema } from './schemas/stock-movement.schema';
import { MenuItemIngredient, MenuItemIngredientSchema } from './schemas/menu-item-ingredient.schema';
import { DailyInventoryReservation, DailyInventoryReservationSchema } from './schemas/daily-inventory-reservation.schema';
import { MenuItem, MenuItemSchema } from '../menu-item/schemas/menu-item.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ingredient.name, schema: IngredientSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
      { name: MenuItemIngredient.name, schema: MenuItemIngredientSchema },
      { name: DailyInventoryReservation.name, schema: DailyInventoryReservationSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

