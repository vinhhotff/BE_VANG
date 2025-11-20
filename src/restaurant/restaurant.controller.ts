import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';
import { Permission, Public } from '../auth/decoration/setMetadata';

@Controller('restaurants')
export class RestaurantController {
  constructor(private readonly restaurantService: RestaurantService) {}

  @Permission('restaurant:create')
  @Post()
  create(@Body() createRestaurantDto: CreateRestaurantDto) {
    return this.restaurantService.create(createRestaurantDto);
  }

  @Get()
  findAll(@Query('domain') domain?: string, @Query('subdomain') subdomain?: string) {
    if (domain) {
      return this.restaurantService.findByDomain(domain);
    }
    if (subdomain) {
      return this.restaurantService.findBySubdomain(subdomain);
    }
    return this.restaurantService.findAll();
  }

  @Public() // Public endpoint - cho phép guest xem thông tin nhà hàng
  @Get('default')
  getDefault() {
    return this.restaurantService.getDefault();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.restaurantService.findOne(id);
  }

  @Permission('restaurant:update')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
  ) {
    return this.restaurantService.update(id, updateRestaurantDto);
  }

  @Permission('restaurant:delete')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.restaurantService.remove(id);
  }
}

