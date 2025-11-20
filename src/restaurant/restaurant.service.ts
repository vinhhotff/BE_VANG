import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Restaurant, RestaurantDocument } from './schemas/restaurant.schema';
import { CreateRestaurantDto } from './dto/create-restaurant.dto';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectModel(Restaurant.name)
    private restaurantModel: Model<RestaurantDocument>,
  ) {}

  async create(createRestaurantDto: CreateRestaurantDto): Promise<Restaurant> {
    const restaurant = new this.restaurantModel(createRestaurantDto);
    return restaurant.save();
  }

  async findAll(): Promise<Restaurant[]> {
    return this.restaurantModel.find({ isActive: true }).exec();
  }

  async findOne(id: string): Promise<Restaurant> {
    const restaurant = await this.restaurantModel.findById(id).exec();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }
    return restaurant;
  }

  async findByDomain(domain: string): Promise<Restaurant | null> {
    return this.restaurantModel.findOne({ domain, isActive: true }).exec();
  }

  async findBySubdomain(subdomain: string): Promise<Restaurant | null> {
    return this.restaurantModel.findOne({ subdomain, isActive: true }).exec();
  }

  async getDefault(): Promise<Restaurant | null> {
    // Get the first active restaurant as default
    return this.restaurantModel.findOne({ isActive: true }).exec();
  }

  async update(
    id: string,
    updateRestaurantDto: UpdateRestaurantDto,
  ): Promise<Restaurant> {
    const restaurant = await this.restaurantModel
      .findByIdAndUpdate(id, updateRestaurantDto, { new: true })
      .exec();
    if (!restaurant) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }
    return restaurant;
  }

  async remove(id: string): Promise<void> {
    const result = await this.restaurantModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Restaurant with ID ${id} not found`);
    }
  }
}

