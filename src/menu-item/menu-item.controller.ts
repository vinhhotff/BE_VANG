import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Put,
  UseInterceptors,
  UploadedFiles,
  Req,
} from '@nestjs/common';
import { Permission } from '../auth/decoration/setMetadata';
import { MenuItemService } from './menu-item.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from '../file-upload/file-upload.service';
import { IUser } from 'src/user/user.interface';
import { File } from '../file-upload/schemas/file.schema';

@Controller('menu-items')
export class MenuItemController {
  constructor(
    private readonly menuItemService: MenuItemService,
    private readonly fileUploadService: FileUploadService,
  ) {}

  @Permission('menuItem:create')
  @Post()
  @UseInterceptors(FilesInterceptor('images', 10))
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() createMenuItemDto: CreateMenuItemDto,
    @Req() req: { user: IUser },
  ) {
    if (files && files.length > 0) {
      const fileDocs: File[] = await Promise.all(
        files.map(file => this.fileUploadService.uploadFile(file, 'menu-item-images', req.user._id.toString()))
      );
      const fileIds = fileDocs.map(file => file._id.toString());
      createMenuItemDto.images = fileIds;
    }
    return this.menuItemService.create(createMenuItemDto, req.user);
  }

  @Permission('menuItem:findAll')
  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('available') available?: string,
  ) {
    const isAvailable = available === 'true' ? true : available === 'false' ? false : undefined;
    return this.menuItemService.findAll(category, isAvailable);
  }

  @Permission('menuItem:getCategories')
  @Get('categories')
  getCategories() {
    return this.menuItemService.getCategories();
  }

  @Permission('menuItem:findByCategory')
  @Get('category/:category')
  findByCategory(@Param('category') category: string) {
    return this.menuItemService.findByCategory(category);
  }

  @Permission('menuItem:findOne')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menuItemService.findById(id);
  }

  @Permission('menuItem:update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
    @Req() req: { user: IUser },
  ) {
    return this.menuItemService.update(id, updateMenuItemDto, req.user);
  }

  @Permission('menuItem:updateAvailability')
  @Put(':id/availability')
  updateAvailability(
    @Param('id') id: string,
    @Body('available') available: boolean,
  ) {
    return this.menuItemService.updateAvailability(id, available);
  }

  @Permission('menuItem:remove')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.menuItemService.remove(id);
  }

  @Permission('menuItem:uploadImages')
  @Patch(':id/images')
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: { user: IUser },
  ) {
    const fileDocs: File[] = await Promise.all(
      files.map(file => this.fileUploadService.uploadFile(file, 'menu-item-images', req.user._id.toString()))
    );
    const newFileIds = fileDocs.map(file => file._id.toString());

    const menuItem = await this.menuItemService.findById(id);
    const existingImageIds = menuItem.images ? menuItem.images.map(imgId => imgId.toString()) : [];
    
    const updatedImages = [...existingImageIds, ...newFileIds];

    return this.menuItemService.update(id, { images: updatedImages }, req.user);
  }
}
