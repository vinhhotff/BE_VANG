/**
 * DTOs cho Time-Based Inventory Check
 */

// ========== Cấu hình Tồn kho tích lũy ==========
export const TIME_BASED_INVENTORY_CONFIG = {
  // Số lượng có thể đáp ứng thêm mỗi ngày
  STOCK_PER_DAY: 20,
  // Thời gian tối thiểu để chuẩn bị (giờ)
  MIN_PREP_HOURS: 2,
  // Ngày tối đa có thể đặt trước
  MAX_ADVANCE_DAYS: 30,
};

export class TimeBasedInventoryConfig {
  private static instance: TimeBasedInventoryConfig;
  private stockPerDay: number = TIME_BASED_INVENTORY_CONFIG.STOCK_PER_DAY;

  static getInstance(): TimeBasedInventoryConfig {
    if (!TimeBasedInventoryConfig.instance) {
      TimeBasedInventoryConfig.instance = new TimeBasedInventoryConfig();
    }
    return TimeBasedInventoryConfig.instance;
  }

  getStockPerDay(): number {
    return this.stockPerDay;
  }

  setStockPerDay(value: number): void {
    if (value < 1) {
      throw new Error('Stock per day must be at least 1');
    }
    this.stockPerDay = value;
  }
}

// ========== Input DTOs ==========
export class CheckTimeBasedStockDto {
  targetDate: string; // ISO date string (YYYY-MM-DD)
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
}

export class ReserveTimeBasedStockDto {
  targetDate: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
  }>;
  orderId?: string;
}

// ========== Output DTOs ==========
export class TimeBasedStockItemResult {
  menuItemId: string;
  menuItemName: string;
  requestedQuantity: number;
  gapDays: number;
  totalCapacity: number;
  currentBooked: number;
  availableStock: number;
  isAvailable: boolean;
  message: string;
}

export class TimeBasedStockCheckResult {
  success: boolean;
  allAvailable: boolean;
  targetDate: string;
  today: string;
  stockPerDay: number;
  items: TimeBasedStockItemResult[];
  summary: {
    totalRequested: number;
    totalAvailable: number;
    minAvailableStock: number; // Stock nhỏ nhất trong các items
  };
  message: string;
}

export class TimeBasedStockReservationResult {
  success: boolean;
  reserved: boolean;
  targetDate: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    newBooked: number;
  }>;
  message: string;
}
