import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateIngredientDto, UpdateIngredientDto } from './dto/create-ingredient.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateMenuItemIngredientDto, UpdateMenuItemIngredientDto } from './dto/create-menu-item-ingredient.dto';
import { Permission, User } from '../auth/decoration/setMetadata';
import { IUser } from '../user/user.interface';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // ========== Ingredient Endpoints ==========
  @Permission('inventory:create')
  @Post('ingredients')
  createIngredient(@Body() createIngredientDto: CreateIngredientDto, @User() user: IUser) {
    return this.inventoryService.createIngredient(createIngredientDto, user);
  }

  @Permission('inventory:read')
  @Get('ingredients')
  findAllIngredients() {
    return this.inventoryService.findAllIngredients();
  }

  @Permission('inventory:read')
  @Get('ingredients/low-stock')
  getLowStockIngredients() {
    return this.inventoryService.getLowStockIngredients();
  }

  @Permission('inventory:read')
  @Get('ingredients/alerts')
  getInventoryAlerts() {
    return this.inventoryService.getInventoryAlerts();
  }

  @Permission('inventory:read')
  @Get('ingredients/:id')
  findIngredientById(@Param('id') id: string) {
    return this.inventoryService.findIngredientById(id);
  }

  @Permission('inventory:update')
  @Patch('ingredients/:id')
  updateIngredient(
    @Param('id') id: string,
    @Body() updateIngredientDto: UpdateIngredientDto,
    @User() user: IUser,
  ) {
    return this.inventoryService.updateIngredient(id, updateIngredientDto, user);
  }

  @Permission('inventory:delete')
  @Delete('ingredients/:id')
  deleteIngredient(@Param('id') id: string, @User() user: IUser) {
    return this.inventoryService.deleteIngredient(id, user);
  }

  // ========== Stock Movement Endpoints ==========
  @Permission('inventory:create')
  @Post('movements')
  createStockMovement(@Body() createStockMovementDto: CreateStockMovementDto, @User() user: IUser) {
    return this.inventoryService.createStockMovement(createStockMovementDto, user);
  }

  @Permission('inventory:read')
  @Get('movements')
  getStockMovements(
    @Query('ingredientId') ingredientId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.inventoryService.getStockMovements(ingredientId, +page, +limit);
  }

  // ========== Menu Item Ingredient Endpoints ==========
  @Permission('inventory:create')
  @Post('menu-item-ingredients')
  linkIngredientToMenuItem(@Body() dto: CreateMenuItemIngredientDto, @User() user: IUser) {
    return this.inventoryService.linkIngredientToMenuItem(dto, user);
  }

  @Permission('inventory:read')
  @Get('menu-item-ingredients/menu-item/:menuItemId')
  getIngredientsByMenuItem(@Param('menuItemId') menuItemId: string) {
    return this.inventoryService.getIngredientsByMenuItem(menuItemId);
  }

  @Permission('inventory:update')
  @Patch('menu-item-ingredients/:id')
  updateMenuItemIngredient(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemIngredientDto,
    @User() user: IUser,
  ) {
    return this.inventoryService.updateMenuItemIngredient(id, dto, user);
  }

  @Permission('inventory:delete')
  @Delete('menu-item-ingredients/:id')
  removeMenuItemIngredient(@Param('id') id: string) {
    return this.inventoryService.removeMenuItemIngredient(id);
  }
}

