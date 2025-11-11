import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController } from './loyalty.controller';
import { Loyalty, LoyaltySchema } from './schemas/loyalty.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Loyalty.name, schema: LoyaltySchema }]),
  ],
  controllers: [LoyaltyController],
  providers: [LoyaltyService],
  exports: [LoyaltyService], // Export để sử dụng trong OrderService
})
export class LoyaltyModule {}
