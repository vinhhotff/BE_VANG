import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Contact, ContactDocument, ContactStatus } from './schemas/contact.schema';
import { CreateContactDto, UpdateContactDto, ReplyContactDto } from './dto/contact.dto';
import { IUser } from '../user/user.interface';

@Injectable()
export class ContactService {
  constructor(
    @InjectModel(Contact.name) private contactModel: Model<ContactDocument>,
  ) {}

  // ========== Public: Create Contact ==========
  async create(createContactDto: CreateContactDto): Promise<Contact> {
    const contact = new this.contactModel(createContactDto);
    return contact.save();
  }

  // ========== Admin: Get All Contacts ==========
  async findAll(
    page: number = 1,
    limit: number = 10,
    status?: ContactStatus,
  ): Promise<{ data: Contact[]; total: number; page: number; limit: number }> {
    const query: any = {};
    if (status) {
      query.status = status;
    }

    const [data, total] = await Promise.all([
      this.contactModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.contactModel.countDocuments(query).exec(),
    ]);

    return { data, total, page, limit };
  }

  // ========== Admin: Get Single Contact ==========
  async findOne(id: string): Promise<Contact> {
    const contact = await this.contactModel.findById(id).exec();
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact;
  }

  // ========== Admin: Update Contact Status ==========
  async update(
    id: string,
    updateContactDto: UpdateContactDto,
  ): Promise<Contact> {
    const contact = await this.contactModel
      .findByIdAndUpdate(id, updateContactDto, { new: true })
      .exec();
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact;
  }

  // ========== Admin: Reply to Contact ==========
  async reply(
    id: string,
    replyContactDto: ReplyContactDto,
    user: IUser,
  ): Promise<Contact> {
    const contact = await this.findOne(id);
    
    contact.status = ContactStatus.REPLIED;
    contact.replyMessage = replyContactDto.replyMessage;
    contact.repliedBy = user._id as any;
    contact.repliedAt = new Date();

    return contact.save();
  }

  // ========== Admin: Accept/Confirm Contact ==========
  async accept(id: string): Promise<Contact> {
    const contact = await this.contactModel
      .findByIdAndUpdate(
        id,
        { status: ContactStatus.READ },
        { new: true }
      )
      .exec();
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact;
  }

  // ========== Admin: Reject/Close Contact ==========
  async reject(id: string, reason?: string): Promise<Contact> {
    const contact = await this.contactModel
      .findByIdAndUpdate(
        id,
        { 
          status: ContactStatus.CLOSED,
          replyMessage: reason || 'Yêu cầu đã được từ chối/xử lý'
        },
        { new: true }
      )
      .exec();
    if (!contact) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
    return contact;
  }

  // ========== Admin: Delete Contact ==========
  async remove(id: string): Promise<void> {
    const result = await this.contactModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Contact with ID ${id} not found`);
    }
  }

  // ========== Stats for Dashboard ==========
  async getStats(): Promise<{
    total: number;
    pending: number;
    replied: number;
    closed: number;
  }> {
    const [total, pending, replied, closed] = await Promise.all([
      this.contactModel.countDocuments().exec(),
      this.contactModel.countDocuments({ status: ContactStatus.PENDING }).exec(),
      this.contactModel.countDocuments({ status: ContactStatus.REPLIED }).exec(),
      this.contactModel.countDocuments({ status: ContactStatus.CLOSED }).exec(),
    ]);
    return { total, pending, replied, closed };
  }
}
