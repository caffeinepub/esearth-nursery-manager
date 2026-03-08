import { useCallback, useEffect, useState } from "react";
import type { AssignedTo, Priority, PriorityTask, TaskStatus } from "../types";

const STORAGE_KEY = "esearth_priority_tasks_v2";

export function usePriorityTasks() {
  const [tasks, setTasks] = useState<PriorityTask[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {}
  }, [tasks]);

  const addTask = useCallback(
    (task: Omit<PriorityTask, "id" | "createdAt">) => {
      setTasks((prev) => [
        {
          ...task,
          id: `task-${Date.now()}`,
          createdAt: new Date().toISOString().split("T")[0],
        },
        ...prev,
      ]);
    },
    [],
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Omit<PriorityTask, "id">>) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      );
    },
    [],
  );

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const completeTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: "Done" as TaskStatus } : t,
      ),
    );
  }, []);

  return { tasks, addTask, updateTask, deleteTask, completeTask };
}

export type { Priority, TaskStatus, AssignedTo };
