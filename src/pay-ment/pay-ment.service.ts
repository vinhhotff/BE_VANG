import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import { Payment, PaymentDocument } from './schemas/pay-ment.schema';
import { CreatePaymentDto } from './dto/create-pay-ment.dto';
import { UpdatePaymentDto } from './dto/update-pay-ment.dto';
import { CreatePayOSLinkDto } from './dto/create-payos-link.dto';
import { ConfirmPayOSPaymentDto } from './dto/confirm-payos-payment.dto';
import { ProcessFreeOrderDto } from './dto/process-free-order.dto';
import { Order, OrderDocument } from '../order/schemas/order.schema';
import { OrderService } from '../order/order.service';
import { OrderStatus } from '../order/schemas/order.schema';
import { InventoryService } from '../inventory/inventory.service';
import { MenuItemIngredient, MenuItemIngredientDocument } from '../inventory/schemas/menu-item-ingredient.schema';
import { Ingredient, IngredientDocument } from '../inventory/schemas/ingredient.schema';
import { MenuItem } from '../menu-item/schemas/menu-item.schema';

@Injectable()
export class PayMentService {
  private readonly payos: PayOS;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private configService: ConfigService,
    @Inject(forwardRef(() => OrderService))
    private orderService: OrderService,
    @Inject(forwardRef(() => InventoryService))
    private inventoryService: InventoryService,
    @InjectModel(MenuItemIngredient.name) private menuItemIngredientModel: Model<MenuItemIngredientDocument>,
    @InjectModel(Ingredient.name) private ingredientModel: Model<IngredientDocument>,
    @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItem>,
  ) {
    const clientId = this.configService.get<string>('PAYOS_CLIENT_ID') || '';
    const apiKey = this.configService.get<string>('PAYOS_API_KEY') || '';
    const checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY') || '';

    if (!clientId || !apiKey || !checksumKey) {
      // Silent fail - payment service will throw error when used
    } else {
      this.payos = new PayOS({
        clientId,
        apiKey,
        checksumKey,
      });
    }
  }

  async create(createPaymentDto: CreatePaymentDto): Promise<Payment> {
    const { guest, user, orders } = createPaymentDto;

    if ((guest && user) || (!guest && !user)) {
      throw new BadRequestException(
        'Must provide either guest or user, not both or neither'
      );
    }

    const orderDocuments = await this.orderModel
      .find({ _id: { $in: orders } })
      .exec();
    if (orderDocuments.length !== orders.length) {
      throw new NotFoundException('One or more orders not found');
    }

    const payment = new this.paymentModel(createPaymentDto);
    const savedPayment = await payment.save();

    for (const order of orderDocuments) {
      order.isPaid = true;
      await order.save();
    }

    return savedPayment;
  }

  async findAll(): Promise<Payment[]> {
    return this.paymentModel.find().populate('orders').exec();
  }
async getTotalRevenue(): Promise<number> {
  const result = await this.paymentModel.aggregate([
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  return result[0]?.total || 0;
}

  async findById(id: string): Promise<Payment> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid payment ID format');
    }

    const payment = await this.paymentModel
      .findById(id)
      .populate('orders')
      .exec();
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async update(
    id: string,
    updatePaymentDto: UpdatePaymentDto
  ): Promise<Payment> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid payment ID format');
    }

    const payment = await this.paymentModel
      .findByIdAndUpdate(id, updatePaymentDto, { new: true })
      .exec();
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid payment ID format');
    }

    const payment = await this.paymentModel.findById(id).exec();
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.paymentModel.findByIdAndDelete(id).exec();
  }

  async createPayOSPaymentLink(createPayOSLinkDto: CreatePayOSLinkDto) {
    const { orderId, amount, description, returnUrl, cancelUrl } = createPayOSLinkDto;

    // Reject payment link creation for zero-amount orders
    // Free orders should use /payment/payos/process-free-order instead
    if (amount === 0) {
      throw new BadRequestException(
        'Cannot create payment link for zero-amount orders. Use /payment/payos/process-free-order for free orders.'
      );
    }

    // Validate PayOS is initialized
    if (!this.payos) {
      throw new BadRequestException(
        'PayOS payment is not configured. Please contact administrator.'
      );
    }

    // Check if this is a reservation payment (orderId starts with "reservation_")
    const isReservationPayment = orderId && orderId.startsWith('reservation_');
    
    let order: any = null;
    let orderCode: number;
    let items: any[] = [];

    if (isReservationPayment) {
      // For reservation payments, generate order code directly
      orderCode = Math.floor(100000 + Math.random() * 900000);
      // Use default item for reservation deposit
      items = [
        {
          name: description || 'Đặt cọc giữ bàn',
          quantity: 1,
          price: Math.round(amount),
        }
      ];
    } else {
      // For regular orders, verify order exists and populate items
      order = await this.orderModel
        .findById(orderId)
        .populate('items.item', 'name price')
        .exec();
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Generate order code (must be unique and between 100000 and 999999)
      // Check if order already has a payosOrderCode to avoid duplicates
      if ((order as any).payosOrderCode) {
        orderCode = (order as any).payosOrderCode;
      } else {
        orderCode = Math.floor(100000 + Math.random() * 900000);
      }

      // Build items array from order items for PayOS
      items = order.items.map((item: any) => {
        const menuItem = item.item;
        const itemName = typeof menuItem === 'object' && menuItem?.name 
          ? menuItem.name 
          : 'Item';
        const itemPrice = item.unitPrice || (typeof menuItem === 'object' && menuItem?.price ? menuItem.price : 0);
        
        return {
          name: itemName,
          quantity: item.quantity || 1,
          price: Math.round(itemPrice),
        };
      });
    }

    // Get frontend URL - prioritize provided URLs, then env var, then default
    const defaultFeUrl = this.configService.get<string>('FE_URL') || 'https://nesjt-agoda-fe-git-v1-vinhhoffs-projects.vercel.app';
    const feUrl = defaultFeUrl.replace(/\/+$/, ''); // Remove trailing slashes
    
    // Use provided returnUrl/cancelUrl if available, otherwise use default
    const finalReturnUrl = returnUrl || `${feUrl}/payment/success`;
    const finalCancelUrl = cancelUrl || `${feUrl}/payment/cancel`;

    // PayOS requires description to be max 25 characters
    const maxDescriptionLength = 25;
    let paymentDescription: string;
    
    if (description && description.trim()) {
      // Use provided description, truncate if needed
      paymentDescription = description.trim();
      if (paymentDescription.length > maxDescriptionLength) {
        paymentDescription = paymentDescription.substring(0, maxDescriptionLength);
      }
    } else {
      if (isReservationPayment) {
        paymentDescription = 'Đặt cọc giữ bàn';
      } else {
        // Generate short description from orderId (last 8 chars)
        const shortOrderId = orderId.slice(-8);
        paymentDescription = `Order #${shortOrderId}`;
      }
      // Ensure it's within limit
      if (paymentDescription.length > maxDescriptionLength) {
        paymentDescription = paymentDescription.substring(0, maxDescriptionLength);
      }
    }

    try {
      // Use PayOS SDK to create payment link
      const paymentLink = await this.payos.paymentRequests.create({
        orderCode: orderCode,
        amount: Math.round(amount), // PayOS requires integer amount
        description: paymentDescription,
        returnUrl: finalReturnUrl,
        cancelUrl: finalCancelUrl,
        items: items.length > 0 ? items : [
          {
            name: `Order #${orderId}`,
            quantity: 1,
            price: Math.round(amount),
          }
        ],
      });

      // Store order code in order for later verification (only for regular orders)
      if (!isReservationPayment && order) {
        (order as any).payosOrderCode = orderCode;
        await order.save();
      }

      return {
        success: true,
        paymentLink: paymentLink.checkoutUrl,
        orderCode: orderCode,
      };
    } catch (error: any) {
      console.error('PayOS API error:', error);
      
      // Handle PayOS SDK errors
      if (error.code !== undefined) {
        throw new BadRequestException(
          error.desc || `PayOS API error: code ${error.code}`
        );
      }
      
      throw new BadRequestException(
        `PayOS API error: ${error.message || 'Unknown error'}`
      );
    }
  }

  async confirmPayOSPayment(confirmDto: ConfirmPayOSPaymentDto) {
    const { orderId, orderCode, amount } = confirmDto;

    // Validate PayOS is initialized
    if (!this.payos) {
      throw new BadRequestException(
        'PayOS payment is not configured. Please contact administrator.'
      );
    }

    // Verify order exists
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Verify order code matches
    if ((order as any).payosOrderCode !== orderCode) {
      throw new BadRequestException('Invalid order code');
    }

    // Verify amount matches
    if (Math.round(order.totalPrice) !== Math.round(amount)) {
      throw new BadRequestException('Amount mismatch');
    }

    try {
      // Use PayOS SDK to get payment information
      const paymentInfo = await this.payos.paymentRequests.get(orderCode);

      // Check if payment is successful
      // PayOS SDK status values: PENDING, CANCELLED, UNDERPAID, EXPIRED, PROCESSING, FAILED
      // Payment is considered successful if:
      // 1. Has transactionDateTime (indicates payment was completed)
      // 2. Or status is not in failed states
      const hasTransaction = (paymentInfo as any).transactionDateTime !== null && 
                            (paymentInfo as any).transactionDateTime !== undefined;
      const isSuccessCode = (paymentInfo as any).code === '00';
      const isNotFailed = paymentInfo.status !== 'FAILED' && 
                         paymentInfo.status !== 'CANCELLED' && 
                         paymentInfo.status !== 'EXPIRED';
      
      // Payment is successful if it has transaction data or success code
      const isPaid = hasTransaction || isSuccessCode;
      
      if (isPaid) {
        // Mark order as paid
        order.isPaid = true;
        await order.save();

        // CRITICAL: Check stock availability BEFORE marking as served.
        // If stock is insufficient, payment should NOT be confirmed.
        // However, if order already has reserved stock (future order), skip
        // stock check here since reservation was done at creation time.
        const isStockReserved = (order as any).isStockReserved === true;
        const reservationDate = (order as any).reservationDate as Date | undefined;
        const isFutureOrder = reservationDate && new Date(reservationDate) > new Date(new Date().setHours(0, 0, 0, 0));

        try {
          const orderItems = order.items.map((item: any) => ({
            item: item.item._id?.toString() || item.item.toString(),
            quantity: item.quantity,
          }));

          if (isStockReserved && isFutureOrder) {
            // Future order: ingredient stock was already reserved at creation.
            // confirmIngredientReservation will deduct real stock now.
            for (const orderItem of orderItems) {
              await this.inventoryService.confirmIngredientReservation(
                orderItem.item,
                orderItem.quantity,
                reservationDate,
                order._id.toString(),
              );
            }
          } else if (!isStockReserved) {
            // Immediate order or order without reservation:
            // Check and deduct ingredient stock now (legacy path).
            for (const orderItem of orderItems) {
              const menuItem = await this.menuItemModel.findById(orderItem.item).exec();
              if (!menuItem) {
                throw new BadRequestException(`Menu item not found: ${orderItem.item}`);
              }

              const menuItemIngredients = await this.menuItemIngredientModel
                .find({ menuItem: orderItem.item })
                .populate('ingredient')
                .exec();

              for (const menuItemIngredient of menuItemIngredients) {
                const ingredient = (menuItemIngredient as any).ingredient;
                const requiredQuantity = (menuItemIngredient as any).quantity * orderItem.quantity;

                if (ingredient.currentStock < requiredQuantity) {
                  throw new BadRequestException(
                    `Insufficient stock for ingredient '${ingredient.name}'. Required: ${requiredQuantity}, Available: ${ingredient.currentStock}`
                  );
                }
              }
            }
          }
          // else: immediate order with reservation -- stock already deducted at creation

          // Now update status (SERVING): deduct menu item stock
          // Skip ingredient confirm since we already handled it above
          await this.orderService.updateStatus(order._id.toString(), OrderStatus.SERVED, { skipIngredientConfirm: true });
        } catch (stockError: any) {
          throw new BadRequestException(
            `Payment successful but order cannot be served due to stock issues: ${stockError.message}. Please contact support for refund.`
          );
        }

        // Create payment record
        const payment = new this.paymentModel({
          method: 'qr',
          amount: amount,
          paidAt: new Date(),
          user: order.user,
          orders: [order._id],
        });
        await payment.save();

        return {
          success: true,
          message: 'Payment confirmed successfully',
        };
      } else {
        throw new BadRequestException(
          `Payment not completed. Status: ${paymentInfo.status}`
        );
      }
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      // Handle PayOS SDK errors
      if (error.code !== undefined) {
        throw new BadRequestException(
          error.desc || `PayOS API error: code ${error.code}`
        );
      }
      
      throw new BadRequestException(
        `PayOS verification error: ${error.message || 'Unknown error'}`
      );
    }
  }

  async processFreeOrder(processFreeOrderDto: ProcessFreeOrderDto) {
    const { orderId, autoServe = true } = processFreeOrderDto;

    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order ID format');
    }

    const order = await this.orderModel
      .findById(orderId)
      .populate('items.item', 'name price')
      .exec();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.isPaid) {
      return {
        success: true,
        message: 'Order is already paid',
        orderId: order._id.toString(),
        status: order.status,
        isFree: order.isFree,
      };
    }

    if (order.totalPrice > 0) {
      throw new BadRequestException(
        'This endpoint is only for free orders (totalPrice = 0). For paid orders, please use PayOS payment.'
      );
    }

    if (order.status !== OrderStatus.PENDING &&
        order.status !== OrderStatus.PENDING_APPROVAL &&
        order.status !== OrderStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot process free order with status '${order.status}'. Order must be in PENDING, PENDING_APPROVAL, or CONFIRMED status.`
      );
    }

    const orderItems = order.items.map((item: any) => ({
      item: item.item._id?.toString() || item.item.toString(),
      quantity: item.quantity,
    }));

    // Check stock availability before marking as paid
    for (const orderItem of orderItems) {
      const menuItem = await this.menuItemModel.findById(orderItem.item).exec();
      if (!menuItem) {
        throw new BadRequestException(`Menu item not found: ${orderItem.item}`);
      }

      if (menuItem.stock !== null && menuItem.stock !== undefined) {
        if (menuItem.stock < orderItem.quantity) {
          throw new BadRequestException(
            `Menu item '${menuItem.name}' chỉ còn ${menuItem.stock} phần, không đủ cho số lượng yêu cầu ${orderItem.quantity}`
          );
        }
      }

      const menuItemIngredients = await this.menuItemIngredientModel
        .find({ menuItem: orderItem.item })
        .populate('ingredient')
        .exec();

      for (const menuItemIngredient of menuItemIngredients) {
        const ingredient = (menuItemIngredient as any).ingredient;
        const requiredQuantity = (menuItemIngredient as any).quantity * orderItem.quantity;

        if (ingredient.currentStock < requiredQuantity) {
          throw new BadRequestException(
            `Insufficient stock for ingredient '${ingredient.name}'. Required: ${requiredQuantity}, Available: ${ingredient.currentStock}`
          );
        }
      }
    }

    // Mark order as paid and free
    order.isPaid = true;
    order.isFree = true;
    await order.save();

    // If autoServe is true, advance to SERVED status (deducts stock)
    if (autoServe) {
      try {
        await this.orderService.updateStatus(order._id.toString(), OrderStatus.SERVED);
      } catch (stockError: any) {
        throw new BadRequestException(
          `Order marked as paid but cannot serve due to stock issues: ${stockError.message}`
        );
      }
    } else {
      // Advance to CONFIRMED if still in PENDING
      if (order.status === OrderStatus.PENDING || order.status === OrderStatus.PENDING_APPROVAL) {
        try {
          await this.orderService.updateStatus(order._id.toString(), OrderStatus.CONFIRMED);
        } catch (e) {
          // If transition fails, order stays as is but is still paid
        }
      }
    }

    // Get final order state
    const updatedOrder = await this.orderModel
      .findById(orderId)
      .populate('items.item', 'name price category images')
      .exec();

    return {
      success: true,
      message: 'Free order processed successfully',
      orderId: order._id.toString(),
      status: updatedOrder?.status || OrderStatus.CONFIRMED,
      isFree: true,
      isPaid: true,
      totalPrice: order.totalPrice,
    };
  }
}
