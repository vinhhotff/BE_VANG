import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Table, TableDocument } from './schemas/table.schema';

@Injectable()
export class TableResetScheduler {
  private readonly logger = new Logger(TableResetScheduler.name);

  constructor(
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
  ) {}

  /**
   * Chạy mỗi giờ một lần để kiểm tra và reset những bàn đang ở trạng thái 'reserved'
   * mà đã được đặt hơn 2 ngày (48 giờ) trước.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async resetExpiredReservedTables(): Promise<void> {
    this.logger.log('[Scheduler] Checking for expired reserved tables...');

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    try {
      // Tìm tất cả bàn có status = 'reserved' và updatedAt > 2 ngày trước
      const result = await this.tableModel.updateMany(
        {
          status: 'reserved',
          updatedAt: { $lt: twoDaysAgo },
        },
        {
          $set: {
            status: 'available',
            currentOrder: null,
          },
        },
      );

      if (result.modifiedCount > 0) {
        this.logger.log(
          `[Scheduler] Reset ${result.modifiedCount} expired reserved table(s) to 'available'.`,
        );
      } else {
        this.logger.debug('[Scheduler] No expired reserved tables found.');
      }
    } catch (error) {
      this.logger.error('[Scheduler] Error resetting expired tables:', error);
    }
  }
}
