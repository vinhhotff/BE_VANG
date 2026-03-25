import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TableService } from './table.service';
import { TableController } from './table.controller';
import { Table, TableSchema } from './schemas/table.schema';
import { Reservation, ReservationSchema } from '../reservation/schemas/reservation.schema';
import { TableResetScheduler } from './table-reset.scheduler';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Table.name, schema: TableSchema },
      { name: Reservation.name, schema: ReservationSchema },
    ]),
  ],
  controllers: [TableController],
  providers: [TableService, TableResetScheduler],
  exports: [TableService],
})
export class TableModule { }

