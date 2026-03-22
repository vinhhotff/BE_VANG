import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument, ReviewStatus } from './schemas/review.schema';
import { CreateReviewDto, UpdateReviewDto, ReplyReviewDto } from './dto/create-review.dto';
import { IUser } from '../user/user.interface';
import { RoleService } from '../role/role.service';

@Injectable()
export class ReviewService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    private readonly roleService: RoleService,
  ) {}

  private async getUserRoleName(user: IUser): Promise<string> {
    try {
      // Check if role is a string (from JWT payload)
      if (typeof user.role === 'string') {
        return user.role;
      }
      
      // Check if role is an object with name property (from JWT strategy populate)
      if (user.role && typeof user.role === 'object') {
        // Handle populated role object from JWT strategy
        if ('name' in user.role && typeof (user.role as any).name === 'string') {
          return (user.role as any).name;
        }
        
        // Handle ObjectId - need to fetch from database
        if (user.role instanceof Types.ObjectId) {
          try {
            const role = await this.roleService.findById(user.role.toString());
            return role?.name || '';
          } catch (error) {
            return '';
          }
        }
      }
      
      return '';
    } catch (error) {
      return '';
    }
  }

  async create(createReviewDto: CreateReviewDto, user?: IUser): Promise<Review> {
    // Check if user already reviewed this menu item
    if (user) {
      const existingReview = await this.reviewModel.findOne({
        menuItem: createReviewDto.menuItem,
        user: user._id,
        isDeleted: { $ne: true },
      }).exec();

      if (existingReview) {
        throw new BadRequestException('You have already reviewed this item');
      }
    }

    const review = new this.reviewModel({
      ...createReviewDto,
      user: user?._id,
      status: ReviewStatus.PENDING,
      createdBy: user ? { _id: user._id, email: user.email } : undefined,
      updatedBy: user ? { _id: user._id, email: user.email } : undefined,
    });

    return review.save();
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: ReviewStatus,
    menuItemId?: string,
  ) {
    const skip = (page - 1) * limit;
    const query: any = { isDeleted: { $ne: true } };

    if (status) {
      query.status = status;
    }

    if (menuItemId) {
      query.menuItem = menuItemId;
    }

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find(query)
        .populate('menuItem', 'name images')
        .populate('user', 'name email avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments(query).exec(),
    ]);

    return {
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByMenuItem(menuItemId: string, page: number = 1, limit: number = 10) {
    return this.findAll(page, limit, ReviewStatus.APPROVED, menuItemId);
  }

  async findOne(id: string): Promise<Review> {
    const review = await this.reviewModel
      .findById(id)
      .populate('menuItem', 'name images')
      .populate('user', 'name email avatarUrl')
      .exec();

    if (!review || review.isDeleted) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    return review;
  }

  async update(id: string, updateReviewDto: UpdateReviewDto, user: IUser): Promise<ReviewDocument> {
    const review = await this.reviewModel.findById(id).exec();
    if (!review || review.isDeleted) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    let roleName = '';
    let isAdmin = false;
    try {
      roleName = await this.getUserRoleName(user);
      isAdmin = roleName.toUpperCase() === 'ADMIN';
    } catch (error) {
      // If we can't get role but user passed permission guard, 
      // assume they have permission (permission guard already verified)
      // But for security, we'll still require explicit admin role for status updates
      isAdmin = false;
    }

    // Only allow user to update their own review, or admin to update status
    let reviewUserId: string | null = null;
    if (review.user) {
      if (review.user instanceof Types.ObjectId) {
        reviewUserId = review.user.toString();
      } else if (typeof review.user === 'object' && '_id' in review.user) {
        reviewUserId = (review.user as any)._id?.toString();
      } else if (typeof review.user === 'string') {
        reviewUserId = review.user;
      }
    }
    
    if (reviewUserId && reviewUserId !== user._id.toString() && !isAdmin) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    // If updating status, only admin can do it
    if (updateReviewDto.status && !isAdmin) {
      throw new ForbiddenException('Only admins can update review status');
    }

    // Convert status string to ReviewStatus enum if provided
    const updateData: any = {
      updatedBy: { _id: user._id, email: user.email },
    };

    // Only update fields that are provided
    if (updateReviewDto.rating !== undefined) {
      updateData.rating = updateReviewDto.rating;
    }
    if (updateReviewDto.comment !== undefined) {
      updateData.comment = updateReviewDto.comment;
    }
    if (updateReviewDto.images !== undefined) {
      updateData.images = updateReviewDto.images;
    }
    if (updateReviewDto.status !== undefined) {
      // Ensure status is valid enum value
      const validStatuses = Object.values(ReviewStatus);
      if (validStatuses.includes(updateReviewDto.status as ReviewStatus)) {
        updateData.status = updateReviewDto.status;
      } else {
        throw new BadRequestException(`Invalid status: ${updateReviewDto.status}`);
      }
    }

    Object.assign(review, updateData);

    return review.save();
  }

  async reply(id: string, replyDto: ReplyReviewDto, user: IUser): Promise<ReviewDocument> {
    const review = await this.reviewModel.findById(id).exec();
    if (!review || review.isDeleted) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    const roleName = await this.getUserRoleName(user);
    const isAdmin = roleName.toUpperCase() === 'ADMIN';
    const isStaff = roleName.toUpperCase() === 'STAFF';

    if (!isAdmin && !isStaff) {
      throw new ForbiddenException('Only staff and admins can reply to reviews');
    }

    review.repliedBy = {
      _id: user._id as any,
      email: user.email,
      reply: replyDto.reply,
      repliedAt: new Date(),
    };

    return review.save();
  }

  async remove(id: string, user: IUser): Promise<void> {
    const review = await this.reviewModel.findById(id).exec();
    if (!review || review.isDeleted) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    const roleName = await this.getUserRoleName(user);
    const isAdmin = roleName.toUpperCase() === 'ADMIN';

    let reviewUserId: string | null = null;
    if (review.user) {
      if (review.user instanceof Types.ObjectId) {
        reviewUserId = review.user.toString();
      } else if (typeof review.user === 'object' && '_id' in review.user) {
        reviewUserId = (review.user as any)._id?.toString();
      } else if (typeof review.user === 'string') {
        reviewUserId = review.user;
      }
    }

    // Only allow user to delete their own review, or admin to delete any
    if (reviewUserId && reviewUserId !== user._id.toString() && !isAdmin) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.reviewModel.findByIdAndUpdate(id, {
      isDeleted: true,
      deletedAt: new Date(),
      updatedBy: { _id: user._id, email: user.email },
    }).exec();
  }

  async getAverageRating(menuItemId: string): Promise<{ average: number; count: number }> {
    const result = await this.reviewModel.aggregate([
      {
        $match: {
          menuItem: menuItemId,
          status: ReviewStatus.APPROVED,
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: null,
          average: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
    ]);

    if (result.length === 0) {
      return { average: 0, count: 0 };
    }

    return {
      average: Math.round(result[0].average * 10) / 10, // Round to 1 decimal
      count: result[0].count,
    };
  }

  async getRatingDistribution(menuItemId: string) {
    const distribution = await this.reviewModel.aggregate([
      {
        $match: {
          menuItem: menuItemId,
          status: ReviewStatus.APPROVED,
          isDeleted: { $ne: true },
        },
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: -1 },
      },
    ]);

    // Initialize all ratings with 0
    const result: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    distribution.forEach((item) => {
      result[item._id] = item.count;
    });

    return result;
  }
}

