import {
  Controller,
  Post,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseFilePipeBuilder,
  BadRequestException,
  Headers,
} from '@nestjs/common';
import { FileService } from './file.service';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';
import { FilesInterceptor } from '@nestjs/platform-express/multer/interceptors/files.interceptor';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('fileUpload'))
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /\.(png|jpe?g|gif|bmp|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Headers('bucket') bucket: string, // ✅ lấy từ header
  ) {
    if (!bucket) {
      throw new BadRequestException('Bucket name is required');
    }
    return this.fileService.uploadFile(file, bucket);
  }

  @Post('uploads')
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadMultipleFiles(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 }) // 5MB
        .addFileTypeValidator({ fileType: /\.(png|jpe?g|gif|bmp|webp)$/ })
        .build({ fileIsRequired: true }),
    )
    files: Express.Multer.File[],
    @Headers('bucket') bucket: string, // ✅ cũng lấy từ header cho thống nhất
  ) {
    if (!bucket) {
      throw new BadRequestException('Bucket name is required');
    }
    return this.fileService.uploadFiles(files, bucket);
  }

  @Delete(':path')
  async remove(
    @Param('path') path: string,
    @Headers('bucket') bucket: string, // ✅ lấy từ header thay vì body
  ) {
    if (!bucket) {
      throw new BadRequestException('Bucket name is required');
    }
    return this.fileService.remove(path, bucket);
  }
}
