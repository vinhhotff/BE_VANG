import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { QROrderService } from './qr-order.service';
import { QROrderController } from './qr-order.controller';
import { QRSession, QRSessionSchema } from './schemas/qr-session.schema';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: QRSession.name, schema: QRSessionSchema },
    ]),
    OrderModule, // Import OrderModule để sử dụng OrderService
  ],
  controllers: [QROrderController],
  providers: [QROrderService],
  exports: [QROrderService],
})
export class QROrderModule {}
