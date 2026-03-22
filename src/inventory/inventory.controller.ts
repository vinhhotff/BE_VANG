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
import { CheckInventoryAvailabilityDto, ReserveInventoryDto, ReleaseInventoryDto, BulkReserveInventoryDto, CheckMultipleItemsAvailabilityDto } from './dto/inventory-check.dto';
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

  // ========== D-Day Inventory Management Endpoints ==========

  /**
   * Check availability for a single menu item on a specific date
   */
  @Get('check-availability')
  checkAvailability(
    @Query('menuItemId') menuItemId: string,
    @Query('date') date: string,
    @Query('quantity') quantity: string,
  ) {
    return this.inventoryService.checkAvailability(menuItemId, date, +quantity);
  }

  /**
   * Check availability for multiple items
   */
  @Post('check-multiple-availability')
  checkMultipleItemsAvailability(@Body() dto: CheckMultipleItemsAvailabilityDto) {
    return this.inventoryService.checkMultipleItemsAvailability(dto.items);
  }

  /**
   * Reserve inventory (pending)
   */
  @Post('reserve')
  reserveInventory(@Body() dto: ReserveInventoryDto) {
    return this.inventoryService.reserveInventory(dto.menuItemId, dto.date, dto.quantity, dto.orderId);
  }

  /**
   * Release pending inventory reservation
   */
  @Post('release')
  releaseInventory(@Body() dto: ReleaseInventoryDto) {
    return this.inventoryService.releaseInventory(dto.menuItemId, dto.date, dto.quantity, dto.orderId);
  }

  /**
   * Confirm reservation (after payment)
   */
  @Post('confirm')
  confirmReservation(
    @Query('menuItemId') menuItemId: string,
    @Query('date') date: string,
    @Query('quantity') quantity: string,
  ) {
    return this.inventoryService.confirmReservation(menuItemId, date, +quantity);
  }

  /**
   * Cancel confirmed reservation
   */
  @Post('cancel-confirmed')
  cancelConfirmedReservation(
    @Query('menuItemId') menuItemId: string,
    @Query('date') date: string,
    @Query('quantity') quantity: string,
  ) {
    return this.inventoryService.cancelConfirmedReservation(menuItemId, date, +quantity);
  }

  /**
   * Bulk reserve inventory
   */
  @Post('bulk-reserve')
  bulkReserveInventory(@Body() dto: BulkReserveInventoryDto) {
    return this.inventoryService.bulkReserveInventory(dto.items, dto.date, dto.orderId);
  }

  /**
   * Get available quantity for a date
   */
  @Get('available-quantity')
  getAvailableQuantity(
    @Query('menuItemId') menuItemId: string,
    @Query('date') date: string,
  ) {
    return this.inventoryService.getAvailableQuantity(menuItemId, date);
  }

  /**
   * Get daily reservation info
   */
  @Get('daily-reservation')
  getDailyReservationInfo(
    @Query('menuItemId') menuItemId: string,
    @Query('date') date: string,
  ) {
    return this.inventoryService.getDailyReservationInfo(menuItemId, date);
  }

  /**
   * Get reservations for a date range
   */
  @Get('reservations/range')
  getReservationsInRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.inventoryService.getReservationsInRange(startDate, endDate);
  }
}

