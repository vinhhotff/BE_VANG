import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GuestService } from './guest.service';
import { GuestController } from './guest.controller';
import { Guest, GuestSchema } from './schemas/guest.schema';
import { TableService } from 'src/table/table.service';
import { TableModule } from 'src/table/table.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Guest.name, schema: GuestSchema }]),TableModule],
  controllers: [GuestController],
  providers: [GuestService],
  exports: [GuestService],
})
export class GuestModule {}
