import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GuestService } from './guest.service';
import { GuestController } from './guest.controller';
import { Guest, GuestSchema } from './schemas/guest.schema';
import { TableService } from 'src/table/table.service';
import { TableModule } from 'src/table/table.module';
import { Table, TableSchema } from 'src/table/schemas/table.schema';
import { Payment, PaymentSchema } from 'src/pay-ment/schemas/pay-ment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Guest.name, schema: GuestSchema },
      { name: Table.name, schema: TableSchema },
      { name: Payment.name, schema: PaymentSchema }, // 👈 Thêm cái này
    ]),
    forwardRef(() => TableModule),
  ],
  controllers: [GuestController],
  providers: [GuestService,TableService],
  exports: [GuestService,GuestModule],
})
export class GuestModule {}
