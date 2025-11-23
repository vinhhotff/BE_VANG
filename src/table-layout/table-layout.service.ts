import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { TableLayout, TableLayoutDocument } from './schemas/table-layout.schema';
import { CreateTableLayoutDto, UpdateTableLayoutDto } from './dto/create-table-layout.dto';

@Injectable()
export class TableLayoutService {
  constructor(
    @InjectModel(TableLayout.name)
    private tableLayoutModel: Model<TableLayoutDocument>,
  ) {}

  async create(createTableLayoutDto: CreateTableLayoutDto): Promise<TableLayout> {
    // If this layout is set as active, deactivate all other layouts
    if (createTableLayoutDto.isActive) {
      await this.tableLayoutModel.updateMany(
        { isActive: true },
        { $set: { isActive: false } },
      );
    }

    const createdLayout = new this.tableLayoutModel(createTableLayoutDto);
    return createdLayout.save();
  }

  async findAll(): Promise<TableLayout[]> {
    return this.tableLayoutModel.find().exec();
  }

  async findOne(id: string): Promise<TableLayout> {
    const layout = await this.tableLayoutModel.findById(id).exec();
    if (!layout) {
      throw new NotFoundException(`Table layout with ID ${id} not found`);
    }
    return layout;
  }

  async getActiveLayout(): Promise<TableLayout | null> {
    const layout = await this.tableLayoutModel.findOne({ isActive: true }).exec();
    return layout;
  }

  async update(id: string, updateTableLayoutDto: UpdateTableLayoutDto): Promise<TableLayout> {
    // If this layout is being set as active, deactivate all other layouts
    if (updateTableLayoutDto.isActive) {
      await this.tableLayoutModel.updateMany(
        { isActive: true, _id: { $ne: id } },
        { $set: { isActive: false } },
      );
    }

    const updatedLayout = await this.tableLayoutModel
      .findByIdAndUpdate(id, updateTableLayoutDto, { new: true })
      .exec();

    if (!updatedLayout) {
      throw new NotFoundException(`Table layout with ID ${id} not found`);
    }

    return updatedLayout;
  }

  async setActive(id: string): Promise<TableLayout> {
    // Deactivate all other layouts
    await this.tableLayoutModel.updateMany(
      { isActive: true },
      { $set: { isActive: false } },
    );

    // Activate this layout
    const layout = await this.tableLayoutModel
      .findByIdAndUpdate(id, { isActive: true }, { new: true })
      .exec();

    if (!layout) {
      throw new NotFoundException(`Table layout with ID ${id} not found`);
    }

    return layout;
  }

  async remove(id: string): Promise<void> {
    const result = await this.tableLayoutModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException(`Table layout with ID ${id} not found`);
    }
  }
}


