import { useCallback, useEffect, useState } from "react";
import type { Expenditure, ExpenseCategory } from "../types";

const STORAGE_KEY = "esearth_expenditures";

export function useExpenditures() {
  const [expenditures, setExpenditures] = useState<Expenditure[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(expenditures));
    } catch {}
  }, [expenditures]);

  const addExpenditure = useCallback(
    (exp: Omit<Expenditure, "id" | "createdAt">) => {
      setExpenditures((prev) => [
        {
          ...exp,
          id: `exp-${Date.now()}`,
          createdAt: new Date().toISOString().split("T")[0],
        },
        ...prev,
      ]);
    },
    [],
  );

  const updateExpenditure = useCallback(
    (id: string, updates: Partial<Omit<Expenditure, "id">>) => {
      setExpenditures((prev) =>
        prev.map((e) => (e.id === id ? { ...e, ...updates } : e)),
      );
    },
    [],
  );

  const deleteExpenditure = useCallback((id: string) => {
    setExpenditures((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { expenditures, addExpenditure, updateExpenditure, deleteExpenditure };
}

export type { ExpenseCategory };
