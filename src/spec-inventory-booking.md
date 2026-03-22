# Restaurant Management System - 3 Business Problems Solution

## Overview
This document outlines the solution for 3 critical business problems in the restaurant management system:
1. **Inventory Management by D-Day** - Check inventory based on actual usage date
2. **Integrated Booking** - Single flow for table reservation + ordering
3. **Bulk Order Approval** - Manual approval process for large orders

---

## Problem 1: Inventory Management by D-Day

### Problem Statement
- Each menu item has a daily limit (e.g., only 20 Peking Duck per day)
- Customer A books 2 days in advance and reserves ALL 20 units
- Customer B books 1 day in advance for the same day - should see "Out of Stock"
- System must check inventory by **usage date (D-Day)**, not booking date

### Solution

#### Schema Changes

**MenuItem Schema - Add daily limit fields:**
```typescript
@Prop({ type: Number, default: null })
dailyLimit: number; // Maximum quantity per day (null = unlimited)

@Prop({ type: Number, default: 0 })
reservedCount: number; // Current reserved count for today
```

**Order Schema - Add reservation date:**
```typescript
@Prop({ type: Date })
reservationDate: Date; // The date when the order will be served/used

@Prop({ type: String, enum: ['pending', 'pending_approval', 'confirmed', 'preparing', 'served', 'cancelled'], default: 'pending' })
status: string;

// New field to track inventory reservation
@Prop({ type: Boolean, default: false })
inventoryReserved: boolean;
```

**New Schema: DailyInventoryReservation**
```typescript
@Schema({ timestamps: true })
export class DailyInventoryReservation {
  @Prop({ type: Types.ObjectId, ref: 'MenuItem', required: true })
  menuItem: Types.ObjectId;

  @Prop({ required: true })
  date: Date; // The usage date (D-Day)

  @Prop({ type: Number, default: 0 })
  totalReserved: number; // Total quantity reserved for this day

  @Prop({ type: Number })
  dailyLimit: number; // Daily limit for this item
}
```

#### Service Logic

**InventoryCheckService:**
1. `checkAvailability(menuItemId, date, quantity)` - Check if quantity is available for given date
2. `reserveInventory(order)` - Reserve inventory when order is confirmed
3. `releaseInventory(order)` - Release inventory when order is cancelled
4. `getAvailableQuantity(menuItemId, date)` - Get available quantity for a date

**Flow:**
1. When customer selects menu items, system checks `DailyInventoryReservation` for that date
2. If (totalReserved + requestedQuantity) > dailyLimit → Return "Out of Stock"
3. If available → Create temporary reservation (expires in 15 minutes if not paid)
4. When payment confirmed → Confirm the reservation
5. When order served → Deduct from actual inventory

---

## Problem 2: Integrated Booking (Single Flow)

### Problem Statement
Combine table reservation and ordering into a single seamless experience:
- Step 1: Select time and number of guests
- Step 2: Show available tables (visual floor plan)
- Step 3: Select menu items
- Step 4: Deposit payment for both table and items

### Solution

#### Schema Changes

**Reservation Schema - Expand to include full booking:**
```typescript
@Prop({ type: Types.ObjectId, ref: 'Table' })
table: Types.ObjectId;

@Prop({ type: [
  {
    item: { type: Types.ObjectId, ref: 'MenuItem', required: true },
    quantity: { type: Number, required: true },
    unitPrice: { type: Number, required: true },
    subtotal: { type: Number, required: true },
  }
]})
items: Array<{
  item: Types.ObjectId;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}>;

@Prop({ type: Number })
totalAmount: number;

@Prop({ type: Number })
depositAmount: number;

@Prop({ type: Boolean, default: false })
depositPaid: boolean;

@Prop({ type: String, enum: ReservationStatus, default: ReservationStatus.PENDING })
status: ReservationStatus;
```

**New: TableReservationSlot Schema**
```typescript
@Schema({ timestamps: true })
export class TableReservationSlot {
  @Prop({ type: Types.ObjectId, ref: 'Table', required: true })
  table: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  timeSlot: string; // e.g., "19:00"

  @Prop({ type: Types.ObjectId, ref: 'Reservation' })
  reservation: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isReserved: boolean;
}
```

#### API Endpoints

1. **POST /reservations/full-booking** - Create full booking (time + table + items + deposit)
2. **GET /reservations/available-tables** - Get available tables for date/time
3. **GET /reservations/slots/:date** - Get time slots for a specific date
4. **POST /reservations/:id/confirm-deposit** - Confirm deposit payment
5. **GET /reservations/my-bookings** - Get customer's bookings

#### Service Logic

**FullBookingService:**
1. `checkTableAvailability(date, time, numberOfGuests)` - Check which tables are free
2. `createBooking(bookingDto)` - Create reservation with items
3. `calculateDeposit(totalAmount)` - Calculate deposit (e.g., 30% of total)
4. `confirmBooking(bookingId, paymentInfo)` - Confirm after deposit

---

## Problem 3: Bulk Order Approval

### Problem Statement
- Regular orders are automatically confirmed
- Large orders (50+ items) require manual approval because:
  - May affect other customers
  - Kitchen needs time to prepare
  - May need to order more ingredients

### Solution

#### Configuration

**System Config:**
```typescript
// Config to determine threshold
BULK_ORDER_THRESHOLD = 30; // items that trigger approval
BULK_ORDER_ITEM_THRESHOLD = 10; // quantity per item that triggers approval
```

#### Schema Changes

**Order Schema - Extended status:**
```typescript
// Updated status enum
export enum OrderStatus {
  PENDING = 'pending',
  PENDING_APPROVAL = 'pending_approval',  // NEW: Waiting for admin approval
  CONFIRMED = 'confirmed',                  // NEW: After approval
  PREPARING = 'preparing',
  SERVED = 'served',
  CANCELLED = 'cancelled',
}

// Add fields for approval process
@Prop({ type: Types.ObjectId, ref: 'User' })
approvedBy: Types.ObjectId;

@Prop()
approvedAt: Date;

@Prop()
approvalNote: string;

@Prop({ type: Boolean, default: false })
isBulkOrder: boolean;

@Prop({ type: String, enum: ['auto', 'manual'], default: 'auto' })
approvalType: 'auto' | 'manual';
```

#### Service Logic

**BulkOrderService:**
1. `isBulkOrder(items)` - Check if order qualifies as bulk order
2. `createOrderWithApproval(createOrderDto)` - Create order with auto-check
3. `approveOrder(orderId, adminId, note)` - Admin approves
4. `rejectOrder(orderId, adminId, note)` - Admin rejects
5. `getPendingApprovals()` - Get all orders waiting for approval

#### API Endpoints

1. **POST /orders/with-approval** - Create order (auto-check bulk)
2. **GET /orders/pending-approval** - List orders waiting for approval
3. **POST /orders/:id/approve** - Approve bulk order (Admin)
4. **POST /orders/:id/reject** - Reject bulk order (Admin)
5. **GET /orders/:id/approval-status** - Get approval status

#### Notifications

- When bulk order created → Notify admins
- When approved → Notify customer to make deposit
- When rejected → Notify customer with reason

---

## Implementation Priority

1. **Phase 1: Backend Core**
   - Update schemas (MenuItem, Order, Reservation)
   - Create new schemas (DailyInventoryReservation, TableReservationSlot)
   - Implement services

2. **Phase 2: API Endpoints**
   - Inventory check endpoints
   - Full booking endpoints
   - Bulk order approval endpoints

3. **Phase 3: Frontend**
   - Inventory display with daily availability
   - Integrated booking flow UI
   - Admin approval dashboard

---

## Database Collections

1. **orders** - Extended with approval fields
2. **reservations** - Extended with items and deposit
3. **menu_items** - Extended with dailyLimit
4. **daily_inventory_reservations** - NEW
5. **table_reservation_slots** - NEW

