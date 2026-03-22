import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReservationService } from './reservation.service';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class ReservationScheduler {
  private readonly logger = new Logger(ReservationScheduler.name);

  constructor(
    private readonly reservationService: ReservationService,
    private readonly inventoryService: InventoryService,
  ) {}

  /**
   * Run every hour to expire pending approvals that have passed their expiration time
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredApprovals() {
    this.logger.log('Running expired approvals cleanup...');
    try {
      const result = await this.reservationService.autoExpirePendingApprovals();
      if (result.expired > 0) {
        this.logger.log(
          `Expired ${result.expired} pending approvals, released ${result.inventoryReleased} inventory items`
        );
      }
    } catch (error) {
      this.logger.error('Failed to expire pending approvals:', error);
    }
  }

  /**
   * Run every 30 minutes to expire pending reservations that have been waiting too long
   * Reservations with pending status but no deposit after 24 hours will be cancelled
   */
  @Cron('0 */30 * * * *') // Every 30 minutes
  async handleExpiredPendingReservations() {
    this.logger.log('Running pending reservations cleanup...');
    try {
      const result = await this.reservationService.autoExpirePendingReservations(24);
      if (result.expired > 0) {
        this.logger.log(
          `Expired ${result.expired} pending reservations, released ${result.inventoryReleased} inventory items`
        );
      }
    } catch (error) {
      this.logger.error('Failed to expire pending reservations:', error);
    }
  }
}
