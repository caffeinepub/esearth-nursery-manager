import { useCallback } from "react";
import type { AssignedTo, Priority, PriorityTask, TaskStatus } from "../types";
import { useSharedBackendData } from "./useSharedBackendData";

const BACKEND_KEY = "esearth_priority_tasks_v3";

export function usePriorityTasks() {
  const { data: tasks, saveData: saveTasks } = useSharedBackendData<
    PriorityTask[]
  >(BACKEND_KEY, []);

  const addTask = useCallback(
    (task: Omit<PriorityTask, "id" | "createdAt">) => {
      saveTasks([
        {
          ...task,
          id: `task-${Date.now()}`,
          createdAt: new Date().toISOString().split("T")[0],
        },
        ...tasks,
      ]);
    },
    [tasks, saveTasks],
  );

  const updateTask = useCallback(
    (id: string, updates: Partial<Omit<PriorityTask, "id">>) => {
      saveTasks(tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)));
    },
    [tasks, saveTasks],
  );

  const deleteTask = useCallback(
    (id: string) => {
      saveTasks(tasks.filter((t) => t.id !== id));
    },
    [tasks, saveTasks],
  );

  const completeTask = useCallback(
    (id: string) => {
      saveTasks(
        tasks.map((t) =>
          t.id === id ? { ...t, status: "Done" as TaskStatus } : t,
        ),
      );
    },
    [tasks, saveTasks],
  );

  return { tasks, addTask, updateTask, deleteTask, completeTask };
}

export type { Priority, TaskStatus, AssignedTo };
