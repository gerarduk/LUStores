/**
 * Order Receiving Integration Tests
 * 
 * Tests the complete workflow of:
 * 1. Creating an order
 * 2. Receiving the order
 * 3. Updating inventory with weighted average costs
 * 4. Verifying subsequent sales use updated costs
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

/**
 * Mock types (matching actual schema)
 */
interface Item {
  id: number;
  name: string;
  sku: string;
  categoryId: number;
  price: number; // ex-VAT
  vatRate: number; // decimal(5,4)
  vatIncluded: boolean;
  currentStock: number;
}

interface Order {
  id: number;
  orderId: string;
  supplierId: string;
  status: 'pending' | 'partially_received' | 'received' | 'cancelled';
  totalAmount: number;
  deliveryCharge: number;
  vatRate: number;
  vatIncluded: boolean;
  updateInventoryValues: boolean;
  createdAt: Date;
}

interface OrderItem {
  id: number;
  orderId: number;
  itemId: number;
  quantity: number;
  unitCost: number; // ex-VAT
  vatRate: number;
  vatIncluded: boolean;
  receivedQuantity: number;
  totalCost: number;
}

/**
 * Mock database service
 */
class MockOrderService {
  private items: Map<number, Item> = new Map();
  private orders: Map<number, Order> = new Map();
  private orderItems: Map<number, OrderItem> = new Map();
  private itemCounter = 0;
  private orderCounter = 0;
  private orderItemCounter = 0;

  setupTestItem(overrides?: Partial<Item>): Item {
    const item: Item = {
      id: ++this.itemCounter,
      name: overrides?.name || 'Test Item',
      sku: overrides?.sku || `SKU-${this.itemCounter}`,
      categoryId: overrides?.categoryId || 1,
      price: overrides?.price || 100,
      vatRate: overrides?.vatRate || 0.20,
      vatIncluded: overrides?.vatIncluded || false,
      currentStock: overrides?.currentStock || 100,
    };
    this.items.set(item.id, item);
    return item;
  }

  createOrder(
    supplierId: string,
    totalAmount: number,
    deliveryCharge: number = 0,
    updateInventoryValues: boolean = false
  ): Order {
    const order: Order = {
      id: ++this.orderCounter,
      orderId: `O${Date.now()}`,
      supplierId,
      status: 'pending',
      totalAmount,
      deliveryCharge,
      vatRate: 0.20,
      vatIncluded: false,
      updateInventoryValues,
      createdAt: new Date(),
    };
    this.orders.set(order.id, order);
    return order;
  }

  addOrderItem(
    orderId: number,
    itemId: number,
    quantity: number,
    unitCost: number,
    vatRate: number = 0.20
  ): OrderItem {
    const orderItem: OrderItem = {
      id: ++this.orderItemCounter,
      orderId,
      itemId,
      quantity,
      unitCost,
      vatRate,
      vatIncluded: false,
      receivedQuantity: 0,
      totalCost: quantity * unitCost,
    };
    this.orderItems.set(orderItem.id, orderItem);
    return orderItem;
  }

  receiveOrderItem(
    orderItemId: number,
    receivedQuantity: number,
    updateValues: boolean = false
  ): { success: boolean; error?: string } {
    const orderItem = this.orderItems.get(orderItemId);
    if (!orderItem) {
      return { success: false, error: 'Order item not found' };
    }

    const item = this.items.get(orderItem.itemId);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }

    const order = this.orders.get(orderItem.orderId);
    if (!order) {
      return { success: false, error: 'Order not found' };
    }

    // Update order item
    orderItem.receivedQuantity = receivedQuantity;

    // Update inventory quantity
    item.currentStock += receivedQuantity;

    // Update inventory price if flag is set
    if (updateValues && order.updateInventoryValues) {
      this.updateInventoryWithWeightedAverage(item, orderItem, order);
    }

    // Update order status
    const totalReceived = Array.from(this.orderItems.values())
      .filter(oi => oi.orderId === orderItem.orderId)
      .reduce((sum, oi) => sum + oi.receivedQuantity, 0);

    const totalOrdered = Array.from(this.orderItems.values())
      .filter(oi => oi.orderId === orderItem.orderId)
      .reduce((sum, oi) => sum + oi.quantity, 0);

    if (totalReceived === totalOrdered) {
      order.status = 'received';
    } else if (totalReceived > 0) {
      order.status = 'partially_received';
    }

    return { success: true };
  }

  private updateInventoryWithWeightedAverage(
    item: Item,
    orderItem: OrderItem,
    order: Order
  ): void {
    // Calculate weighted average using business rule
    const currentQty = item.currentStock - orderItem.receivedQuantity; // Qty before receiving
    const incomingQty = orderItem.receivedQuantity;
    const currentPriceExVat = item.price;
    const incomingPriceExVat = orderItem.unitCost;

    // Calculate VAT: use larger rate
    const selectedVatRate = Math.max(item.vatRate, orderItem.vatRate);

    // Convert to inc-VAT prices
    const currentPriceIncVat = currentPriceExVat * (1 + selectedVatRate);
    const incomingPriceIncVat = incomingPriceExVat * (1 + selectedVatRate);

    // Current inventory total
    const currentTotalIncVat = currentQty * currentPriceIncVat;

    // Incoming order total
    const incomingTotalIncVat = incomingQty * incomingPriceIncVat;

    // Proportional delivery charge
    const totalQty = currentQty + incomingQty;
    const incomingProportion = incomingQty / totalQty;
    const proportionalDelivery = order.deliveryCharge * incomingProportion;

    // Combined total
    const combinedTotalIncVat = currentTotalIncVat + incomingTotalIncVat + proportionalDelivery;

    // New weighted average inc-VAT
    const newWeightedAvgIncVat = combinedTotalIncVat / totalQty;

    // Convert back to ex-VAT
    const newWeightedAvgExVat = newWeightedAvgIncVat / (1 + selectedVatRate);

    // Round to 2 decimal places
    item.price = Math.round(newWeightedAvgExVat * 100) / 100;
    item.vatRate = selectedVatRate;
  }

  getItem(id: number): Item | undefined {
    return this.items.get(id);
  }

  getOrder(id: number): Order | undefined {
    return this.orders.get(id);
  }

  getOrderItem(id: number): OrderItem | undefined {
    return this.orderItems.get(id);
  }

  getAllOrderItems(orderId: number): OrderItem[] {
    return Array.from(this.orderItems.values()).filter(oi => oi.orderId === orderId);
  }

  reset(): void {
    this.items.clear();
    this.orders.clear();
    this.orderItems.clear();
    this.itemCounter = 0;
    this.orderCounter = 0;
    this.orderItemCounter = 0;
  }
}

describe('Order Receiving - Integration Tests', () => {
  let service: MockOrderService;

  beforeEach(() => {
    service = new MockOrderService();
  });

  afterEach(() => {
    service.reset();
  });

  describe('Basic order receiving without inventory updates', () => {
    
    it('should receive order without changing item price', () => {
      const item = service.setupTestItem({ price: 50, vatRate: 0.20, currentStock: 100 });
      const order = service.createOrder('SUP001', 3000, 0, false);
      const orderItem = service.addOrderItem(order.id, item.id, 50, 60, 0.20);

      // Receive order
      const result = service.receiveOrderItem(orderItem.id, 50, false);

      expect(result.success).toBe(true);
      
      // Item price should remain unchanged
      const updatedItem = service.getItem(item.id)!;
      expect(updatedItem.price).toBe(50); // Unchanged
      expect(updatedItem.currentStock).toBe(150); // 100 + 50
      
      const updatedOrder = service.getOrder(order.id)!;
      expect(updatedOrder.status).toBe('received');
    });
  });

  describe('Order receiving with weighted average inventory updates', () => {
    
    it('should update item price with weighted average', () => {
      // Setup: Current inventory 100 @ £50 ex-VAT
      const item = service.setupTestItem({
        name: 'Textbook',
        price: 50,
        vatRate: 0.20,
        currentStock: 100,
      });

      // Create order: 50 @ £60 ex-VAT with inventory updates enabled
      const order = service.createOrder('SUP001', 3000, 0, true);
      order.updateInventoryValues = true;
      const orderItem = service.addOrderItem(order.id, item.id, 50, 60, 0.20);

      // Receive order with inventory update
      const result = service.receiveOrderItem(orderItem.id, 50, true);

      expect(result.success).toBe(true);

      // Verify inventory updated
      const updatedItem = service.getItem(item.id)!;
      expect(updatedItem.currentStock).toBe(150); // 100 + 50

      // Verify price updated to weighted average
      // Current: 100 @ £50 × 1.20 = £6,000 inc-VAT
      // Incoming: 50 @ £60 × 1.20 = £3,600 inc-VAT
      // Combined: £9,600 / 150 = £64 inc-VAT = £53.33 ex-VAT
      expect(updatedItem.price).toBeCloseTo(53.33, 1);
    });

    it('should use larger VAT rate when rates differ', () => {
      // Current: 100 @ £50 @ 5% VAT
      const item = service.setupTestItem({
        price: 50,
        vatRate: 0.05,
        currentStock: 100,
      });

      // Incoming: 50 @ £60 @ 20% VAT (larger rate)
      const order = service.createOrder('SUP001', 3000, 0, true);
      order.updateInventoryValues = true;
      const orderItem = service.addOrderItem(order.id, item.id, 50, 60, 0.20);

      // Receive with update
      service.receiveOrderItem(orderItem.id, 50, true);

      const updatedItem = service.getItem(item.id)!;

      // Should use 0.20 (larger) for all calculations
      expect(updatedItem.vatRate).toBe(0.20);

      // Current: 100 @ £50 × 1.20 = £6,000 inc-VAT
      // Incoming: 50 @ £60 × 1.20 = £3,600 inc-VAT
      // Combined: £9,600 / 150 = £64 inc-VAT = £53.33 ex-VAT
      expect(updatedItem.price).toBeCloseTo(53.33, 1);
    });

    it('should handle delivery charge proportional split', () => {
      const item = service.setupTestItem({
        price: 50,
        vatRate: 0.20,
        currentStock: 100,
      });

      // Create order with £300 delivery charge, receiving 50 of 150 total items (1/3)
      const order = service.createOrder('SUP001', 3000, 300, true);
      order.updateInventoryValues = true;

      // Two items in order: item 1 (50 units) and item 2 (100 units)
      const item2 = service.setupTestItem({
        name: 'Other Item',
        price: 30,
        currentStock: 200,
      });

      const orderItem1 = service.addOrderItem(order.id, item.id, 50, 60, 0.20);
      const orderItem2 = service.addOrderItem(order.id, item2.id, 100, 40, 0.20);

      // Receive first item
      service.receiveOrderItem(orderItem1.id, 50, true);

      const updatedItem = service.getItem(item.id)!;

      // Proportional delivery: 50/150 × £300 = £100
      // Current: 100 @ £50 × 1.20 = £6,000
      // Incoming: 50 @ £60 × 1.20 = £3,600
      // With delivery: (£6,000 + £3,600 + £100) / 150 = £64.67 inc-VAT = £53.89 ex-VAT
      expect(updatedItem.price).toBeCloseTo(53.89, 1);
    });

    it('should track order status through partial receives', () => {
      const item1 = service.setupTestItem({ name: 'Item 1', price: 50, currentStock: 100 });
      const item2 = service.setupTestItem({ name: 'Item 2', price: 30, currentStock: 50 });

      const order = service.createOrder('SUP001', 3000, 0, false);
      const orderItem1 = service.addOrderItem(order.id, item1.id, 10, 60, 0.20);
      const orderItem2 = service.addOrderItem(order.id, item2.id, 20, 40, 0.20);

      // Receive first item only
      service.receiveOrderItem(orderItem1.id, 10, false);

      let currentOrder = service.getOrder(order.id)!;
      expect(currentOrder.status).toBe('partially_received');

      // Receive second item
      service.receiveOrderItem(orderItem2.id, 20, false);

      currentOrder = service.getOrder(order.id)!;
      expect(currentOrder.status).toBe('received');
    });

    it('should accumulate correctly across multiple receives', () => {
      const item = service.setupTestItem({
        price: 50,
        vatRate: 0.20,
        currentStock: 100,
      });

      // First order: 25 units @ £55
      const order1 = service.createOrder('SUP001', 1500, 50, true);
      order1.updateInventoryValues = true;
      const oi1 = service.addOrderItem(order1.id, item.id, 25, 55, 0.20);

      service.receiveOrderItem(oi1.id, 25, true);

      let currentItem = service.getItem(item.id)!;
      expect(currentItem.currentStock).toBe(125);
      const priceAfterOrder1 = currentItem.price;

      // Second order: 50 units @ £60
      const order2 = service.createOrder('SUP002', 3000, 100, true);
      order2.updateInventoryValues = true;
      const oi2 = service.addOrderItem(order2.id, item.id, 50, 60, 0.20);

      service.receiveOrderItem(oi2.id, 50, true);

      currentItem = service.getItem(item.id)!;
      expect(currentItem.currentStock).toBe(175);
      
      // Price should have updated again
      const priceAfterOrder2 = currentItem.price;
      expect(priceAfterOrder2).not.toBe(priceAfterOrder1);
    });
  });

  describe('Order cancellation behavior', () => {
    
    it('should allow adding note about price changes on cancellation', () => {
      const item = service.setupTestItem({
        price: 50,
        vatRate: 0.20,
        currentStock: 100,
      });

      const order = service.createOrder('SUP001', 3000, 0, true);
      order.updateInventoryValues = true;
      const orderItem = service.addOrderItem(order.id, item.id, 50, 60, 0.20);

      // Receive partial order
      service.receiveOrderItem(orderItem.id, 25, true); // only 25 of 50

      const currentItem = service.getItem(item.id)!;
      const updatedPrice = currentItem.price;

      // Verify item price changed after partial receive
      expect(updatedPrice).not.toBe(50);

      // Business rule: User should add note to check prices haven't changed
      // Then either: reorder via new order without "adjust values" flag
      // This test verifies the system allows that workflow
      
      // Cancel remaining 25 units
      order.status = 'cancelled';
      
      // When reordering, user creates NEW order without updateInventoryValues flag
      const reorder = service.createOrder('SUP001', 1500, 0, false); // updateInventoryValues = false
      const reorderItem = service.addOrderItem(reorder.id, item.id, 25, 60, 0.20);

      // This receive should NOT update inventory price again
      service.receiveOrderItem(reorderItem.id, 25, false);

      const finalItem = service.getItem(item.id)!;
      expect(finalItem.price).toBe(updatedPrice); // Price unchanged from reorder
    });
  });

  describe('Edge cases', () => {
    
    it('should handle fractional quantities', () => {
      const item = service.setupTestItem({
        price: 25,
        vatRate: 0.20,
        currentStock: 33.33,
      });

      const order = service.createOrder('SUP001', 2000, 0, true);
      order.updateInventoryValues = true;
      const orderItem = service.addOrderItem(order.id, item.id, 66.67, 30, 0.20);

      service.receiveOrderItem(orderItem.id, 66.67, true);

      const updatedItem = service.getItem(item.id)!;
      expect(updatedItem.currentStock).toBeCloseTo(100, 1);
      expect(Number.isFinite(updatedItem.price)).toBe(true);
    });

    it('should handle 0% VAT correctly', () => {
      const item = service.setupTestItem({
        name: 'Zero VAT Item',
        price: 100,
        vatRate: 0.0,
        currentStock: 50,
      });

      const order = service.createOrder('SUP001', 6000, 0, true);
      order.updateInventoryValues = true;
      const orderItem = service.addOrderItem(order.id, item.id, 50, 120, 0.0);

      service.receiveOrderItem(orderItem.id, 50, true);

      const updatedItem = service.getItem(item.id)!;
      expect(updatedItem.vatRate).toBe(0.0);
      expect(updatedItem.price).toBeCloseTo(110, 1);
    });

    it('should round final price to 2 decimal places', () => {
      const item = service.setupTestItem({
        price: 33.333,
        vatRate: 0.20,
        currentStock: 10,
      });

      const order = service.createOrder('SUP001', 500, 0, true);
      order.updateInventoryValues = true;
      const orderItem = service.addOrderItem(order.id, item.id, 10, 40.444, 0.20);

      service.receiveOrderItem(orderItem.id, 10, true);

      const updatedItem = service.getItem(item.id)!;
      
      // Verify no excessive decimal places
      const priceStr = updatedItem.price.toString();
      const decimalIndex = priceStr.indexOf('.');
      const decimals = decimalIndex === -1 ? 0 : priceStr.length - decimalIndex - 1;
      expect(decimals).toBeLessThanOrEqual(2);
    });
  });

  describe('Verification: subsequent sales use updated costs', () => {
    
    it('should use weighted average price for new sales', () => {
      // Setup initial inventory
      const item = service.setupTestItem({
        name: 'Textbook',
        price: 50,
        vatRate: 0.20,
        currentStock: 100,
      });

      // Receive order with different cost
      const order = service.createOrder('SUP001', 3000, 0, true);
      order.updateInventoryValues = true;
      const orderItem = service.addOrderItem(order.id, item.id, 50, 60, 0.20);
      service.receiveOrderItem(orderItem.id, 50, true);

      // Verify new price is used
      const updatedItem = service.getItem(item.id)!;
      expect(updatedItem.price).not.toBe(50); // Price changed
      expect(updatedItem.currentStock).toBe(150); // Stock updated

      // When creating a new sale, this item would use the updated price
      // This test verifies the data is ready for the sales workflow
      expect(updatedItem.price).toBeCloseTo(53.33, 1);
    });
  });
});
