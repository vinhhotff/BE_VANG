import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Ingredient, IngredientDocument } from './schemas/ingredient.schema';
import { StockMovement, StockMovementDocument, MovementType, MovementReason } from './schemas/stock-movement.schema';
import { MenuItemIngredient, MenuItemIngredientDocument } from './schemas/menu-item-ingredient.schema';
import { DailyInventoryReservation, DailyInventoryReservationDocument } from './schemas/daily-inventory-reservation.schema';
import { CreateIngredientDto, UpdateIngredientDto } from './dto/create-ingredient.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateMenuItemIngredientDto, UpdateMenuItemIngredientDto } from './dto/create-menu-item-ingredient.dto';
import { IUser } from '../user/user.interface';
import { CheckInventoryAvailabilityDto, ReserveInventoryDto, ReleaseInventoryDto, BulkReserveInventoryDto } from './dto/inventory-check.dto';
import { MenuItem } from '../menu-item/schemas/menu-item.schema';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Ingredient.name) private ingredientModel: Model<IngredientDocument>,
    @InjectModel(StockMovement.name) private stockMovementModel: Model<StockMovementDocument>,
    @InjectModel(MenuItemIngredient.name) private menuItemIngredientModel: Model<MenuItemIngredientDocument>,
    @InjectModel(DailyInventoryReservation.name) private dailyReservationModel: Model<DailyInventoryReservationDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItem>,
  ) {}

  // ========== Ingredient Methods ==========
  async createIngredient(createIngredientDto: CreateIngredientDto, user: IUser): Promise<Ingredient> {
    const ingredient = new this.ingredientModel({
      ...createIngredientDto,
      currentStock: createIngredientDto.currentStock || 0,
      createdBy: { _id: user._id, email: user.email },
      updatedBy: { _id: user._id, email: user.email },
    });
    return ingredient.save();
  }

  async findAllIngredients(): Promise<Ingredient[]> {
    return this.ingredientModel.find({ isDeleted: { $ne: true } }).exec();
  }

  async findIngredientById(id: string): Promise<Ingredient> {
    const ingredient = await this.ingredientModel.findById(id).exec();
    if (!ingredient || ingredient.isDeleted) {
      throw new NotFoundException(`Ingredient with ID ${id} not found`);
    }
    return ingredient;
  }

  async updateIngredient(id: string, updateIngredientDto: UpdateIngredientDto, user: IUser): Promise<IngredientDocument> {
    const ingredient = await this.ingredientModel.findById(id).exec();
    if (!ingredient || ingredient.isDeleted) {
      throw new NotFoundException(`Ingredient with ID ${id} not found`);
    }
    Object.assign(ingredient, {
      ...updateIngredientDto,
      updatedBy: { _id: user._id, email: user.email },
    });
    return ingredient.save();
  }

  async deleteIngredient(id: string, user: IUser): Promise<void> {
    await this.ingredientModel.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
      updatedBy: { _id: user._id, email: user.email },
    }).exec();
  }

  async getLowStockIngredients(): Promise<Ingredient[]> {
    return this.ingredientModel.find({
      isDeleted: { $ne: true },
      $expr: { $lte: ['$currentStock', '$minStock'] },
    }).exec();
  }

  // ========== Stock Movement Methods ==========
  async createStockMovement(createStockMovementDto: CreateStockMovementDto, user: IUser): Promise<StockMovement> {
    const ingredient = await this.ingredientModel.findById(createStockMovementDto.ingredient).exec();
    if (!ingredient || ingredient.isDeleted) {
      throw new NotFoundException(`Ingredient with ID ${createStockMovementDto.ingredient} not found`);
    }
    const stockBefore = ingredient.currentStock;

    let stockAfter: number;
    if (createStockMovementDto.type === MovementType.IN) {
      stockAfter = stockBefore + createStockMovementDto.quantity;
    } else if (createStockMovementDto.type === MovementType.OUT) {
      if (stockBefore < createStockMovementDto.quantity) {
        throw new BadRequestException('Insufficient stock');
      }
      stockAfter = stockBefore - createStockMovementDto.quantity;
    } else {
      // ADJUSTMENT or WASTE
      stockAfter = createStockMovementDto.quantity;
    }

    // Update ingredient stock
    ingredient.currentStock = stockAfter;
    const savedIngredient = await ingredient.save();

    // Create movement record
    const movement = new this.stockMovementModel({
      ...createStockMovementDto,
      ingredient: savedIngredient._id,
      stockBefore,
      stockAfter,
      totalCost: createStockMovementDto.totalCost || 
        (createStockMovementDto.unitPrice ? createStockMovementDto.unitPrice * createStockMovementDto.quantity : undefined),
      createdBy: { _id: user._id, email: user.email },
    });

    return movement.save();
  }

  async getStockMovements(
    ingredientId?: string,
    page: number = 1,
    limit: number = 50,
  ) {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: { $ne: true } };

    if (ingredientId) {
      query.ingredient = ingredientId;
    }

    const [movements, total] = await Promise.all([
      this.stockMovementModel
        .find(query)
        .populate('ingredient', 'name unit')
        .populate('order', 'orderNumber')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.stockMovementModel.countDocuments(query).exec(),
    ]);

    return {
      data: movements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ========== Menu Item Ingredient Methods ==========
  async linkIngredientToMenuItem(dto: CreateMenuItemIngredientDto, user: IUser): Promise<MenuItemIngredient> {
    // Check if link already exists
    const existing = await this.menuItemIngredientModel.findOne({
      menuItem: dto.menuItem,
      ingredient: dto.ingredient,
    }).exec();

    if (existing) {
      throw new BadRequestException('This ingredient is already linked to this menu item');
    }

    const link = new this.menuItemIngredientModel({
      ...dto,
      createdBy: { _id: user._id, email: user.email },
      updatedBy: { _id: user._id, email: user.email },
    });

    return link.save();
  }

  async getIngredientsByMenuItem(menuItemId: string): Promise<MenuItemIngredient[]> {
    return this.menuItemIngredientModel
      .find({ menuItem: menuItemId })
      .populate('ingredient', 'name unit currentStock minStock')
      .exec();
  }

  async updateMenuItemIngredient(id: string, dto: UpdateMenuItemIngredientDto, user: IUser): Promise<MenuItemIngredient> {
    const link = await this.menuItemIngredientModel.findById(id).exec();
    if (!link) {
      throw new NotFoundException('Menu item ingredient link not found');
    }

    Object.assign(link, {
      ...dto,
      updatedBy: { _id: user._id, email: user.email },
    });

    return link.save();
  }

  async removeMenuItemIngredient(id: string): Promise<void> {
    await this.menuItemIngredientModel.findByIdAndDelete(id).exec();
  }

  // ========== Order Integration ==========
  async processOrderStock(orderItems: Array<{ item: string; quantity: number }>): Promise<void> {
    for (const orderItem of orderItems) {
      // Get ingredients for this menu item
      const menuItemIngredients = await this.menuItemIngredientModel
        .find({ menuItem: orderItem.item })
        .populate('ingredient')
        .exec();

      for (const menuItemIngredient of menuItemIngredients) {
        const ingredient = menuItemIngredient.ingredient as any;
        const requiredQuantity = menuItemIngredient.quantity * orderItem.quantity;

        // Check if enough stock
        if (ingredient.currentStock < requiredQuantity) {
          throw new BadRequestException(
            `Insufficient stock for ingredient ${ingredient.name}. Required: ${requiredQuantity}, Available: ${ingredient.currentStock}`
          );
        }

        // Create stock movement (OUT)
        await this.createStockMovement(
          {
            ingredient: ingredient._id.toString(),
            type: MovementType.OUT,
            reason: MovementReason.ORDER,
            quantity: requiredQuantity,
            order: orderItem.item, // Store menu item ID as reference
            notes: `Order served: ${orderItem.quantity}x menu item`,
          },
          { _id: new Types.ObjectId(), email: 'system@restaurant.com' } as IUser, // System user
        );
      }
    }
  }

  async restoreOrderStock(orderItems: Array<{ item: string; quantity: number }>): Promise<void> {
    for (const orderItem of orderItems) {
      // Get ingredients for this menu item
      const menuItemIngredients = await this.menuItemIngredientModel
        .find({ menuItem: orderItem.item })
        .populate('ingredient')
        .exec();

      for (const menuItemIngredient of menuItemIngredients) {
        const ingredient = menuItemIngredient.ingredient as any;
        const restoredQuantity = menuItemIngredient.quantity * orderItem.quantity;

        // Restore stock by creating IN movement
        await this.createStockMovement(
          {
            ingredient: ingredient._id.toString(),
            type: MovementType.IN,
            reason: MovementReason.RETURN, // Assuming RETURN is a valid reason
            quantity: restoredQuantity,
            order: orderItem.item,
            notes: `Order cancelled: Restored ${orderItem.quantity}x menu item`,
          },
          { _id: new Types.ObjectId(), email: 'system@restaurant.com' } as IUser, // System user
        );
      }
    }
  }

  // ========== Alerts ==========
  async getInventoryAlerts(): Promise<{
    lowStock: Ingredient[];
    outOfStock: Ingredient[];
  }> {
    const allIngredients = await this.ingredientModel.find({
      isDeleted: { $ne: true },
    }).exec();

    const lowStock = allIngredients.filter(
      (ing) => ing.currentStock <= ing.minStock && ing.currentStock > 0
    );

    const outOfStock = allIngredients.filter(
      (ing) => ing.currentStock === 0
    );

    return { lowStock, outOfStock };
  }

  // ========== D-Day Inventory Management ==========
  
  /**
   * Helper function to get date-only (without time)
   */
  private getDateOnly(date: Date | string): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /**
   * Check if requested quantity is available for a specific date
   */
  async checkAvailability(menuItemId: string, date: string, quantity: number): Promise<{
    available: boolean;
    availableQuantity: number;
    dailyLimit: number | null;
    totalReserved: number;
    message: string;
  }> {
    // Get menu item
    const menuItem = await this.menuItemModel.findById(menuItemId).exec();
    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${menuItemId} not found`);
    }

    const dailyLimit = menuItem.dailyLimit;
    
    // If no daily limit, it's unlimited
    if (!dailyLimit) {
      return {
        available: true,
        availableQuantity: Infinity,
        dailyLimit: null,
        totalReserved: 0,
        message: 'Unlimited quantity available',
      };
    }

    // Get or create daily reservation record
    const dateOnly = this.getDateOnly(date);
    let reservation = await this.dailyReservationModel.findOne({
      menuItem: menuItemId,
      date: dateOnly,
    }).exec();

    if (!reservation) {
      // Create new reservation record
      reservation = new this.dailyReservationModel({
        menuItem: menuItemId,
        date: dateOnly,
        dailyLimit: dailyLimit,
        totalReserved: 0,
        confirmedCount: 0,
        pendingCount: 0,
      });
      await reservation.save();
    }

    const totalReserved = reservation.totalReserved;
    const availableQuantity = dailyLimit - totalReserved;

    if (quantity > availableQuantity) {
      return {
        available: false,
        availableQuantity,
        dailyLimit,
        totalReserved,
        message: `Chỉ còn ${availableQuantity} phần có sẵn cho ngày này. Bạn đã yêu cầu ${quantity} phần.`,
      };
    }

    return {
      available: true,
      availableQuantity,
      dailyLimit,
      totalReserved,
      message: `Còn ${availableQuantity} phần có sẵn`,
    };
  }

  /**
   * Check availability for multiple items
   */
  async checkMultipleItemsAvailability(items: Array<{ menuItemId: string; date: string; quantity: number }>): Promise<{
    allAvailable: boolean;
    results: Array<{
      menuItemId: string;
      available: boolean;
      availableQuantity: number;
      dailyLimit: number | null;
      message: string;
    }>;
  }> {
    const results: Array<{
      menuItemId: string;
      available: boolean;
      availableQuantity: number;
      dailyLimit: number | null;
      message: string;
    }> = [];
    let allAvailable = true;

    for (const item of items) {
      const result = await this.checkAvailability(item.menuItemId, item.date, item.quantity);
      results.push({
        menuItemId: item.menuItemId,
        ...result,
      });
      if (!result.available) {
        allAvailable = false;
      }
    }

    return { allAvailable, results };
  }

  /**
   * Reserve inventory for a specific date (pending - not confirmed yet)
   * Uses atomic operation to prevent race conditions
   */
  async reserveInventory(menuItemId: string, date: string, quantity: number, orderId?: string): Promise<DailyInventoryReservation> {
    const dateOnly = this.getDateOnly(date);

    // Get menu item to check daily limit
    const menuItem = await this.menuItemModel.findById(menuItemId).exec();
    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${menuItemId} not found`);
    }

    const dailyLimit = menuItem.dailyLimit || 0;

    // Use atomic operation with conditional update to prevent race conditions
    // The query ensures we don't exceed the daily limit
    let reservation: DailyInventoryReservation | null = null;

    if (dailyLimit > 0) {
      // Try to reserve using atomic operation (only succeeds if within limit)
      reservation = await this.dailyReservationModel.findOneAndUpdate(
        {
          menuItem: menuItemId,
          date: dateOnly,
          // Only update if totalReserved + quantity <= dailyLimit
          $expr: { $lte: [{ $add: ['$totalReserved', quantity] }, dailyLimit] },
        },
        {
          $inc: {
            pendingCount: quantity,
            totalReserved: quantity,
          },
        },
        { new: true }
      ).exec();

      if (!reservation) {
        // Either no record exists or limit exceeded - check current status
        const existing = await this.dailyReservationModel.findOne({
          menuItem: menuItemId,
          date: dateOnly,
        }).exec();

        if (existing) {
          const available = dailyLimit - existing.totalReserved;
          throw new BadRequestException(
            `Chỉ còn ${available} phần có sẵn cho ngày này. Bạn đã yêu cầu ${quantity} phần.`
          );
        }
      }
    }

    // If no reservation found (no daily limit or record doesn't exist)
    if (!reservation) {
      reservation = await this.dailyReservationModel.findOneAndUpdate(
        {
          menuItem: menuItemId,
          date: dateOnly,
        },
        {
          $inc: {
            pendingCount: quantity,
            totalReserved: quantity,
          },
          $setOnInsert: {
            dailyLimit: dailyLimit,
          },
        },
        {
          new: true,
          upsert: true, // Create if doesn't exist
        }
      ).exec();
    }

    return reservation!;
  }

  /**
   * Release pending inventory reservation (atomic operation)
   */
  async releaseInventory(menuItemId: string, date: string, quantity: number, orderId?: string): Promise<DailyInventoryReservation> {
    const dateOnly = this.getDateOnly(date);

    // Use atomic operation to prevent race conditions
    const reservation = await this.dailyReservationModel.findOneAndUpdate(
      {
        menuItem: menuItemId,
        date: dateOnly,
        // Only update if pendingCount >= quantity
        pendingCount: { $gte: quantity },
      },
      {
        $inc: {
          pendingCount: -quantity,
          totalReserved: -quantity,
        },
      },
      { new: true }
    ).exec();

    if (!reservation) {
      const existing = await this.dailyReservationModel.findOne({
        menuItem: menuItemId,
        date: dateOnly,
      }).exec();

      if (!existing) {
        throw new NotFoundException(`No reservation found for this menu item on this date`);
      }

      if (existing.pendingCount < quantity) {
        throw new BadRequestException(
          `Cannot release ${quantity}. Only ${existing.pendingCount} pending reservations available.`
        );
      }
    }

    return reservation!;
  }

  /**
   * Confirm reservation (when payment is confirmed) - atomic operation
   */
  async confirmReservation(menuItemId: string, date: string, quantity: number): Promise<DailyInventoryReservation> {
    const dateOnly = this.getDateOnly(date);

    // Use atomic operation
    const reservation = await this.dailyReservationModel.findOneAndUpdate(
      {
        menuItem: menuItemId,
        date: dateOnly,
        pendingCount: { $gte: quantity },
      },
      {
        $inc: {
          pendingCount: -quantity,
          confirmedCount: quantity,
        },
      },
      { new: true }
    ).exec();

    if (!reservation) {
      const existing = await this.dailyReservationModel.findOne({
        menuItem: menuItemId,
        date: dateOnly,
      }).exec();

      if (!existing) {
        throw new NotFoundException(`No reservation found for this menu item on this date`);
      }

      if (existing.pendingCount < quantity) {
        throw new BadRequestException(
          `Cannot confirm ${quantity}. Only ${existing.pendingCount} pending reservations available.`
        );
      }
    }

    return reservation!;
  }

  /**
   * Cancel confirmed reservation (when order is cancelled) - atomic operation
   */
  async cancelConfirmedReservation(menuItemId: string, date: string, quantity: number): Promise<DailyInventoryReservation> {
    const dateOnly = this.getDateOnly(date);

    // Use atomic operation
    const reservation = await this.dailyReservationModel.findOneAndUpdate(
      {
        menuItem: menuItemId,
        date: dateOnly,
        confirmedCount: { $gte: quantity },
      },
      {
        $inc: {
          confirmedCount: -quantity,
          totalReserved: -quantity,
        },
      },
      { new: true }
    ).exec();

    if (!reservation) {
      const existing = await this.dailyReservationModel.findOne({
        menuItem: menuItemId,
        date: dateOnly,
      }).exec();

      if (!existing) {
        throw new NotFoundException(`No reservation found for this menu item on this date`);
      }

      if (existing.confirmedCount < quantity) {
        throw new BadRequestException(
          `Cannot cancel ${quantity}. Only ${existing.confirmedCount} confirmed reservations available.`
        );
      }
    }

    return reservation!;
  }

  /**
   * Bulk reserve inventory for multiple items
   */
  async bulkReserveInventory(items: Array<{ menuItemId: string; quantity: number }>, date: string, orderId?: string): Promise<{
    success: boolean;
    results: Array<{
      menuItemId: string;
      success: boolean;
      message: string;
    }>;
  }> {
    const results: Array<{ menuItemId: string; success: boolean; message: string }> = [];
    let allSuccess = true;

    for (const item of items) {
      try {
        await this.reserveInventory(item.menuItemId, date, item.quantity, orderId);
        results.push({
          menuItemId: item.menuItemId,
          success: true,
          message: 'Reserved successfully',
        });
      } catch (error: any) {
        allSuccess = false;
        results.push({
          menuItemId: item.menuItemId,
          success: false,
          message: error.message,
        });
        
        // Rollback previous reservations if any failed
        for (let i = 0; i < results.length - 1; i++) {
          if (results[i].success) {
            const itemToRelease = items[i];
            await this.releaseInventory(itemToRelease.menuItemId, date, itemToRelease.quantity, orderId);
          }
        }
        break;
      }
    }

    return { success: allSuccess, results };
  }

  /**
   * Get available quantity for a specific date
   */
  async getAvailableQuantity(menuItemId: string, date: string): Promise<number> {
    const availability = await this.checkAvailability(menuItemId, date, 1);
    return availability.availableQuantity;
  }

  /**
   * Get daily reservation info for a menu item
   */
  async getDailyReservationInfo(menuItemId: string, date: string): Promise<{
    date: Date;
    dailyLimit: number | null;
    totalReserved: number;
    confirmedCount: number;
    pendingCount: number;
    availableQuantity: number;
  }> {
    const dateOnly = this.getDateOnly(date);
    
    let reservation = await this.dailyReservationModel.findOne({
      menuItem: menuItemId,
      date: dateOnly,
    }).exec();

    const menuItem = await this.menuItemModel.findById(menuItemId).exec();
    const dailyLimit = menuItem?.dailyLimit || null;

    if (!reservation) {
      return {
        date: dateOnly,
        dailyLimit,
        totalReserved: 0,
        confirmedCount: 0,
        pendingCount: 0,
        availableQuantity: dailyLimit || Infinity,
      };
    }

    return {
      date: reservation.date,
      dailyLimit: reservation.dailyLimit,
      totalReserved: reservation.totalReserved,
      confirmedCount: reservation.confirmedCount,
      pendingCount: reservation.pendingCount,
      availableQuantity: (reservation.dailyLimit || Infinity) - reservation.totalReserved,
    };
  }

  /**
   * Get all reservations for a date range
   */
  async getReservationsInRange(startDate: string, endDate: string): Promise<DailyInventoryReservation[]> {
    const start = this.getDateOnly(startDate);
    const end = this.getDateOnly(endDate);
    end.setHours(23, 59, 59, 999);

    return this.dailyReservationModel.find({
      date: { $gte: start, $lte: end },
    })
    .populate('menuItem', 'name price category dailyLimit')
    .sort({ date: 1 })
    .exec();
  }
}

