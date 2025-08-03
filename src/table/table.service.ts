import { PermissionModule } from './../permission/permission.module';
import { SoftDeleteModel, softDeletePlugin } from 'soft-delete-plugin-mongoose';
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Table, TableDocument } from './schemas/table.schema';
import { CreateTableDto } from './dto/create-table.dto';
import { UpdateTableDto } from './dto/update-table.dto';
import { IUser } from 'src/user/user.interface';

@Injectable()
export class TableService {
  constructor(@InjectModel(Table.name) private tableModel: SoftDeleteModel<TableDocument>) {}

  async create(createTableDto: CreateTableDto): Promise<Table> {
    const createdTable = new this.tableModel(createTableDto);
    return createdTable.save();
  }

  async findAll(currentPage: number, limit: number, qs: string = '') {
    // Xử lý input
    const page = Math.max(1, currentPage); // Đảm bảo page không âm
    const defaultLimit = Math.max(1, Math.min(+limit || 10, 100)); // Giới hạn 1-100, mặc định 10

    // Tính offset
    const offset = (page - 1) * defaultLimit;

    // Phân tích qs thành filter
    const filter = this.parseQuery(qs);

    // Tính tổng số mục
    const totalItems = await this.tableModel.countDocuments(filter);

    // Thực thi truy vấn
    const result = await this.tableModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .exec();

    const totalPages = Math.ceil(totalItems / defaultLimit);

    return {
      results: result,
      meta: {
        total: totalItems,
        page,
        limit: defaultLimit,
        totalPages,
      },
    };
  }

  // Hàm phân tích qs chỉ cho bộ lọc
  private parseQuery(qs: string) {
    const filter: any = {};

    if (qs) {
      const conditions = qs.split(',').map((part) => part.trim().split(':'));
      conditions.forEach(([key, value]) => {
        if (key && value) {
          // Chỉ xử lý bộ lọc, bỏ qua sort
          filter[key] = { $regex: value, $options: 'i' }; // Không phân biệt hoa thường
        }
      });
    }

    return filter;
  }

  async findOne(id: string): Promise<TableDocument> {
    const table = await this.tableModel.findById(id).populate('currentOrder').exec();
    if (!table) {
      throw new NotFoundException(`Table #${id} not found`);
    }
    return table;
  }

  async update(id: string, updateTableDto: UpdateTableDto): Promise<Table> {
    const existingTable = await this.tableModel.findByIdAndUpdate(id, updateTableDto, { new: true }).exec();
    if (!existingTable) {
      throw new NotFoundException(`Table #${id} not found`);
    }
    return existingTable;
  }
async remove(id: string, user: IUser): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('ID table không hợp lệ');
    }

    const table = await this.tableModel.findById(id).exec();
    if (!table) {
      throw new NotFoundException('Không tìm thấy table');
    }

    await this.tableModel.findByIdAndUpdate(id, {
      deletedBy: {
        _id: user._id,
        email: user.email,
      },
    });

    await this.tableModel.softDelete({ _id: id });

    return {
      message: 'Đã xóa table thành công',
    };
  }

  // Kiểm tra xem bàn có đang available không
  async checkTableAvailability(tableId: string): Promise<boolean> {
    const table = await this.findOne(tableId);
    return table.status === 'available';
  }

  // Cập nhật status của bàn
  async updateTableStatus(tableId: string, status: 'available' | 'occupied' | 'reserved'): Promise<Table> {
    const updateData: any = { status };
    
    // Nếu chuyển sang available, xóa currentOrder
    if (status === 'available') {
      updateData.currentOrder = null;
    }
    
    const table = await this.tableModel.findByIdAndUpdate(tableId, updateData, { new: true }).exec();
    if (!table) {
      throw new NotFoundException(`Table #${tableId} not found`);
    }
    
    return table;
  }

  // Gán order cho bàn
  async assignOrderToTable(tableId: string, orderId: string): Promise<Table> {
    const table = await this.findOne(tableId);
    
    if (table.status !== 'available') {
      throw new BadRequestException(`Table ${table.tableName} is not available`);
    }
    
    const updatedTable = await this.tableModel.findByIdAndUpdate(
      tableId,
      {
        currentOrder: new Types.ObjectId(orderId),
        status: 'occupied',
      },
      { new: true },
    ).exec();
    
    if (!updatedTable) {
      throw new NotFoundException(`Table #${tableId} not found`);
    }
    
    return updatedTable;
  }

  // Giải phóng bàn sau khi thanh toán
  async releaseTable(tableId: string): Promise<Table> {
    return this.updateTableStatus(tableId, 'available');
  }

  // Tìm bàn theo status
  async findByStatus(status: 'available' | 'occupied' | 'reserved'): Promise<Table[]> {
    return this.tableModel.find({ status }).populate('currentOrder').exec();
  }

  // Tìm bàn theo location
  async findByLocation(location: string): Promise<Table[]> {
    return this.tableModel.find({ location }).populate('currentOrder').exec();
  }
}

