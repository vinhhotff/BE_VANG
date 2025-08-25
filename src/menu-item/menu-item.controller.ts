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
  UseGuards,
} from '@nestjs/common';
import { Permission } from '../auth/decoration/setMetadata';
import { MenuItemService } from './menu-item.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { IUser } from 'src/user/user.interface';
import { ParseFilePipeDocument } from 'src/file/upload.validator';
import { PermissionGuard } from 'src/permission/permission.guard';

@Controller('menu-items')
export class MenuItemController {
  constructor(
    private readonly menuItemService: MenuItemService,
  ) { }

  @Permission('menuItem:create')
  @Post()
  @UseInterceptors(FilesInterceptor('images', 5)) // tối đa 5 ảnh
  async create(
    @UploadedFiles(ParseFilePipeDocument) files: Express.Multer.File[],
    @Body() createMenuItemDto: CreateMenuItemDto,
    @Req() req: { user: IUser },
  ) {
    const imageNames = files.map((f) => f.filename);

    // truyền xuống service để lưu DB
    return this.menuItemService.create(
      { ...createMenuItemDto, images: imageNames },
      req.user,
    );
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
  @UseGuards(PermissionGuard)
  @Patch(':id')
  @UseInterceptors(FilesInterceptor('images', 10)) // cho phép upload tối đa 10 file
  async update(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
    @UploadedFiles() files: Express.Multer.File[], // nhận file ảnh
    @Req() req: { user: IUser },
  ) {
    // nếu có file thì map thành mảng ObjectId (sau khi lưu ở service)
    return this.menuItemService.update(id, updateMenuItemDto, req.user, files);
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
  // Thêm ảnh vào MenuItem
  @Permission('menuItem:update')
  @UseGuards(PermissionGuard)
  @Patch(':id/images')
  @UseInterceptors(FilesInterceptor('images', 10)) // upload tối đa 10 file
  async addImages(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: { user: IUser },
  ) {
    // Lấy filenames từ files đã upload
    const filenames = files.map(file => file.filename); // hoặc file.path nếu lưu đường dẫn
    return this.menuItemService.addImages(id, filenames, req.user);
  }

  // Xóa một ảnh khỏi MenuItem
  @Permission('menuItem:update')
  @UseGuards(PermissionGuard)
  @Delete(':id/images/:filename')
  async removeImage(
    @Param('id') id: string,
    @Param('filename') filename: string,
    @Req() req: { user: IUser },
  ) {
    return this.menuItemService.removeImage(id, filename, req.user);
  }

}

