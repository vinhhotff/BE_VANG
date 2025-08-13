import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItemService } from './menu-item.service';
import { MenuItemController } from './menu-item.controller';
import { MenuItem, MenuItemSchema } from './schemas/menu-item.schema';
import { FileUploadModule } from '../file-upload/file-upload.module';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MenuItem.name, schema: MenuItemSchema }]),
    FileUploadModule,
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [MenuItemController],
  providers: [MenuItemService],
  exports: [MenuItemService],
})
export class MenuItemModule {}
