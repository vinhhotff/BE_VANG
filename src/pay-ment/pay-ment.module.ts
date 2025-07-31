// payment.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Payment, PaymentSchema } from './schemas/pay-ment.schema';
import { PayMentController } from './pay-ment.controller';
import { PaymentService } from './pay-ment.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
  ],
  controllers: [PayMentController],
  providers: [PaymentService],
  exports: [PaymentService, PayMentModule],
})
export class PayMentModule {}
