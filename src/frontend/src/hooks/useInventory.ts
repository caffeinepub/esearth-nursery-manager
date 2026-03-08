import { useCallback, useEffect, useState } from "react";
import type { InventoryItem, InventoryUnit } from "../types";
import { useStockMovements } from "./useStockMovements";

const STORAGE_KEY = "esearth_inventory_v2";
const SKU_COUNTER_KEY = "esearth_sku_counter";

function getNextSku(): string {
  try {
    const counter = Number(localStorage.getItem(SKU_COUNTER_KEY) ?? "0") + 1;
    localStorage.setItem(SKU_COUNTER_KEY, String(counter));
    return `ESK-${String(counter).padStart(3, "0")}`;
  } catch {
    return `ESK-${Date.now()}`;
  }
}

export function useInventory() {
  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  const { addMovement } = useStockMovements();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const addItem = useCallback(
    (
      item: Omit<InventoryItem, "id" | "sku" | "createdAt">,
      performedBy = "owner",
    ) => {
      const sku = getNextSku();
      const newItem: InventoryItem = {
        ...item,
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sku,
        createdAt: new Date().toISOString().split("T")[0],
      };
      setItems((prev) => [newItem, ...prev]);

      // Record initial stock movement if quantity > 0
      if (item.quantity > 0) {
        addMovement({
          itemId: newItem.id,
          itemName: newItem.name,
          type: "Purchase",
          quantity: item.quantity,
          remarks: "Initial stock",
          performedBy,
        });
      }
      return newItem;
    },
    [addMovement],
  );

  const updateItem = useCallback(
    (
      id: string,
      updates: Partial<Omit<InventoryItem, "id" | "sku">>,
      performedBy = "owner",
    ) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.id === id);
        if (!existing) return prev;

        // If quantity changed, record a movement
        if (
          updates.quantity !== undefined &&
          updates.quantity !== existing.quantity
        ) {
          const diff = updates.quantity - existing.quantity;
          const type = diff > 0 ? "Purchase" : "Adjustment";
          addMovement({
            itemId: id,
            itemName: existing.name,
            type,
            quantity: diff,
            remarks: "Manual adjustment",
            performedBy,
          });
        }

        return prev.map((item) =>
          item.id === id ? { ...item, ...updates } : item,
        );
      });
    },
    [addMovement],
  );

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const deductStock = useCallback(
    (
      itemId: string,
      qty: number,
      performedBy: string,
      remarks = "Stock deduction",
      type: "Sales" | "Loss" | "Damage" | "Adjustment" = "Sales",
    ) => {
      setItems((prev) => {
        const item = prev.find((i) => i.id === itemId);
        if (!item) return prev;

        addMovement({
          itemId,
          itemName: item.name,
          type,
          quantity: -qty,
          remarks,
          performedBy,
        });

        return prev.map((i) =>
          i.id === itemId
            ? { ...i, quantity: Math.max(0, i.quantity - qty) }
            : i,
        );
      });
    },
    [addMovement],
  );

  const addPurchaseStock = useCallback(
    (
      itemId: string,
      qty: number,
      performedBy: string,
      remarks = "Purchase",
    ) => {
      setItems((prev) => {
        const item = prev.find((i) => i.id === itemId);
        if (!item) return prev;

        addMovement({
          itemId,
          itemName: item.name,
          type: "Purchase",
          quantity: qty,
          remarks,
          performedBy,
        });

        return prev.map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity + qty } : i,
        );
      });
    },
    [addMovement],
  );

  const getItemById = useCallback(
    (id: string) => items.find((i) => i.id === id),
    [items],
  );

  // Compute total inventory value (cost-based)
  const totalInventoryValue = items.reduce(
    (sum, i) => sum + i.costPrice * i.quantity,
    0,
  );

  return {
    items,
    addItem,
    updateItem,
    deleteItem,
    deductStock,
    addPurchaseStock,
    getItemById,
    totalInventoryValue,
  };
}

export type { InventoryUnit };
