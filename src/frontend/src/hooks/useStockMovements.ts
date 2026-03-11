import { useCallback } from "react";
import type { StockMovement, StockMovementType } from "../types";
import { useSharedBackendData } from "./useSharedBackendData";

const BACKEND_KEY = "esearth_stock_movements_v3";

export function useStockMovements() {
  const { data: movements, saveData: saveMovements } = useSharedBackendData<
    StockMovement[]
  >(BACKEND_KEY, []);

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
      saveMovements([newMovement, ...movements]);
      return newMovement;
    },
    [movements, saveMovements],
  );

  const getMovementsByItem = useCallback(
    (itemId: string) => movements.filter((m) => m.itemId === itemId),
    [movements],
  );

  const getAllMovements = useCallback(() => movements, [movements]);

  return { movements, addMovement, getMovementsByItem, getAllMovements };
}
