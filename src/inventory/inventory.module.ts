import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { Ingredient, IngredientSchema } from './schemas/ingredient.schema';
import { StockMovement, StockMovementSchema } from './schemas/stock-movement.schema';
import { MenuItemIngredient, MenuItemIngredientSchema } from './schemas/menu-item-ingredient.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ingredient.name, schema: IngredientSchema },
      { name: StockMovement.name, schema: StockMovementSchema },
      { name: MenuItemIngredient.name, schema: MenuItemIngredientSchema },
    ]),
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

