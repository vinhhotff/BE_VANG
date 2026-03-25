import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Order,
  OrderDocument,
  OrderStatus,
  OrderType,
  isValidStatusTransition,
  isTerminalStatus,
  ORDER_STATUS_TRANSITIONS,
} from './schemas/order.schema';
import { CreateOrderDto, CreateOnlineOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { MenuItem } from '../menu-item/schemas/menu-item.schema';
import { MenuItemService } from '../menu-item/menu-item.service';
import { Guest } from '../guest/schemas/guest.schema';
import { User } from '../user/schemas/user.schema';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { MarkOrderPaidDto } from './dto/update-order.dto';
import { DeliveryService } from '../delivery/delivery.service';
import { InventoryService } from '../inventory/inventory.service';
import { NotificationService } from '../notification/notification.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationType } from '../notification/schemas/notification.schema';
import { CheckStockDto, CheckStockResultDto, CheckStockItemDto, CheckStockResultItemDto } from './dto/check-stock.dto';
import {
  PaginationResponseDto,
  buildSortObject,
  buildSearchFilter,
} from '../common/dto/pagination.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItem>,
    @InjectModel(Guest.name) private guestModel: Model<Guest>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly loyaltyService: LoyaltyService,
    private readonly deliveryService: DeliveryService,
    private readonly inventoryService: InventoryService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
    private readonly menuItemService: MenuItemService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const { items, guest, user } = createOrderDto;

    // Validate that only one of guest or user is provided
    if ((guest && user) || (!guest && !user)) {
      throw new BadRequestException(
        'Must provide either guest or user, not both or neither'
      );
    }

    // Validate guest or user exists
    if (guest) {
      const guestExists = await this.guestModel.findById(guest).exec();
      if (!guestExists) {
        throw new NotFoundException('Guest not found');
      }
    }

    if (user) {
      const userExists = await this.userModel.findById(user).exec();
      if (!userExists) {
        throw new NotFoundException('User not found');
      }
    }

    // Validate menu items and calculate total price
    let totalPrice = 0;
    const validatedItems: {
      item: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    for (const orderItem of items) {
      const menuItem = await this.menuItemModel.findById(orderItem.item).exec();
      if (!menuItem) {
        throw new NotFoundException(
          `Menu item with ID ${orderItem.item} not found`
        );
      }
      if (!menuItem.available) {
        throw new BadRequestException(
          `Menu item '${menuItem.name}' is not available`
        );
      }

      // Check stock availability
      if (menuItem.stock !== null && menuItem.stock !== undefined) {
        if (menuItem.stock < orderItem.quantity) {
          throw new BadRequestException(
            `Menu item '${menuItem.name}' chỉ còn ${menuItem.stock} phần, không đủ cho số lượng yêu cầu ${orderItem.quantity}`
          );
        }
      }

      const unitPrice = menuItem.price;
      const subtotal = unitPrice * orderItem.quantity;
      validatedItems.push({
        item: orderItem.item,
        quantity: orderItem.quantity,
        unitPrice,
        subtotal,
      });

      totalPrice += subtotal;
    }

    const order = new this.orderModel({
      ...createOrderDto,
      items: validatedItems,
      totalPrice,
      status: OrderStatus.PENDING,
    });

    const savedOrder = await order.save();

    // Update guest's orders array
    if (guest) {
      await this.guestModel
        .findByIdAndUpdate(
          guest,
          { $push: { orders: savedOrder._id } },
          { new: true }
        )
        .exec();
    }

    // Note: Inventory stock will be deducted when order status changes to SERVED
    // This prevents stock issues if order is cancelled before being served

    // Send notification to admins/staff about new order
    try {
      const notification = await this.notificationService.createOrderNotification(
        NotificationType.ORDER_NEW,
        savedOrder._id.toString(),
        undefined,
        guest,
      );
      await this.notificationGateway.sendToAdmins(notification);
    } catch (error) {
      // Silent fail for notifications
    }

    return savedOrder;
  }

  async createOnlineOrder(
    createOnlineOrderDto: CreateOnlineOrderDto
  ): Promise<Order> {
    const {
      items,
      user,
      customerName,
      customerPhone,
      orderType,
      deliveryAddress,
      specialInstructions,
      reservationDate: reservationDateStr,
    } = createOnlineOrderDto;

    if (orderType === OrderType.DELIVERY && !deliveryAddress) {
      throw new BadRequestException(
        'Delivery address is required for delivery orders'
      );
    }

    // Determine the consumption (D-day) date
    let targetDate: Date;
    if (reservationDateStr) {
      targetDate = new Date(reservationDateStr);
      targetDate.setHours(0, 0, 0, 0);
      if (isNaN(targetDate.getTime())) {
        throw new BadRequestException('Invalid reservation date format');
      }
    } else {
      targetDate = new Date();
      targetDate.setHours(0, 0, 0, 0);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isImmediateOrder = targetDate.getTime() === today.getTime();

    // Validate menu items and calculate total price
    let totalPrice = 0;
    const validatedItems: {
      item: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    const reservedStockItems: Array<{
      ingredient: Types.ObjectId;
      ingredientName: string;
      menuItem: Types.ObjectId;
      quantity: number;
      unit: string;
    }> = [];

    for (const orderItem of items) {
      const menuItem = await this.menuItemModel.findById(orderItem.item).exec();
      if (!menuItem) {
        throw new NotFoundException(
          `Menu item with ID ${orderItem.item} not found`
        );
      }
      if (!menuItem.available) {
        throw new BadRequestException(
          `Menu item '${menuItem.name}' is not available`
        );
      }

      // Check top-level menu item stock (menu-level cap)
      if (menuItem.stock !== null && menuItem.stock !== undefined) {
        if (menuItem.stock < orderItem.quantity) {
          throw new BadRequestException(
            `Menu item '${menuItem.name}' chỉ còn ${menuItem.stock} phần, không đủ cho số lượng yêu cầu ${orderItem.quantity}`
          );
        }
      }

        // Reserve ingredient stock based on consumption date
        const menuItemId = orderItem.item;
        const menuItemObjId = new Types.ObjectId(menuItemId);

        if (isImmediateOrder) {
          // Immediate order: deduct stock right away
          const orderItemsForStock = [{ item: menuItemId, quantity: orderItem.quantity }];
          await this.inventoryService.processOrderStock(orderItemsForStock);
          await this.menuItemService.deductStock(menuItemId, orderItem.quantity);

          const menuItemIngredients = await this.inventoryService
            .getIngredientsByMenuItem(menuItemId);
          for (const link of menuItemIngredients) {
            const ing = link.ingredient as any;
            reservedStockItems.push({
              ingredient: (ing._id || ing) as Types.ObjectId,
              ingredientName: (ing.name || '') as string,
              menuItem: menuItemObjId,
              quantity: (link.quantity || 0) * orderItem.quantity,
              unit: (link.unit || ing.unit || '') as string,
            });
          }
        } else {
          // Future order: create pending ingredient reservations
          const reserveResult = await this.inventoryService.reserveIngredientStock(
            menuItemId,
            orderItem.quantity,
            targetDate,
          );

          if (!reserveResult.success) {
            const failed = reserveResult.failedItems
              .map((f) => `${f.ingredientName}: cần ${f.requiredQuantity}, chỉ còn ${f.availableStock}`)
              .join('; ');
            throw new BadRequestException(
              `Không đủ nguyên liệu cho ngày ${targetDate.toISOString().split('T')[0]}:\n${failed}`
            );
          }

          const menuItemIngredients = await this.inventoryService
            .getIngredientsByMenuItem(menuItemId);
          for (const link of menuItemIngredients) {
            const ing = link.ingredient as any;
            reservedStockItems.push({
              ingredient: (ing._id || ing) as Types.ObjectId,
              ingredientName: (ing.name || '') as string,
              menuItem: menuItemObjId,
              quantity: (link.quantity || 0) * orderItem.quantity,
              unit: (link.unit || ing.unit || '') as string,
            });
          }
        }

      const unitPrice = menuItem.price;
      const subtotal = unitPrice * orderItem.quantity;
      validatedItems.push({
        item: orderItem.item,
        quantity: orderItem.quantity,
        unitPrice,
        subtotal,
      });

      totalPrice += subtotal;
    }

    const orderData: any = {
      items: validatedItems,
      totalPrice,
      status: OrderStatus.PENDING,
      orderType,
      specialInstructions,
      customerPhone,
      deliveryAddress:
        orderType === OrderType.DELIVERY ? deliveryAddress : undefined,
      user: user ? user : undefined,
      reservationDate: targetDate,
      isStockReserved: true,
      inventoryReserved: isImmediateOrder,
      reservedStockItems,
    };

    const order = new this.orderModel(orderData);
    const savedOrder = await order.save();

    if (orderType === OrderType.DELIVERY) {
      await this.deliveryService.create({
        order: savedOrder._id,
        customerName,
        customerPhone,
        deliveryAddress: deliveryAddress!,
      });
    }

    // Send notification to admins/staff about new order
    try {
      const notification = await this.notificationService.createOrderNotification(
        NotificationType.ORDER_NEW,
        savedOrder._id.toString(),
        user,
        undefined,
      );
      await this.notificationGateway.sendToAdmins(notification);
    } catch (error) {
      // Silent fail for notifications
    }

    return savedOrder;
  }

  async countOrders(): Promise<number> {
    return this.orderModel.countDocuments();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: OrderStatus,
    guest?: string,
    user?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginationResponseDto<Order>> {
    // Build filter object
    let filter: any = {};

    // Handle search parameter
    if (search && search.trim()) {
      // Search in guest table code or customer info
      const searchFilter = {
        $or: [
          { customerName: { $regex: search, $options: 'i' } },
          { customerPhone: { $regex: search, $options: 'i' } },
        ],
      };
      filter = { ...filter, ...searchFilter };
    }

    if (status) filter.status = status;
    if (guest) filter.guest = guest;
    if (user) filter.user = user;

    // Create sort object
    const sort = buildSortObject(sortBy, sortOrder);

    const skip = (page - 1) * limit;
    const total = await this.orderModel.countDocuments(filter);

    const orders = await this.orderModel
      .find(filter)
      .populate('items.item', 'name price category images')
      .populate('guest', 'tableCode')
      .populate('user', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();

    return new PaginationResponseDto(orders, total, page, limit);
  }

  async findById(id: string): Promise<Order> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID format');
    }

    const order = await this.orderModel
      .findById(id)
      .populate('items.item', 'name price category images')
      .populate('guest', 'guestName guestPhone tableName')
      .populate('user', 'name email')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findByGuest(guestId: string): Promise<Order[]> {
    if (!Types.ObjectId.isValid(guestId)) {
      throw new BadRequestException('Invalid guest ID format');
    }

    return this.orderModel
      .find({ guest: guestId })
      .populate('items.item', 'name price category images')
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByUser(userId: string): Promise<Order[]> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID format');
    }

    return this.orderModel
      .find({ user: userId })
      .populate('items.item', 'name price category images')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateStatus(id: string, status: OrderStatus, options?: { skipIngredientConfirm?: boolean }): Promise<Order> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID format');
    }

    if (!Object.values(OrderStatus).includes(status)) {
      throw new BadRequestException('Invalid order status');
    }

    // Get current order to check previous status
    const existingOrder = await this.orderModel.findById(id).exec();
    if (!existingOrder) {
      throw new NotFoundException('Order not found');
    }

    const previousStatus = existingOrder.status;

    // Validate status transition using state machine
    if (!isValidStatusTransition(previousStatus, status)) {
      throw new BadRequestException(
        `Invalid status transition from '${previousStatus}' to '${status}'. ` +
        `Valid transitions from '${previousStatus}': ${ORDER_STATUS_TRANSITIONS[previousStatus]?.join(', ') || 'none'}`
      );
    }

    // Update order status
    const order = await this.orderModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .populate('items.item', 'name price category images')
      .populate('guest', 'tableCode')
      .populate('user', 'name email')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Process inventory stock when order is SERVED
    if (status === OrderStatus.SERVED && previousStatus !== OrderStatus.SERVED) {
      try {
        const orderItems = order.items.map((item: any) => ({
          item: item.item._id?.toString() || item.item.toString(),
          quantity: item.quantity,
        }));

        if ((order as any).isStockReserved) {
          const reservationDate = (order as any).reservationDate as Date | undefined;
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const resDate = reservationDate ? new Date(reservationDate) : null;
          if (resDate) resDate.setHours(0, 0, 0, 0);
          const isFutureOrder = resDate && resDate.getTime() > today.getTime();

          if (isFutureOrder && !options?.skipIngredientConfirm) {
            // Future order: confirm pending reservation → deduct real stock
            for (const orderItem of orderItems) {
              await this.inventoryService.confirmIngredientReservation(
                orderItem.item,
                orderItem.quantity,
                reservationDate!,
                order._id.toString(),
              );
            }
          }
          // Immediate order (today): ingredients already deducted at creation → nothing to do
        } else if (!options?.skipIngredientConfirm) {
          // Legacy path: no reservation tracking, deduct now
          await this.inventoryService.processOrderStock(orderItems, order._id.toString());
        }

        // Deduct menu item stock (only if not already deducted at creation)
        if (!(order as any).inventoryReserved) {
          for (const item of order.items) {
            const itemId = item.item._id?.toString() || item.item.toString();
            await this.menuItemService.deductStock(itemId, item.quantity);
          }
        }
      } catch (error: any) {
        // Revert status if stock processing fails
        await this.orderModel.findByIdAndUpdate(id, { status: previousStatus }).exec();
        throw new BadRequestException(
          error?.message || 'Failed to process stock. Order status reverted.'
        );
      }
    }

    // Restore inventory if order is CANCELLED after being SERVED
    if (status === OrderStatus.CANCELLED && previousStatus === OrderStatus.SERVED) {
      try {
        // 1. Restore menu item stock
        for (const item of order.items) {
          const itemId = item.item._id?.toString() || item.item.toString();
          await this.menuItemService.restoreStock(itemId, item.quantity);
        }

        // 2. Cancel confirmed ingredient reservation and restore real stock
        const reservationDate = (order as any).reservationDate;
        const orderItems = order.items.map((item: any) => ({
          item: item.item._id?.toString() || item.item.toString(),
          quantity: item.quantity,
        }));
        for (const orderItem of orderItems) {
          await this.inventoryService.cancelConfirmedIngredientReservation(
            orderItem.item,
            orderItem.quantity,
            reservationDate,
            order._id.toString(),
          );
        }
      } catch (error: any) {
        // Log error but don't fail the cancellation
      }
    }

    // Release pending reservations if order is CANCELLED before SERVED (future orders)
    if (status === OrderStatus.CANCELLED &&
        (previousStatus === OrderStatus.PENDING || previousStatus === OrderStatus.PENDING_APPROVAL || previousStatus === OrderStatus.CONFIRMED)) {
      if ((order as any).isStockReserved && (order as any).reservationDate) {
        const reservationDate = (order as any).reservationDate;
        const orderItems = order.items.map((item: any) => ({
          item: item.item._id?.toString() || item.item.toString(),
          quantity: item.quantity,
        }));
        for (const orderItem of orderItems) {
          try {
            await this.inventoryService.releaseIngredientReservation(
              orderItem.item,
              orderItem.quantity,
              reservationDate,
            );
          } catch (e) {
            // Silent fail
          }
        }
      }
    }

    // Tự động cộng điểm loyalty khi đơn hàng hoàn thành (served)
    if (status === OrderStatus.SERVED && order.user) {
      try {
        await this.loyaltyService.autoAddPointsFromOrder(
          order.user.toString(),
          order.totalPrice
        );
      } catch (error) {
        // Log error nhưng không throw để không ảnh hưởng đến việc cập nhật status
      }
    }

    // Send notification to customer about status change
    if (previousStatus !== status) {
      try {
        const userId = order.user?.toString();
        const guestId = order.guest?.toString();
        const notificationType = status === OrderStatus.CANCELLED
          ? NotificationType.ORDER_CANCELLED
          : NotificationType.ORDER_STATUS_CHANGED;

        const notification = await this.notificationService.createOrderNotification(
          notificationType,
          order._id.toString(),
          userId,
          guestId,
          status,
        );

        // Send to customer
        if (userId) {
          await this.notificationGateway.sendToUser(userId, notification);
        } else if (guestId) {
          await this.notificationGateway.sendToGuest(guestId, notification);
        }
      } catch (error) {
        // Silent fail for notifications
      }
    }

    return order;
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderStatusDto
  ): Promise<Order> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID format');
    }

    const existingOrder = await this.orderModel.findById(id).exec();
    if (!existingOrder) {
      throw new NotFoundException('Order not found');
    }

    // Check if order is in terminal state using state machine
    if (isTerminalStatus(existingOrder.status)) {
      throw new ForbiddenException(
        `Cannot update order with status: ${existingOrder.status}. Order is in a terminal state.`
      );
    }

    const order = await this.orderModel
      .findByIdAndUpdate(id, updateOrderDto, { new: true })
      .populate('items.item', 'name price category images')
      .populate('guest', 'tableCode')
      .populate('user', 'name email')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async cancel(id: string): Promise<Order> {
    return this.updateStatus(id, OrderStatus.CANCELLED);
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID format');
    }

    const order = await this.orderModel.findById(id).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Remove order from guest's orders array
    if (order.guest) {
      await this.guestModel
        .findByIdAndUpdate(
          order.guest,
          { $pull: { orders: id } },
          { new: true }
        )
        .exec();
    }

    await this.orderModel.findByIdAndDelete(id).exec();
  }

  async getOrderStats(): Promise<{
    total: number;
    pending: number;
    preparing: number;
    served: number;
    cancelled: number;
    totalRevenue: number;
  }> {
    const [stats] = await this.orderModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', OrderStatus.PENDING] }, 1, 0] },
          },
          preparing: {
            $sum: {
              $cond: [{ $eq: ['$status', OrderStatus.PREPARING] }, 1, 0],
            },
          },
          served: {
            $sum: { $cond: [{ $eq: ['$status', OrderStatus.SERVED] }, 1, 0] },
          },
          cancelled: {
            $sum: {
              $cond: [{ $eq: ['$status', OrderStatus.CANCELLED] }, 1, 0],
            },
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$status', OrderStatus.SERVED] },
                '$totalPrice',
                0,
              ],
            },
          },
        },
      },
    ]);

    return (
      stats || {
        total: 0,
        pending: 0,
        preparing: 0,
        served: 0,
        cancelled: 0,
        totalRevenue: 0,
      }
    );
  }

  async findOrdersInPeriod(start: Date, end: Date): Promise<Order[]> {
    return this.orderModel
      .find({
        createdAt: {
          $gte: start,
          $lte: end,
        },
      })
      .exec();
  }

  async markAsPaid(
    id: string,
    markOrderPaidDto: MarkOrderPaidDto
  ): Promise<Order> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID format');
    }

    const order = await this.orderModel
      .findById(id)
      .populate('items.item', 'name price')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!markOrderPaidDto.isPaid) {
      // Unmark as paid
      const updated = await this.orderModel
        .findByIdAndUpdate(id, { isPaid: false }, { new: true })
        .populate('items.item', 'name price category images')
        .populate('guest', 'tableCode')
        .populate('user', 'name email')
        .exec();
      return updated!;
    }

    // Mark as paid
    order.isPaid = true;

    // If this is a free order (totalPrice = 0), mark as free and auto-serve
    // to deduct stock immediately
    if (order.totalPrice === 0) {
      order.isFree = true;
      await order.save();

      // Auto-serve free orders to deduct stock
      if (order.status === OrderStatus.PENDING ||
          order.status === OrderStatus.PENDING_APPROVAL ||
          order.status === OrderStatus.CONFIRMED) {
        return await this.updateStatus(id, OrderStatus.SERVED);
      }
    }

    const updated = await order.save();

    return this.orderModel
      .findById(id)
      .populate('items.item', 'name price category images')
      .populate('guest', 'tableCode')
      .populate('user', 'name email')
      .exec() as Promise<Order>;
  }

  // ========== Check Stock Availability ==========
  async checkStockAvailability(
    items: CheckStockItemDto[]
  ): Promise<CheckStockResultDto> {
    const results: CheckStockResultItemDto[] = [];
    let allAvailable = true;

    for (const orderItem of items) {
      const menuItem = await this.menuItemModel.findById(orderItem.item).exec();
      
      if (!menuItem) {
        results.push({
          itemId: orderItem.item,
          itemName: 'Unknown',
          requestedQuantity: orderItem.quantity,
          availableStock: null,
          isAvailable: false,
          message: `Menu item not found`,
        });
        allAvailable = false;
        continue;
      }

      // Check availability
      if (!menuItem.available) {
        results.push({
          itemId: orderItem.item,
          itemName: menuItem.name,
          requestedQuantity: orderItem.quantity,
          availableStock: menuItem.stock,
          isAvailable: false,
          message: `Menu item '${menuItem.name}' is currently not available`,
        });
        allAvailable = false;
        continue;
      }

      // Check stock (null = unlimited)
      if (menuItem.stock !== null && menuItem.stock !== undefined) {
        if (menuItem.stock < orderItem.quantity) {
          results.push({
            itemId: orderItem.item,
            itemName: menuItem.name,
            requestedQuantity: orderItem.quantity,
            availableStock: menuItem.stock,
            isAvailable: false,
            message: `Menu item '${menuItem.name}' chỉ còn ${menuItem.stock} phần, không đủ cho số lượng yêu cầu ${orderItem.quantity}`,
          });
          allAvailable = false;
          continue;
        }
      }

      // Available
      results.push({
        itemId: orderItem.item,
        itemName: menuItem.name,
        requestedQuantity: orderItem.quantity,
        availableStock: menuItem.stock,
        isAvailable: true,
        message: menuItem.stock === null 
          ? `Unlimited stock available`
          : `${menuItem.stock} available`,
      });
    }

    const unavailableItems = results.filter(r => !r.isAvailable);
    const message = allAvailable 
      ? 'All items are available'
      : `Có ${unavailableItems.length} món không đủ stock: ${unavailableItems.map(i => i.itemName).join(', ')}`;

    return {
      success: true,
      available: allAvailable,
      items: results,
      message,
    };
  }
}
