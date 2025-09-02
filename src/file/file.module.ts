import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { MulterModule } from '@nestjs/platform-express';
import { MulterConfigService } from './multer.config';
import { SupabaseModule } from 'src/config/supabase.module';
@Module({
  controllers: [FileController],
  providers: [FileService],
  imports: [
    MulterModule.registerAsync({
      useClass: MulterConfigService,
    }),
    SupabaseModule,
  ],
  exports: [FileService]
})
export class FileModule {}
