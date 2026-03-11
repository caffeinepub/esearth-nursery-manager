import { useCallback } from "react";
import type { Expenditure, ExpenseCategory } from "../types";
import { useSharedBackendData } from "./useSharedBackendData";

const BACKEND_KEY = "esearth_expenditures_v3";

export function useExpenditures() {
  const { data: expenditures, saveData: saveExpenditures } =
    useSharedBackendData<Expenditure[]>(BACKEND_KEY, []);

  const addExpenditure = useCallback(
    (exp: Omit<Expenditure, "id" | "createdAt">) => {
      saveExpenditures([
        {
          ...exp,
          id: `exp-${Date.now()}`,
          createdAt: new Date().toISOString().split("T")[0],
        },
        ...expenditures,
      ]);
    },
    [expenditures, saveExpenditures],
  );

  const updateExpenditure = useCallback(
    (id: string, updates: Partial<Omit<Expenditure, "id">>) => {
      saveExpenditures(
        expenditures.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      );
    },
    [expenditures, saveExpenditures],
  );

  const deleteExpenditure = useCallback(
    (id: string) => {
      saveExpenditures(expenditures.filter((e) => e.id !== id));
    },
    [expenditures, saveExpenditures],
  );

  return { expenditures, addExpenditure, updateExpenditure, deleteExpenditure };
}

export type { ExpenseCategory };
