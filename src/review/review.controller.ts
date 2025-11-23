import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ReviewService } from './review.service';
import { CreateReviewDto, UpdateReviewDto, ReplyReviewDto } from './dto/create-review.dto';
import { Permission, Public, User } from '../auth/decoration/setMetadata';
import { IUser } from '../user/user.interface';
import { ReviewStatus } from './schemas/review.schema';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Public()
  @Get('menu-item/:menuItemId')
  async getReviewsByMenuItem(
    @Param('menuItemId') menuItemId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.reviewService.findByMenuItem(menuItemId, +page, +limit);
  }

  @Public()
  @Get('menu-item/:menuItemId/rating')
  async getAverageRating(@Param('menuItemId') menuItemId: string) {
    return this.reviewService.getAverageRating(menuItemId);
  }

  @Public()
  @Get('menu-item/:menuItemId/rating-distribution')
  async getRatingDistribution(@Param('menuItemId') menuItemId: string) {
    return this.reviewService.getRatingDistribution(menuItemId);
  }

  @Public()
  @Post()
  async create(@Body() createReviewDto: CreateReviewDto, @User() user?: IUser) {
    return this.reviewService.create(createReviewDto, user);
  }

  @Permission('review:read')
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('status') status?: ReviewStatus,
    @Query('menuItemId') menuItemId?: string,
  ) {
    return this.reviewService.findAll(+page, +limit, status, menuItemId);
  }

  @Public()
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.reviewService.findOne(id);
  }

  @Permission('review:update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @User() user: IUser,
  ) {
    return this.reviewService.update(id, updateReviewDto, user);
  }

  @Permission('review:reply')
  @Patch(':id/reply')
  async reply(
    @Param('id') id: string,
    @Body() replyDto: ReplyReviewDto,
    @User() user: IUser,
  ) {
    return this.reviewService.reply(id, replyDto, user);
  }

  @Permission('review:delete')
  @Delete(':id')
  async remove(@Param('id') id: string, @User() user: IUser) {
    return this.reviewService.remove(id, user);
  }
}

