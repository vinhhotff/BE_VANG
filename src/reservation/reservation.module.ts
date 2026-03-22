import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { ReservationScheduler } from './reservation.scheduler';
import { Reservation, ReservationSchema } from './schemas/reservation.schema';
import { Table, TableSchema } from '../table/schemas/table.schema';
import { MenuItem, MenuItemSchema } from '../menu-item/schemas/menu-item.schema';
import { InventoryModule } from '../inventory/inventory.module';
import { NotificationModule } from '../notification/notification.module';
import { TableModule } from '../table/table.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Reservation.name, schema: ReservationSchema },
      { name: Table.name, schema: TableSchema },
      { name: MenuItem.name, schema: MenuItemSchema },
    ]),
    InventoryModule,
    NotificationModule,
    TableModule,
  ],
  controllers: [ReservationController],
  providers: [ReservationService, ReservationScheduler],
  exports: [ReservationService],
})
export class ReservationModule {}
