import { useCallback, useMemo } from "react";
import type { InventoryItem, InventoryUnit } from "../types";
import { useSharedBackendData } from "./useSharedBackendData";
import { useStockMovements } from "./useStockMovements";

const BACKEND_KEY = "esearth_inventory_v3";

function generateSku(items: InventoryItem[]): string {
  const next = items.length + 1;
  return `ESK-${String(next).padStart(3, "0")}`;
}

export function useInventory() {
  const { data: items, saveData: saveItems } = useSharedBackendData<
    InventoryItem[]
  >(BACKEND_KEY, []);

  const { addMovement } = useStockMovements();

  const addItem = useCallback(
    (
      item: Omit<InventoryItem, "id" | "sku" | "createdAt">,
      performedBy = "owner",
    ) => {
      const sku = generateSku(items);
      const newItem: InventoryItem = {
        ...item,
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        sku,
        createdAt: new Date().toISOString().split("T")[0],
      };
      const updated = [newItem, ...items];
      saveItems(updated);

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
    [items, saveItems, addMovement],
  );

  const updateItem = useCallback(
    (
      id: string,
      updates: Partial<Omit<InventoryItem, "id" | "sku">>,
      performedBy = "owner",
    ) => {
      const existing = items.find((i) => i.id === id);
      if (!existing) return;

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

      const updated = items.map((item) =>
        item.id === id ? { ...item, ...updates } : item,
      );
      saveItems(updated);
    },
    [items, saveItems, addMovement],
  );

  const deleteItem = useCallback(
    (id: string) => {
      saveItems(items.filter((item) => item.id !== id));
    },
    [items, saveItems],
  );

  const deductStock = useCallback(
    (
      itemId: string,
      qty: number,
      performedBy: string,
      remarks = "Stock deduction",
      type: "Sales" | "Loss" | "Damage" | "Adjustment" = "Sales",
    ) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      addMovement({
        itemId,
        itemName: item.name,
        type,
        quantity: -qty,
        remarks,
        performedBy,
      });

      const updated = items.map((i) =>
        i.id === itemId ? { ...i, quantity: Math.max(0, i.quantity - qty) } : i,
      );
      saveItems(updated);
    },
    [items, saveItems, addMovement],
  );

  const addPurchaseStock = useCallback(
    (
      itemId: string,
      qty: number,
      performedBy: string,
      remarks = "Purchase",
    ) => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      addMovement({
        itemId,
        itemName: item.name,
        type: "Purchase",
        quantity: qty,
        remarks,
        performedBy,
      });

      const updated = items.map((i) =>
        i.id === itemId ? { ...i, quantity: i.quantity + qty } : i,
      );
      saveItems(updated);
    },
    [items, saveItems, addMovement],
  );

  const getItemById = useCallback(
    (id: string) => items.find((i) => i.id === id),
    [items],
  );

  const totalInventoryValue = useMemo(
    () => items.reduce((sum, i) => sum + i.costPrice * i.quantity, 0),
    [items],
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
