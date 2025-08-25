import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { extname } from 'path';

@Injectable()
export class ParseFilePipeDocument implements PipeTransform {
  private readonly allowedExtensions = ['.png', '.pdf', '.jpeg', '.jpg'];

  transform(value: Express.Multer.File | Express.Multer.File[]): Express.Multer.File | Express.Multer.File[] {
    if (!value) {
      throw new BadRequestException('File(s) are required');
    }

    const files = Array.isArray(value) ? value : [value];

    for (const file of files) {
      if (!file?.originalname) {
        throw new BadRequestException('Invalid file');
      }

      const extension = extname(file.originalname).toLowerCase();
      if (!this.allowedExtensions.includes(extension)) {
        throw new BadRequestException(
          `File type ${extension} not supported. Allowed types: ${this.allowedExtensions.join(', ')}`
        );
      }
    }

    return value;
  }
}
