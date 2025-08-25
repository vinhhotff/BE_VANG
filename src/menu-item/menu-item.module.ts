import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MenuItemService } from './menu-item.service';
import { MenuItemController } from './menu-item.controller';
import { MenuItem, MenuItemSchema } from './schemas/menu-item.schema';
import { MulterModule } from '@nestjs/platform-express';
import { FileModule } from 'src/file/file.module';
import { MulterConfigService } from 'src/file/multer.config';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MenuItem.name, schema: MenuItemSchema }]),
    FileModule,
    MulterModule.register({
      dest: './uploads',
    }),
    MulterModule.registerAsync({ useClass: MulterConfigService })

  ],
  controllers: [MenuItemController],
  providers: [MenuItemService],
  exports: [MenuItemService],
})
export class MenuItemModule { }
