// payment.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/pay-ment.schema';
import { PaymentController } from './pay-ment.controller';
import { PayMentService } from './pay-ment.service';
import { OrderModule } from 'src/order/order.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),OrderModule
  ],
  controllers: [PaymentController],
  providers: [PayMentService],
  exports: [PayMentService, PayMentModule],
})
export class PayMentModule {}
