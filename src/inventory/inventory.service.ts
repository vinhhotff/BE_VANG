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
import { IngredientDailyStock, IngredientDailyStockDocument } from './schemas/ingredient-daily-stock.schema';
import { CreateIngredientDto, UpdateIngredientDto } from './dto/create-ingredient.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateMenuItemIngredientDto, UpdateMenuItemIngredientDto } from './dto/create-menu-item-ingredient.dto';
import { IUser } from '../user/user.interface';
import { CheckInventoryAvailabilityDto, ReserveInventoryDto, ReleaseInventoryDto, BulkReserveInventoryDto } from './dto/inventory-check.dto';
import { MenuItem } from '../menu-item/schemas/menu-item.schema';
import {
  CheckTimeBasedStockDto,
  ReserveTimeBasedStockDto,
  TimeBasedStockCheckResult,
  TimeBasedStockReservationResult,
  TimeBasedInventoryConfig,
  TIME_BASED_INVENTORY_CONFIG,
  TimeBasedStockItemResult,
} from './dto/time-based-inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Ingredient.name) private ingredientModel: Model<IngredientDocument>,
    @InjectModel(StockMovement.name) private stockMovementModel: Model<StockMovementDocument>,
    @InjectModel(MenuItemIngredient.name) private menuItemIngredientModel: Model<MenuItemIngredientDocument>,
    @InjectModel(DailyInventoryReservation.name) private dailyReservationModel: Model<DailyInventoryReservationDocument>,
    @InjectModel(IngredientDailyStock.name) private ingredientDailyStockModel: Model<IngredientDailyStockDocument>,
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
  async processOrderStock(
    orderItems: Array<{ item: string; quantity: number }>,
    orderId?: string,
  ): Promise<void> {
    for (const orderItem of orderItems) {
      const menuItemIngredients = await this.menuItemIngredientModel
        .find({ menuItem: orderItem.item })
        .populate('ingredient')
        .exec();

      for (const menuItemIngredient of menuItemIngredients) {
        const ingredient = menuItemIngredient.ingredient as any;
        const requiredQuantity = menuItemIngredient.quantity * orderItem.quantity;

        if (ingredient.currentStock < requiredQuantity) {
          throw new BadRequestException(
            `Insufficient stock for ingredient ${ingredient.name}. Required: ${requiredQuantity}, Available: ${ingredient.currentStock}`
          );
        }

        await this.createStockMovement(
          {
            ingredient: ingredient._id.toString(),
            type: MovementType.OUT,
            reason: MovementReason.ORDER,
            quantity: requiredQuantity,
            order: orderId,
            notes: `Order served: ${orderItem.quantity}x menu item`,
          },
          { _id: new Types.ObjectId(), email: 'system@restaurant.com' } as IUser,
        );
      }
    }
  }

  async restoreOrderStock(
    orderItems: Array<{ item: string; quantity: number }>,
    orderId?: string,
  ): Promise<void> {
    for (const orderItem of orderItems) {
      const menuItemIngredients = await this.menuItemIngredientModel
        .find({ menuItem: orderItem.item })
        .populate('ingredient')
        .exec();

      for (const menuItemIngredient of menuItemIngredients) {
        const ingredient = menuItemIngredient.ingredient as any;
        const restoredQuantity = menuItemIngredient.quantity * orderItem.quantity;

        await this.createStockMovement(
          {
            ingredient: ingredient._id.toString(),
            type: MovementType.IN,
            reason: MovementReason.RETURN,
            quantity: restoredQuantity,
            order: orderId,
            notes: `Order cancelled: Restored ${orderItem.quantity}x menu item`,
          },
          { _id: new Types.ObjectId(), email: 'system@restaurant.com' } as IUser,
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

    // Track orderId in reservation document for audit trail
    if (orderId && reservation && (reservation as any)._id) {
      await this.dailyReservationModel.findByIdAndUpdate(
        (reservation as any)._id,
        { $push: { orderIds: orderId } }
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
   * Uses atomic operations and proper rollback on failure
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
    const successfulReservations: Array<{ menuItemId: string; quantity: number }> = [];
    let lastError: Error | null = null;

    for (const item of items) {
      try {
        await this.reserveInventory(item.menuItemId, date, item.quantity, orderId);
        successfulReservations.push({ menuItemId: item.menuItemId, quantity: item.quantity });
        results.push({
          menuItemId: item.menuItemId,
          success: true,
          message: 'Reserved successfully',
        });
      } catch (error: any) {
        lastError = error;
        results.push({
          menuItemId: item.menuItemId,
          success: false,
          message: error.message,
        });

        // Rollback ONLY the successful reservations (not the failed one)
        // Use try-catch to handle partial rollback failures gracefully
        for (const reserved of successfulReservations) {
          try {
            await this.releaseInventory(reserved.menuItemId, date, reserved.quantity, orderId);
          } catch (releaseError: any) {
            console.error(`Failed to rollback reservation for ${reserved.menuItemId}:`, releaseError.message);
          }
        }
        break; // Stop processing after first failure
      }
    }

    return { success: successfulReservations.length === items.length, results };
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

  // ========== Time-Based Inventory (Tồn kho tích lũy theo thời gian) ==========

  /**
   * Lấy số ngày chờ (Gap_Days)
   */
  private calculateGapDays(targetDate: Date): number {
    const today = this.getDateOnly(new Date());
    const target = this.getDateOnly(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays); // Không âm
  }

  /**
   * Tính toán tồn kho khả dụng dựa trên thời gian
   * 
   * Công thức:
   * - Gap_Days = Target_Date - Today
   * - Total_Capacity = Gap_Days * Stock_Per_Day
   * - Available_Stock = Total_Capacity - Current_Booked
   */
  async checkTimeBasedAvailability(
    dto: CheckTimeBasedStockDto
  ): Promise<TimeBasedStockCheckResult> {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const targetDate = new Date(dto.targetDate);
    
    // Validate target date
    if (isNaN(targetDate.getTime())) {
      throw new BadRequestException('Invalid target date format. Use YYYY-MM-DD');
    }

    // Tính Gap_Days
    const gapDays = this.calculateGapDays(targetDate);
    
    // Lấy Stock_Per_Day từ config
    const stockPerDay = TimeBasedInventoryConfig.getInstance().getStockPerDay();
    
    // Tính Total_Capacity = Gap_Days * Stock_Per_Day
    const totalCapacity = gapDays * stockPerDay;

    // Kiểm tra nếu Target_Date là hôm nay hoặc quá khứ
    if (gapDays === 0) {
      // Hôm nay: không có thêm capacity mới
      return {
        success: false,
        allAvailable: false,
        targetDate: dto.targetDate,
        today: todayStr,
        stockPerDay,
        items: [],
        summary: {
          totalRequested: 0,
          totalAvailable: 0,
          minAvailableStock: 0,
        },
        message: `Không thể đặt cho ngày hôm nay. Vui lòng đặt cho ngày mai hoặc muộn hơn.`,
      };
    }

    // Kiểm tra từng menu item
    const itemResults: TimeBasedStockItemResult[] = [];
    let allAvailable = true;
    let minAvailableStock = Infinity;
    let totalRequested = 0;

    for (const item of dto.items) {
      // Lấy thông tin menu item
      const menuItem = await this.menuItemModel.findById(item.menuItemId).exec();
      if (!menuItem) {
        throw new NotFoundException(`Menu item with ID ${item.menuItemId} not found`);
      }

      // Lấy Current_Booked từ daily reservation (chỉ tính confirmed + pending)
      const dateOnly = this.getDateOnly(targetDate);
      const reservation = await this.dailyReservationModel.findOne({
        menuItem: item.menuItemId,
        date: dateOnly,
      }).exec();

      const currentBooked = reservation 
        ? reservation.totalReserved 
        : 0;

      // Tính Available_Stock = Total_Capacity - Current_Booked
      const availableStock = Math.max(0, totalCapacity - currentBooked);
      
      // Kiểm tra availability
      const isAvailable = item.quantity <= availableStock;
      
      if (!isAvailable) {
        allAvailable = false;
      }

      if (availableStock < minAvailableStock) {
        minAvailableStock = availableStock;
      }

      totalRequested += item.quantity;

      itemResults.push({
        menuItemId: item.menuItemId,
        menuItemName: menuItem.name,
        requestedQuantity: item.quantity,
        gapDays,
        totalCapacity,
        currentBooked,
        availableStock,
        isAvailable,
        message: isAvailable
          ? `Có thể đặt ${item.quantity} phần (${availableStock} phần khả dụng)`
          : `Yêu cầu ${item.quantity} phần nhưng chỉ còn ${availableStock} phần khả dụng`,
      });
    }

    // Tạo message tổng hợp
    let message: string;
    if (allAvailable) {
      message = `✓ Tất cả món đều có thể đặt cho ngày ${dto.targetDate}. ` +
        `Tổng capacity: ${totalCapacity} phần, Đã book: ${itemResults.reduce((sum, i) => sum + i.currentBooked, 0)} phần.`;
    } else {
      const unavailableItems = itemResults.filter(i => !i.isAvailable);
      message = `✗ Có ${unavailableItems.length} món không đủ stock:\n` +
        unavailableItems.map(i => 
          `• ${i.menuItemName}: Yêu cầu ${i.requestedQuantity}, Còn ${i.availableStock} phần (${i.currentBooked} đã book)`
        ).join('\n');
    }

    return {
      success: true,
      allAvailable,
      targetDate: dto.targetDate,
      today: todayStr,
      stockPerDay,
      items: itemResults,
      summary: {
        totalRequested,
        totalAvailable: itemResults.reduce((sum, i) => sum + i.availableStock, 0),
        minAvailableStock: minAvailableStock === Infinity ? 0 : minAvailableStock,
      },
      message,
    };
  }

  /**
   * Kiểm tra nhanh cho 1 món đơn lẻ
   * Tiện cho việc validate trước khi tạo order
   */
  async checkSingleItemTimeBasedAvailability(
    menuItemId: string,
    targetDate: string,
    quantity: number
  ): Promise<{
    available: boolean;
    gapDays: number;
    totalCapacity: number;
    currentBooked: number;
    availableStock: number;
    maxCanOrder: number;
    message: string;
  }> {
    const result = await this.checkTimeBasedAvailability({
      targetDate,
      items: [{ menuItemId, quantity }],
    });

    if (result.items.length === 0) {
      return {
        available: false,
        gapDays: 0,
        totalCapacity: 0,
        currentBooked: 0,
        availableStock: 0,
        maxCanOrder: 0,
        message: result.message,
      };
    }

    const item = result.items[0];
    return {
      available: item.isAvailable,
      gapDays: item.gapDays,
      totalCapacity: item.totalCapacity,
      currentBooked: item.currentBooked,
      availableStock: item.availableStock,
      maxCanOrder: item.availableStock,
      message: item.message,
    };
  }

  /**
   * Reserve tồn kho theo thời gian
   * Gọi sau khi check và accept order
   */
  async reserveTimeBasedInventory(
    dto: ReserveTimeBasedStockDto
  ): Promise<TimeBasedStockReservationResult> {
    // Đầu tiên kiểm tra availability
    const checkResult = await this.checkTimeBasedAvailability(dto);
    
    if (!checkResult.allAvailable) {
      return {
        success: false,
        reserved: false,
        targetDate: dto.targetDate,
        items: [],
        message: checkResult.message,
      };
    }

    // Thực hiện reserve cho từng item
    const reservedItems: Array<{
      menuItemId: string;
      quantity: number;
      newBooked: number;
    }> = [];
    const dateOnly = this.getDateOnly(dto.targetDate);

    for (const item of dto.items) {
      // Sử dụng upsert để tạo hoặc cập nhật reservation
      const reservation = await this.dailyReservationModel.findOneAndUpdate(
        {
          menuItem: item.menuItemId,
          date: dateOnly,
        },
        {
          $inc: {
            pendingCount: item.quantity,
            totalReserved: item.quantity,
          },
          $setOnInsert: {
            menuItem: item.menuItemId,
            date: dateOnly,
          },
        },
        {
          new: true,
          upsert: true,
        }
      ).exec();

      // Track order ID nếu có
      if (dto.orderId && reservation.orderIds) {
        await this.dailyReservationModel.updateOne(
          { _id: reservation._id },
          { $addToSet: { orderIds: dto.orderId } }
        );
      }

      reservedItems.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        newBooked: reservation.totalReserved,
      });
    }

    return {
      success: true,
      reserved: true,
      targetDate: dto.targetDate,
      items: reservedItems,
      message: `Đã reserve thành công ${dto.items.reduce((sum, i) => sum + i.quantity, 0)} phần cho ngày ${dto.targetDate}`,
    };
  }

  /**
   * Confirm reservation (chuyển từ pending sang confirmed)
   */
  async confirmTimeBasedReservation(
    menuItemId: string,
    targetDate: string,
    quantity: number,
    orderId?: string
  ): Promise<void> {
    const dateOnly = this.getDateOnly(targetDate);
    
    await this.dailyReservationModel.findOneAndUpdate(
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
        ...(orderId ? { $addToSet: { orderIds: orderId } } : {}),
      }
    ).exec();
  }

  /**
   * Release reservation (hủy bỏ pending reservation)
   */
  async releaseTimeBasedReservation(
    menuItemId: string,
    targetDate: string,
    quantity: number
  ): Promise<void> {
    const dateOnly = this.getDateOnly(targetDate);
    
    await this.dailyReservationModel.findOneAndUpdate(
      {
        menuItem: menuItemId,
        date: dateOnly,
        pendingCount: { $gte: quantity },
      },
      {
        $inc: {
          pendingCount: -quantity,
          totalReserved: -quantity,
        },
      }
    ).exec();
  }

  /**
   * Lấy cấu hình Stock Per Day hiện tại
   */
  getStockPerDay(): number {
    return TimeBasedInventoryConfig.getInstance().getStockPerDay();
  }

  /**
   * Cập nhật cấu hình Stock Per Day
   */
  setStockPerDay(value: number): void {
    TimeBasedInventoryConfig.getInstance().setStockPerDay(value);
  }

  /**
   * Lấy thống kê tồn kho cho 1 ngày
   */
  async getDailyInventoryStats(date: string): Promise<{
    date: string;
    totalItems: number;
    totalReserved: number;
    totalConfirmed: number;
    totalPending: number;
    items: Array<{
      menuItemId: string;
      menuItemName: string;
      reserved: number;
      confirmed: number;
      pending: number;
    }>;
  }> {
    const dateOnly = this.getDateOnly(date);
    
    const reservations = await this.dailyReservationModel.find({
      date: dateOnly,
    }).populate('menuItem', 'name').exec();

    return {
      date,
      totalItems: reservations.length,
      totalReserved: reservations.reduce((sum, r) => sum + r.totalReserved, 0),
      totalConfirmed: reservations.reduce((sum, r) => sum + r.confirmedCount, 0),
      totalPending: reservations.reduce((sum, r) => sum + r.pendingCount, 0),
      items: reservations.map(r => ({
        menuItemId: r.menuItem.toString(),
        menuItemName: (r.menuItem as any)?.name || 'Unknown',
        reserved: r.totalReserved,
        confirmed: r.confirmedCount,
        pending: r.pendingCount,
      })),
    };
  }

  // ========== Ingredient-Level Daily Reservation (for consumption date tracking) ==========

  /**
   * Get available ingredient stock accounting for pending + confirmed reservations.
   * Available = Ingredient.currentStock - totalPending - totalConfirmed
   * Only considers reservations on or after the target date.
   */
  async getAvailableIngredientStock(
    ingredientId: string,
    targetDate: Date,
  ): Promise<number> {
    const dateOnly = this.getDateOnly(targetDate);

    const reservations = await this.ingredientDailyStockModel.find({
      ingredient: ingredientId,
      date: { $gte: dateOnly },
      isDeleted: { $ne: true },
    }).exec();

    const reserved = reservations.reduce(
      (sum, r) => sum + r.pendingQuantity + r.confirmedQuantity,
      0,
    );

    const ingredient = await this.ingredientModel.findById(ingredientId).exec();
    const currentStock = ingredient?.currentStock || 0;

    return Math.max(0, currentStock - reserved);
  }

  /**
   * Reserve ingredient stock for a specific date.
   * This creates a "pending" reservation that blocks the stock without deducting it.
   * Returns early (success=true) if no MenuItemIngredient links exist (no stock to reserve).
   */
  async reserveIngredientStock(
    menuItemId: string,
    menuItemQuantity: number,
    targetDate: Date,
    orderId?: string,
  ): Promise<{
    success: boolean;
    reservedItems: Array<{
      ingredientId: string;
      ingredientName: string;
      requiredQuantity: number;
      availableBefore: number;
    }>;
    failedItems: Array<{
      ingredientId: string;
      ingredientName: string;
      requiredQuantity: number;
      availableStock: number;
    }>;
  }> {
    const menuItemIngredients = await this.menuItemIngredientModel
      .find({ menuItem: menuItemId })
      .populate('ingredient')
      .exec();

    if (menuItemIngredients.length === 0) {
      return { success: true, reservedItems: [], failedItems: [] };
    }

    const reservedItems: Array<{
      ingredientId: string;
      ingredientName: string;
      requiredQuantity: number;
      availableBefore: number;
    }> = [];
    const failedItems: Array<{
      ingredientId: string;
      ingredientName: string;
      requiredQuantity: number;
      availableStock: number;
    }> = [];

    for (const link of menuItemIngredients) {
      const ingredient = link.ingredient as any;
      const ingredientId = ingredient._id?.toString() || ingredient.toString();
      const requiredQty = link.quantity * menuItemQuantity;

      const available = await this.getAvailableIngredientStock(
        ingredientId,
        targetDate,
      );

      if (available < requiredQty) {
        failedItems.push({
          ingredientId,
          ingredientName: ingredient.name || '',
          requiredQuantity: requiredQty,
          availableStock: available,
        });
        continue;
      }

      const dateOnly = this.getDateOnly(targetDate);

      await this.ingredientDailyStockModel.findOneAndUpdate(
        {
          ingredient: new Types.ObjectId(ingredientId),
          menuItem: new Types.ObjectId(menuItemId),
          date: dateOnly,
        },
        {
          $inc: { pendingQuantity: requiredQty },
          $setOnInsert: {
            ingredient: new Types.ObjectId(ingredientId),
            menuItem: new Types.ObjectId(menuItemId),
            date: dateOnly,
            confirmedQuantity: 0,
            orderId: orderId ? new Types.ObjectId(orderId) : undefined,
            reason: 'pending_reservation',
          },
        },
        { upsert: true, new: true },
      ).exec();

      reservedItems.push({
        ingredientId,
        ingredientName: ingredient.name || '',
        requiredQuantity: requiredQty,
        availableBefore: available,
      });
    }

    return {
      success: failedItems.length === 0,
      reservedItems,
      failedItems,
    };
  }

  /**
   * Release a pending ingredient reservation (e.g., order cancelled before payment).
   */
  async releaseIngredientReservation(
    menuItemId: string,
    menuItemQuantity: number,
    targetDate: Date,
  ): Promise<void> {
    const menuItemIngredients = await this.menuItemIngredientModel
      .find({ menuItem: menuItemId })
      .exec();

    for (const link of menuItemIngredients) {
      const releaseQty = link.quantity * menuItemQuantity;
      const dateOnly = this.getDateOnly(targetDate);

      await this.ingredientDailyStockModel.findOneAndUpdate(
        {
          ingredient: link.ingredient,
          menuItem: link.menuItem,
          date: dateOnly,
          pendingQuantity: { $gte: releaseQty },
        },
        {
          $inc: { pendingQuantity: -releaseQty },
        },
      ).exec();
    }
  }

  /**
   * Confirm ingredient reservation (called when order is actually served).
   * Moves from pending to confirmed, then deducts the real stock.
   */
  async confirmIngredientReservation(
    menuItemId: string,
    menuItemQuantity: number,
    targetDate: Date,
    orderId?: string,
  ): Promise<void> {
    const menuItemIngredients = await this.menuItemIngredientModel
      .find({ menuItem: menuItemId })
      .populate('ingredient')
      .exec();

    const systemUser = {
      _id: new Types.ObjectId(),
      email: 'system@restaurant.com',
    } as any;

    for (const link of menuItemIngredients) {
      const ingredient = link.ingredient as any;
      const ingredientId = ingredient._id?.toString() || '';
      const confirmQty = link.quantity * menuItemQuantity;
      const dateOnly = this.getDateOnly(targetDate);

      const reservation = await this.ingredientDailyStockModel.findOneAndUpdate(
        {
          ingredient: new Types.ObjectId(ingredientId),
          menuItem: new Types.ObjectId(menuItemId),
          date: dateOnly,
          pendingQuantity: { $gte: confirmQty },
        },
        {
          $inc: {
            pendingQuantity: -confirmQty,
            confirmedQuantity: confirmQty,
          },
        },
        { new: true },
      ).exec();

      if (!reservation) continue;

      const currentStock = ingredient.currentStock ?? 0;
      if (currentStock < confirmQty) {
        throw new BadRequestException(
          `Insufficient stock for ingredient '${ingredient.name || ingredientId}'. Required: ${confirmQty}, Available: ${currentStock}`,
        );
      }

      await this.createStockMovement(
        {
          ingredient: ingredientId,
          type: MovementType.OUT,
          reason: MovementReason.ORDER,
          quantity: confirmQty,
          order: orderId,
          notes: `Order served: ${menuItemQuantity}x menu item for ${targetDate.toISOString().split('T')[0]}`,
        },
        systemUser,
      );
    }
  }

  /**
   * Cancel a confirmed ingredient reservation (e.g., served order cancelled — rare).
   * Restores real stock.
   */
  async cancelConfirmedIngredientReservation(
    menuItemId: string,
    menuItemQuantity: number,
    targetDate: Date,
    orderId?: string,
  ): Promise<void> {
    const menuItemIngredients = await this.menuItemIngredientModel
      .find({ menuItem: menuItemId })
      .populate('ingredient')
      .exec();

    const systemUser = {
      _id: new Types.ObjectId(),
      email: 'system@restaurant.com',
    } as any;

    for (const link of menuItemIngredients) {
      const ingredient = link.ingredient as any;
      const ingredientId = ingredient._id?.toString() || '';
      const cancelQty = link.quantity * menuItemQuantity;
      const dateOnly = this.getDateOnly(targetDate);

      await this.ingredientDailyStockModel.findOneAndUpdate(
        {
          ingredient: new Types.ObjectId(ingredientId),
          menuItem: new Types.ObjectId(menuItemId),
          date: dateOnly,
          confirmedQuantity: { $gte: cancelQty },
        },
        {
          $inc: { confirmedQuantity: -cancelQty },
        },
      ).exec();

      await this.createStockMovement(
        {
          ingredient: ingredientId,
          type: MovementType.IN,
          reason: MovementReason.RETURN,
          quantity: cancelQty,
          order: orderId,
          notes: `Cancelled served order: ${menuItemQuantity}x menu item`,
        },
        systemUser,
      );
    }
  }
}

