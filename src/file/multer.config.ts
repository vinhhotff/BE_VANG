import { Injectable } from "@nestjs/common/decorators/core/injectable.decorator";
import { MulterModuleOptions, MulterOptionsFactory } from "@nestjs/platform-express/multer/interfaces/files-upload-module.interface";
import * as fs from 'fs';
import { diskStorage } from "multer";
import path from "path";
@Injectable()
class MulterConfigService implements MulterOptionsFactory {
   getRootPath=()=>{
      return process.cwd();}
  
  ensureExists(targetDirectory:string){
    fs.mkdir(targetDirectory,{recursive:true},(err)=>{
        if(!err){
            console.log('create directory successfully');
            return;
        }
        switch(err.code){
            case 'EEXIST':
                console.log('directory already exists');
                break;
            case 'ENOTDIR':
                console.log('parent directory does not exist');
                break;
            default:
                console.log('failed to create directory:'+err.message);
                break;
        }
    });
  }
   createMulterOptions(): MulterModuleOptions {
    return {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const folder = req?.headers?.folder_type ?? "default";
          const uploadPath = path.join(this.getRootPath(), `public/images/${folder}`);
          this.ensureExists(uploadPath);
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          // get extension
          const extName = path.extname(file.originalname);
          // get base name
          const baseName = path.basename(file.originalname, extName);
          // final name
          const finalName = `${baseName}-${Date.now()}${extName}`;
          cb(null, finalName);
        },
      }),
    };
  }
}
export { MulterConfigService };