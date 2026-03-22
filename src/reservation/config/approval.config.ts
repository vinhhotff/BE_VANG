export const BULK_ORDER_CONFIG = {
  // Ngưỡng để yêu cầu phê duyệt
  THRESHOLD: {
    MIN_ITEMS: 20,           // Tổng số lượng items tối thiểu
    MIN_VALUE: 5000000,      // Giá trị tối thiểu (VND)
  },
  // Thời gian hết hạn
  AUTO_EXPIRE_HOURS: 48,      // Tự động hủy sau 48h không duyệt
  NOTIFICATION_BEFORE_EXPIRE_HOURS: 24, // Thông báo trước khi hết hạn
  // Các món đặc biệt luôn cần phê duyệt (bất kể số lượng)
  SPECIAL_ITEM_AUTO_APPROVE_MIN_QUANTITY: 10, // Món đặc biệt < 10 cái thì không cần phê duyệt
};

export class ApprovalConfig {
  private static instance: ApprovalConfig;
  private config = { ...BULK_ORDER_CONFIG };

  static getInstance(): ApprovalConfig {
    if (!ApprovalConfig.instance) {
      ApprovalConfig.instance = new ApprovalConfig();
    }
    return ApprovalConfig.instance;
  }

  getConfig() {
    return this.config;
  }

  updateConfig(newConfig: Partial<typeof BULK_ORDER_CONFIG>) {
    this.config = {
      ...this.config,
      ...newConfig,
      THRESHOLD: {
        ...this.config.THRESHOLD,
        ...(newConfig.THRESHOLD || {}),
      },
    };
  }

  /**
   * Kiểm tra xem đơn hàng có cần phê duyệt hay không
   * @param totalItems Tổng số lượng items
   * @param totalValue Tổng giá trị (VND)
   * @param hasSpecialItems Có món đặc biệt không
   * @returns true nếu cần phê duyệt
   */
  requiresApproval(totalItems: number, totalValue: number, hasSpecialItems: boolean = false): boolean {
    const { MIN_ITEMS, MIN_VALUE } = this.config.THRESHOLD;

    // Nếu có món đặc biệt với số lượng lớn
    if (hasSpecialItems && totalItems >= this.config.SPECIAL_ITEM_AUTO_APPROVE_MIN_QUANTITY) {
      return true;
    }

    // Kiểm tra ngưỡng thông thường
    return totalItems >= MIN_ITEMS || totalValue >= MIN_VALUE;
  }

  /**
   * Tính thời điểm hết hạn phê duyệt
   */
  getExpirationTime(): Date {
    const now = new Date();
    now.setHours(now.getHours() + this.config.AUTO_EXPIRE_HOURS);
    return now;
  }
}
