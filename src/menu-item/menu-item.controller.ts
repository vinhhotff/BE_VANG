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
import { MenuItemService } from './menu-item.service';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Controller('menu-items')
export class MenuItemController {
  constructor(private readonly menuItemService: MenuItemService) {}

  @Post()
  create(@Body() createMenuItemDto: CreateMenuItemDto) {
    return this.menuItemService.create(createMenuItemDto);
  }

  @Get()
  findAll(
    @Query('category') category?: string,
    @Query('available') available?: string,
  ) {
    const isAvailable = available === 'true' ? true : available === 'false' ? false : undefined;
    return this.menuItemService.findAll(category, isAvailable);
  }

  @Get('categories')
  getCategories() {
    return this.menuItemService.getCategories();
  }

  @Get('category/:category')
  findByCategory(@Param('category') category: string) {
    return this.menuItemService.findByCategory(category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.menuItemService.findById(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMenuItemDto: UpdateMenuItemDto) {
    return this.menuItemService.update(id, updateMenuItemDto);
  }

  @Put(':id/availability')
  updateAvailability(
    @Param('id') id: string,
    @Body('available') available: boolean,
  ) {
    return this.menuItemService.updateAvailability(id, available);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.menuItemService.remove(id);
  }
}
