import { Injectable } from '@nestjs/common';
import {
  MulterModuleOptions,
  MulterOptionsFactory,
} from '@nestjs/platform-express/multer';
import { memoryStorage } from 'multer';

@Injectable()
class MulterConfigService implements MulterOptionsFactory {
  createMulterOptions(): MulterModuleOptions {
    return {
      storage: memoryStorage(), // chỉ lưu vào RAM, không ghi ra disk
    };
  }
}
export { MulterConfigService };
