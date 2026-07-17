import type { Inventory } from './arena';

export const DRAWING_INK_REFILL_COST = 3;

export type DrawingInkRefillRequest = Readonly<{
  itemId: string;
  operationId: string;
}>;

export type DrawingInkRefillResponse = Readonly<{
  itemId: string;
  quantity: number;
  ink: number;
  inkSpent: number;
  inventory: Inventory;
}>;
