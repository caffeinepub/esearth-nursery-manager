import { useCallback, useEffect, useState } from "react";
import type { StockMovement, StockMovementType } from "../types";

const STORAGE_KEY = "esearth_stock_movements";

export function useStockMovements() {
  const [movements, setMovements] = useState<StockMovement[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(movements));
    } catch {}
  }, [movements]);

  const addMovement = useCallback(
    (movement: {
      itemId: string;
      itemName: string;
      type: StockMovementType;
      quantity: number;
      remarks: string;
      performedBy: string;
    }) => {
      const newMovement: StockMovement = {
        ...movement,
        id: `mov-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
      };
      setMovements((prev) => [newMovement, ...prev]);
      return newMovement;
    },
    [],
  );

  const getMovementsByItem = useCallback(
    (itemId: string) => {
      return movements.filter((m) => m.itemId === itemId);
    },
    [movements],
  );

  const getAllMovements = useCallback(() => movements, [movements]);

  return { movements, addMovement, getMovementsByItem, getAllMovements };
}
