import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { About, AboutDocument } from './schemas/about.schema';

@Injectable()
export class AboutService {
  constructor(
    @InjectModel(About.name) private aboutModel: Model<AboutDocument>
  ) {}

  async getAbout(): Promise<About> {
    const about = await this.aboutModel.findOne();
    if (!about) {
      throw new NotFoundException('About không tồn tại');
    }
    return about;
  }

  async updateAbout(
    aboutId: string,
    updateData: Partial<About>
  ): Promise<About> {
    const about = await this.aboutModel.findByIdAndUpdate(aboutId, updateData, {
      new: true,
    });
    if (!about) {
      throw new NotFoundException('Không tìm thấy About');
    }
    return about;
  }

  // ✅ Update 1 section cụ thể trong About
  async updateSection(
    aboutId: string,
    sectionId: string,
    updateData: {
      title?: string;
      content?: string;
      type?: string;
      order?: number;
    }
  ): Promise<About> {
    if (!Types.ObjectId.isValid(sectionId)) {
      throw new NotFoundException('ID section không hợp lệ');
    }

    const about = await this.aboutModel.findOneAndUpdate(
      { _id: aboutId, 'sections._id': sectionId },
      {
        $set: {
          'sections.$.title': updateData.title,
          'sections.$.content': updateData.content,
          'sections.$.type': updateData.type,
          'sections.$.order': updateData.order,
        },
      },
      { new: true }
    );

    if (!about) {
      throw new NotFoundException('Không tìm thấy section cần update');
    }

    return about;
  }
}
