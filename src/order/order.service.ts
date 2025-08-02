import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  ForbiddenException 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order.dto';
import { MenuItem } from '../menu-item/schemas/menu-item.schema';
import { Guest } from '../guest/schemas/guest.schema';
import { User } from '../user/schemas/user.schema';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { MarkOrderPaidDto } from './dto/update-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItem>,
    @InjectModel(Guest.name) private guestModel: Model<Guest>,
    @InjectModel(User.name) private userModel: Model<User>,
    private readonly loyaltyService: LoyaltyService,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    const { items, guest, user } = createOrderDto;

    // Validate that only one of guest or user is provided
    if ((guest && user) || (!guest && !user)) {
      throw new BadRequestException('Must provide either guest or user, not both or neither');
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
    const validatedItems: { item: string; quantity: number }[] = [];

    for (const orderItem of items) {
      const menuItem = await this.menuItemModel.findById(orderItem.item).exec();
      if (!menuItem) {
        throw new NotFoundException(`Menu item with ID ${orderItem.item} not found`);
      }
      if (!menuItem.available) {
        throw new BadRequestException(`Menu item '${menuItem.name}' is not available`);
      }

      validatedItems.push({
        item: orderItem.item,
        quantity: orderItem.quantity,
      });

      totalPrice += menuItem.price * orderItem.quantity;
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
      await this.guestModel.findByIdAndUpdate(
        guest,
        { $push: { orders: savedOrder._id } },
        { new: true }
      ).exec();
    }

    return savedOrder;
  }

  async findAll(
    status?: OrderStatus,
    guest?: string,
    user?: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ orders: Order[]; total: number; totalPages: number }> {
    const filter: any = {};
    if (status) filter.status = status;
    if (guest) filter.guest = guest;
    if (user) filter.user = user;

    const skip = (page - 1) * limit;
    const total = await this.orderModel.countDocuments(filter);
    const totalPages = Math.ceil(total / limit);

    const orders = await this.orderModel
      .find(filter)
      .populate('items.item', 'name price category images')
      .populate('guest', 'tableCode')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    return { orders, total, totalPages };
  }

  async findById(id: string): Promise<Order> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID format');
    }

    const order = await this.orderModel
      .findById(id)
      .populate('items.item', 'name price category images')
      .populate('guest', 'tableCode')
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

  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID format');
    }

    if (!Object.values(OrderStatus).includes(status)) {
      throw new BadRequestException('Invalid order status');
    }

    const order = await this.orderModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .populate('items.item', 'name price category images')
      .populate('guest', 'tableCode')
      .populate('user', 'name email')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
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
        console.log('Lỗi khi cộng điểm loyalty:', error.message);
      }
    }

    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderStatusDto): Promise<Order> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID format');
    }

    const existingOrder = await this.orderModel.findById(id).exec();
    if (!existingOrder) {
      throw new NotFoundException('Order not found');
    }

    // Don't allow updates if order is already served or cancelled
    if (existingOrder.status === OrderStatus.SERVED || existingOrder.status === OrderStatus.CANCELLED) {
      throw new ForbiddenException(`Cannot update order with status: ${existingOrder.status}`);
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
      await this.guestModel.findByIdAndUpdate(
        order.guest,
        { $pull: { orders: id } },
        { new: true }
      ).exec();
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
            $sum: { $cond: [{ $eq: ['$status', OrderStatus.PENDING] }, 1, 0] }
          },
          preparing: {
            $sum: { $cond: [{ $eq: ['$status', OrderStatus.PREPARING] }, 1, 0] }
          },
          served: {
            $sum: { $cond: [{ $eq: ['$status', OrderStatus.SERVED] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', OrderStatus.CANCELLED] }, 1, 0] }
          },
          totalRevenue: {
            $sum: {
              $cond: [
                { $eq: ['$status', OrderStatus.SERVED] },
                '$totalPrice',
                0
              ]
            }
          }
        }
      }
    ]);

    return stats || {
      total: 0,
      pending: 0,
      preparing: 0,
      served: 0,
      cancelled: 0,
      totalRevenue: 0,
    };
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

  async markAsPaid (id: string, markOrderPaidDto: MarkOrderPaidDto): Promise<Order> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid order ID format');
    }

    const order = await this.orderModel
      .findByIdAndUpdate(id, { paid: true }, { new: true })
      .populate('items.item', 'name price category images')
      .populate('guest', 'tableCode')
      .populate('user', 'name email')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

}