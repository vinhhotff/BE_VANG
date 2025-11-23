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
import { CreateIngredientDto, UpdateIngredientDto } from './dto/create-ingredient.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { CreateMenuItemIngredientDto, UpdateMenuItemIngredientDto } from './dto/create-menu-item-ingredient.dto';
import { IUser } from '../user/user.interface';

@Injectable()
export class InventoryService {
  constructor(
    @InjectModel(Ingredient.name) private ingredientModel: Model<IngredientDocument>,
    @InjectModel(StockMovement.name) private stockMovementModel: Model<StockMovementDocument>,
    @InjectModel(MenuItemIngredient.name) private menuItemIngredientModel: Model<MenuItemIngredientDocument>,
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
}

