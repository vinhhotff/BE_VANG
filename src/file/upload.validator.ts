import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { extname } from 'path';

@Injectable()
export class ParseFilesPipe implements PipeTransform {
  private readonly allowedExtensions = [
    '.png',
    '.pdf',
    '.jpeg',
    '.jpg',
    '.avg',
    '.avif',
  ];

  transform(
    value: Express.Multer.File | Express.Multer.File[]
  ): Express.Multer.File[] {
    if (!value) {
      throw new BadRequestException('File(s) are required');
    }

    // Convert single file to array for consistent handling
    const files = Array.isArray(value) ? value : [value];

    if (files.length === 0) {
      throw new BadRequestException('File(s) are required');
    }

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

    return files;
  }
}
