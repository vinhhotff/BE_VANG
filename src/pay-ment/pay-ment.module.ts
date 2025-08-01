// payment.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/pay-ment.schema';
import { PaymentController } from './pay-ment.controller';
import { PaymentService } from './pay-ment.service';
import { OrderModule } from 'src/order/order.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),OrderModule
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService, PayMentModule],
})
export class PayMentModule {}
