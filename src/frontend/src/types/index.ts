// ── Role types ────────────────────────────────────────────────────────────
export type Role = "owner" | "clerk";

// ── Inventory ─────────────────────────────────────────────────────────────
export type InventoryUnit =
  | "Plant nos."
  | "Pot"
  | "Piece"
  | "Bag"
  | "Sq. Ft"
  | "Other";

export interface InventoryItem {
  id: string;
  sku: string; // auto-generated: ESK-001, ESK-002...
  name: string;
  description: string;
  agePlant: string; // e.g. "6 months", "1 year"
  category: string;
  costPrice: number;
  sellingPrice: number;
  quantity: number;
  unit: InventoryUnit;
  threshold: number; // per-item low stock threshold
  createdAt: string;
}

// ── Stock Movements ───────────────────────────────────────────────────────
export type StockMovementType =
  | "Purchase"
  | "Loss"
  | "Damage"
  | "Adjustment"
  | "Sales";

export interface StockMovement {
  id: string;
  itemId: string;
  itemName: string;
  type: StockMovementType;
  quantity: number; // positive = stock in, negative = stock out
  remarks: string;
  performedBy: string; // "owner" or "clerk"
  timestamp: string; // ISO date string
}

// ── Sales / Invoices ──────────────────────────────────────────────────────
export interface InvoiceLineItem {
  id: string;
  inventoryItemId: string;
  name: string;
  quantity: number;
  unitPrice: number; // editable, defaults to sellingPrice
  costPrice: number; // from inventory, for COGS calc
}

export type PaymentMethod = "Cash" | "UPI" | "Card";

export interface Invoice {
  id: string;
  invoiceNumber: string; // "INV-0001"
  date: string;
  customerName: string;
  customerPhone: string;
  notes: string;
  lineItems: InvoiceLineItem[];
  paymentMethod: PaymentMethod;
  paid: boolean;
  createdAt: string;
}

// ── Expenditure ───────────────────────────────────────────────────────────
export type ExpenseCategory =
  | "Seeds"
  | "Tools"
  | "Labour"
  | "Utilities"
  | "Other";

export interface Expenditure {
  id: string;
  date: string;
  category: ExpenseCategory;
  amount: number;
  description: string;
  createdAt: string;
}

// ── Priority Register ─────────────────────────────────────────────────────
export type Priority = "High" | "Medium" | "Low";
export type TaskStatus = "Pending" | "In Progress" | "Done";
export type AssignedTo = "owner" | "clerk" | "all";

export interface PriorityTask {
  id: string;
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  assignedTo: AssignedTo;
  createdAt: string;
}
