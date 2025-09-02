import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseConfig } from '../config/supabase.config';

@Injectable()
export class FileService {
  constructor(private supabaseConfig: SupabaseConfig) {}

  async uploadFile(file: Express.Multer.File, bucket: string) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const supabase = this.supabaseConfig.getClient();
    const fileName = `${Date.now()}-${file.originalname}`;
    console.log(`Uploading ${file.originalname} to bucket ${bucket}`); // Gỡ lỗi

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      console.error('Upload error:', error); // Gỡ lỗi
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }

    if (!data) {
      throw new BadRequestException('File upload failed, no data returned.');
    }

    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    if (!publicUrlData.publicUrl) {
      throw new BadRequestException('Failed to retrieve public URL');
    }

    console.log('Uploaded file URL:', publicUrlData.publicUrl); // Gỡ lỗi

    return {
      name: file.originalname,
      path: data.path,
      url: publicUrlData.publicUrl,
    };
  }

  async uploadFiles(files: Express.Multer.File[], bucket: string) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files provided');
    }
    return Promise.all(files.map((file) => this.uploadFile(file, bucket)));
  }

  async remove(filePath: string, bucket: string) {
    const supabase = this.supabaseConfig.getClient();
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Remove error:', error); // Gỡ lỗi
      throw new BadRequestException(`Delete failed: ${error.message}`);
    }

    return { message: 'File deleted', filePath };
  }
}