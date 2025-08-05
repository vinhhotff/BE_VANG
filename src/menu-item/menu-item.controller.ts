import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Query,
  Put 
} from '@nestjs/common';
import { Permission } from '../auth/decoration/setMetadata';
import { MenuItemService } from './menu-item.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Controller('menu-items')
export class MenuItemController {
  constructor(private readonly menuItemService: MenuItemService) {}

  @Permission('menuItem:create')
  @Post()
  create(@Body() createMenuItemDto: CreateMenuItemDto) {
    return this.menuItemService.create(createMenuItemDto);
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
  update(@Param('id') id: string, @Body() updateMenuItemDto: UpdateMenuItemDto) {
    return this.menuItemService.update(id, updateMenuItemDto);
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
}
