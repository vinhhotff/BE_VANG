import { Controller, Get, Post, Body, Patch, Param, Delete, UseInterceptors, UploadedFile, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator, UploadedFiles, ParseFilePipeBuilder } from '@nestjs/common';
import { FileService } from './file.service';
import { CreateFileDto } from './dto/create-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { FileInterceptor } from '@nestjs/platform-express/multer/interceptors/file.interceptor';
import { FilesInterceptor } from '@nestjs/platform-express/multer/interceptors/files.interceptor';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) { }

  @Post('upload')
  @UseInterceptors(FileInterceptor('fileUpload')) // chỉ 1 file
  uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /\.(png|jpe?g|gif|bmp|webp)$/ })
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return {
      message: 'Upload file successfully',
      fileName: file.filename,
    };
  }
  @Post('uploads')
  @UseInterceptors(FilesInterceptor('files', 5)) // tối đa 5 file
  uploadMultipleFiles(
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 5 * 1024 * 1024 }) // 5MB
        .addFileTypeValidator({ fileType: /\.(png|jpe?g|gif|bmp|webp)$/ })
        .build({ fileIsRequired: true }),
    )
    files: Express.Multer.File[],
  ) {
    return {
      message: 'Upload multiple files successfully',
      files: files.map((f) => f.filename),
    };
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fileService.remove(+id);
  }
}
