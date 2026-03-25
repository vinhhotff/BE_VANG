import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItemService } from './menu-item.service';
import { MenuItemController } from './menu-item.controller';
import { MenuItem, MenuItemSchema } from './schemas/menu-item.schema';
import { FileModule } from 'src/file/file.module';
import { SupabaseModule } from 'src/config/supabase.module';
import { MenuItemResetScheduler } from './menu-item-reset.scheduler';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MenuItem.name, schema: MenuItemSchema }]),
    FileModule, SupabaseModule
  ],
  controllers: [MenuItemController],
  providers: [MenuItemService, MenuItemResetScheduler],
  exports: [MenuItemService],
})
export class MenuItemModule { }
