import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { PayOS } from '@payos/node';
import { Payment, PaymentDocument } from './schemas/pay-ment.schema';
import { CreatePaymentDto } from './dto/create-pay-ment.dto';
import { UpdatePaymentDto } from './dto/update-pay-ment.dto';
import { CreatePayOSLinkDto } from './dto/create-payos-link.dto';
import { ConfirmPayOSPaymentDto } from './dto/confirm-payos-payment.dto';
import { Order, OrderDocument } from '../order/schemas/order.schema';

@Injectable()
export class PayMentService {
  private readonly payos: PayOS;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    private configService: ConfigService
  ) {
    const clientId = this.configService.get<string>('PAYOS_CLIENT_ID') || '';
    const apiKey = this.configService.get<string>('PAYOS_API_KEY') || '';
    const checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY') || '';

    if (!clientId || !apiKey || !checksumKey) {
      console.error('PayOS credentials missing:', {
        hasClientId: !!clientId,
        hasApiKey: !!apiKey,
        hasChecksumKey: !!checksumKey,
      });
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

    // Validate PayOS is initialized
    if (!this.payos) {
      throw new BadRequestException(
        'PayOS payment is not configured. Please contact administrator.'
      );
    }

    // Verify order exists and populate items for PayOS
    const order = await this.orderModel
      .findById(orderId)
      .populate('items.item', 'name price')
      .exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    console.log('Creating PayOS payment link for order:', {
      orderId,
      amount,
      description,
    });

    // Generate order code (must be unique and between 100000 and 999999)
    // Check if order already has a payosOrderCode to avoid duplicates
    let orderCode: number;
    if ((order as any).payosOrderCode) {
      orderCode = (order as any).payosOrderCode;
    } else {
      orderCode = Math.floor(100000 + Math.random() * 900000);
    }

    // Build items array from order items for PayOS
    const items = order.items.map((item: any) => {
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
      // Generate short description from orderId (last 8 chars)
      const shortOrderId = orderId.slice(-8);
      paymentDescription = `Order #${shortOrderId}`;
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

      console.log('PayOS payment link created:', {
        orderCode,
        checkoutUrl: paymentLink.checkoutUrl,
      });

      // Store order code in order for later verification
      (order as any).payosOrderCode = orderCode;
      await order.save();

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

      console.log('PayOS payment info:', {
        orderCode: paymentInfo.orderCode,
        status: paymentInfo.status,
        code: (paymentInfo as any).code,
        transactionDateTime: (paymentInfo as any).transactionDateTime,
      });

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
}
