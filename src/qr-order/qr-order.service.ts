import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QRSession, QRSessionStatus } from './schemas/qr-session.schema';
import { CreateQRSessionDto, UpdateQRSessionDto } from './dto/create-qr-session.dto';
import { QROrderDto } from './dto/create-qr-session.dto';
import { OrderService } from '../order/order.service';
import { CreateOrderDto } from '../order/dto/create-order.dto';

@Injectable()
export class QROrderService {
  constructor(
    @InjectModel(QRSession.name) private qrSessionModel: Model<QRSession>,
    private readonly orderService: OrderService,
  ) {}

  async createQRSession(createQRSessionDto: CreateQRSessionDto): Promise<QRSession> {
    const { tableCode, expirationHours } = createQRSessionDto;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (expirationHours || 2));

    // Tạo mã QR đơn giản (trong thực tế có thể dùng thư viện QR code)
    const qrCodeData = `${tableCode}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const session = new this.qrSessionModel({
      qrCode: qrCodeData,
      tableCode,
      expiresAt,
    });

    return session.save();
  }
  async validateQR(qrCode: string): Promise<QRSession> {
    const session = await this.qrSessionModel.findOne({
      qrCode,
      status: QRSessionStatus.ACTIVE,
    }).exec();

    if (!session || new Date() > session.expiresAt) {
      throw new BadRequestException('QR code is invalid or has expired');
    }

    return session;
  }

  async updateQRSession(qrCode: string, updateDto: UpdateQRSessionDto): Promise<QRSession> {
    const session = await this.validateQR(qrCode);
    Object.assign(session, updateDto);
    return session.save();
  }

  async addOrderToQRSession(orderDto: QROrderDto): Promise<QRSession> {
    const session = await this.validateQR(orderDto.qrCode);
    session.orders.push(
      ...orderDto.items.map(item => new Types.ObjectId(item.item))
    ); // Convert string to ObjectId
    return session.save();
  }
}