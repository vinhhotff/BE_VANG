import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Table, TableDocument } from './schemas/table.schema';
import { Reservation, ReservationStatus } from '../reservation/schemas/reservation.schema';

@Injectable()
export class TableResetScheduler {
  private readonly logger = new Logger(TableResetScheduler.name);

  constructor(
    @InjectModel(Table.name) private tableModel: Model<TableDocument>,
    @InjectModel(Reservation.name) private reservationModel: Model<Reservation>,
  ) {}

  /**
   * Chạy mỗi giờ một lần để kiểm tra và reset những bàn đang ở trạng thái 'reserved'
   * mà đã được đặt hơn 2 ngày (48 giờ) trước.
   * Sử dụng reservedAt thay vì updatedAt để tránh reset bàn bị cập nhật vì lý do khác.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async resetExpiredReservedTables(): Promise<void> {
    this.logger.log('[Scheduler] Checking for expired reserved tables...');

    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

    try {
      // Tìm tất cả bàn có status = 'reserved' và reservedAt > 2 ngày trước
      // Nếu reservedAt là null, sử dụng updatedAt như fallback
      const result = await this.tableModel.updateMany(
        {
          status: 'reserved',
          $or: [
            { reservedAt: { $lt: twoDaysAgo } },
            { reservedAt: null, updatedAt: { $lt: twoDaysAgo } }
          ]
        },
        {
          $set: {
            status: 'available',
            currentOrder: null,
            reservedAt: null,
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

  /**
   * Chạy lúc 00:05 mỗi ngày để reset bàn 'reserved' không còn reservation hợp lệ hôm nay.
   * Logic: tìm bàn 'reserved', kiểm tra xem có reservation đang active (pending/confirmed/arrived)
   * cho ngày hôm nay không. Nếu không có → reset về 'available'.
   * Bàn 'maintenance' sẽ không bị ảnh hưởng.
   */
  @Cron('0 5 0 * * *') // 00:05 hàng ngày
  async resetReservedTablesForNewDay(): Promise<void> {
    this.logger.log('[Scheduler] Running daily reserved-table reset for new day...');

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Lấy tất cả bàn đang ở trạng thái 'reserved'
      const reservedTables = await this.tableModel.find({ status: 'reserved' }).exec();

      if (reservedTables.length === 0) {
        this.logger.debug('[Scheduler] No reserved tables found.');
        return;
      }

      const tableIds = reservedTables.map(t => t._id);
      const reservedTableIdStrings = tableIds.map(id => id.toString());

      // Tìm các reservation đang active (pending/confirmed/arrived) cho ngày hôm nay
      // thuộc các bàn đang reserved
      const activeReservations = await this.reservationModel.find({
        table: { $in: reservedTableIdStrings },
        reservationDate: { $gte: today, $lt: tomorrow },
        status: {
          $in: [
            ReservationStatus.PENDING,
            ReservationStatus.PENDING_APPROVAL,
            ReservationStatus.CONFIRMED,
            ReservationStatus.ARRIVED,
          ],
        },
      }).exec();

      // Các bàn còn có reservation hợp lệ → KHÔNG reset
      const activeTableIds = new Set(
        activeReservations
          .map(r => r.table?.toString())
          .filter(Boolean) as string[],
      );

      // Các bàn reserved nhưng không còn reservation hợp lệ → reset về available
      const tablesToReset = reservedTables.filter(
        t => !activeTableIds.has(t._id.toString()),
      );

      if (tablesToReset.length === 0) {
        this.logger.debug('[Scheduler] All reserved tables have active reservations for today.');
        return;
      }

      const idsToReset = tablesToReset.map(t => t._id);

      const result = await this.tableModel.updateMany(
        { _id: { $in: idsToReset } },
        {
          $set: {
            status: 'available',
            currentOrder: null,
            reservedAt: null,
          },
        },
      );

      this.logger.log(
        `[Scheduler] Daily reset: ${result.modifiedCount} reserved table(s) → 'available' (maintenance tables excluded).`,
      );

      if (result.modifiedCount > 0) {
        for (const table of tablesToReset) {
          this.logger.debug(`[Scheduler] Reset table: ${table.tableName} (${table._id})`);
        }
      }
    } catch (error) {
      this.logger.error('[Scheduler] Error during daily reserved-table reset:', error);
    }
  }
}
