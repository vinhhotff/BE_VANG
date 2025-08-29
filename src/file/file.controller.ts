import {
  Controller,
  Post,
  Body,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UploadedFiles,
  ParseFilePipeBuilder,
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
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /\.(png|jpe?g|gif|bmp|webp)$/ }),
        ],
      })
    )
    file: Express.Multer.File
  ) {
    return this.fileService.uploadFile(file);
  }

  @Post('uploads')
  @UseInterceptors(FilesInterceptor('files', 5))
  async uploadMultipleFiles(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 })
        .addFileTypeValidator({ fileType: /\.(png|jpe?g|gif|bmp|webp)$/ })
        .build({ fileIsRequired: true })
    )
    files: Express.Multer.File[]
  ) {
    return this.fileService.uploadFiles(files);
  }

  @Delete(':path')
  async remove(@Param('path') path: string) {
    return this.fileService.remove(path);
  }
}
