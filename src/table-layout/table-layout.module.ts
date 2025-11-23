import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TableLayoutController } from './table-layout.controller';
import { TableLayoutService } from './table-layout.service';
import { TableLayout, TableLayoutSchema } from './schemas/table-layout.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TableLayout.name, schema: TableLayoutSchema },
    ]),
  ],
  controllers: [TableLayoutController],
  providers: [TableLayoutService],
  exports: [TableLayoutService],
})
export class TableLayoutModule {}


