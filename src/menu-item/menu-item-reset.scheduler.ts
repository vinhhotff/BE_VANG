import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { MenuItem, MenuItemDocument } from './schemas/menu-item.schema';

@Injectable()
export class MenuItemResetScheduler {
    private readonly logger = new Logger(MenuItemResetScheduler.name);

    constructor(
        @InjectModel(MenuItem.name) private menuItemModel: Model<MenuItemDocument>,
    ) { }

    /**
     * Chạy lúc 00:00 mỗi ngày để đưa số dự trữ (stock) của món ăn về mức 20 mặc định.
     */
    @Cron('0 0 0 * * *') // Midnight (00:00) hàng ngày
    async resetDailyStock(): Promise<void> {
        this.logger.log('[Scheduler] Running daily menu item stock reset to 20...');

        try {
            // Cập nhật tất cả các món (Stock !== null) về 20
            const result = await this.menuItemModel.updateMany(
                { stock: { $ne: null } },
                { $set: { stock: 20 } },
            );

            this.logger.log(
                `[Scheduler] Daily stock reset executed: reset ${result.modifiedCount} menu items to 20.`,
            );
        } catch (error) {
            this.logger.error('[Scheduler] Error during daily menu item stock reset:', error);
        }
    }
}
