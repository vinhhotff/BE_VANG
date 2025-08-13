import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { FileUploadController } from './file-upload.controller';
import { FileUploadService } from './file-upload.service';
import { MongooseModule } from '@nestjs/mongoose';
import { File, FileSchema } from './schemas/file.schema';

@Module({
  imports: [
    MulterModule.register({
      dest: './public/uploads', // Thư mục tạm
    }),
    MongooseModule.forFeature([{ name: File.name, schema: FileSchema }]),
  ],
  controllers: [FileUploadController],
  providers: [FileUploadService],
  exports: [FileUploadService],
})
export class FileUploadModule {}
