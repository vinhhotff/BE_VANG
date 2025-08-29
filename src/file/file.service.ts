// src/file/file.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseConfig } from '../config/supabase.config';
import { Express } from 'express';

@Injectable()
export class FileService {
  private bucket = 'uploads';

  constructor(private supabaseConfig: SupabaseConfig) {} // inject service

  async uploadFile(file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');

    const supabase = this.supabaseConfig.getClient();
    const fileName = `${Date.now()}-${file.originalname}`;

    const { data, error } = await supabase.storage
      .from(this.bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) throw new BadRequestException(error.message);

    const { data: publicUrlData, error: urlError } = supabase.storage
      .from(this.bucket)
      .getPublicUrl(fileName);

    if (urlError) throw new BadRequestException(urlError.message);

    return {
      name: file.originalname,
      path: data?.path,
      url: publicUrlData.publicUrl,
    };
  }

  async uploadFiles(files: Express.Multer.File[]) {
    return Promise.all(files.map((file) => this.uploadFile(file)));
  }

  async remove(filePath: string) {
    const supabase = this.supabaseConfig.getClient();
    const { error } = await supabase.storage
      .from(this.bucket)
      .remove([filePath]);

    if (error) throw new BadRequestException(error.message);

    return { message: 'File deleted', filePath };
  }
}
