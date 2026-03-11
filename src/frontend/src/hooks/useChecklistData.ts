/**
 * Checklist and task hooks backed by the shared backend canister.
 * Replaces the old localStorage-based and auth-required backend approaches.
 * Uses setSharedData/getSharedData which work for anonymous callers.
 */
import { useCallback } from "react";
import { useSharedBackendData } from "./useSharedBackendData";

const CHECKLIST_KEY = "esearth_checklist_v4";
const TASKS_KEY = "esearth_daily_tasks_v4";

export interface ChecklistItemLocal {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  category: string;
}

export interface DailyTaskLocal {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
  assignedTo: string;
  createdAt: string;
  completedAt: string;
}

export function useChecklist(date: string) {
  const {
    data: allItems,
    saveData,
    isLoading,
  } = useSharedBackendData<ChecklistItemLocal[]>(CHECKLIST_KEY, []);

  const items = allItems.filter((i) => i.date === date);

  const addItem = useCallback(
    async (title: string, category: string) => {
      const newItem: ChecklistItemLocal = {
        id: `cl-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        title,
        date,
        completed: false,
        category,
      };
      await saveData([...allItems, newItem]);
    },
    [allItems, saveData, date],
  );

  const toggleItem = useCallback(
    async (id: string) => {
      await saveData(
        allItems.map((i) =>
          i.id === id ? { ...i, completed: !i.completed } : i,
        ),
      );
    },
    [allItems, saveData],
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await saveData(allItems.filter((i) => i.id !== id));
    },
    [allItems, saveData],
  );

  const resetDay = useCallback(async () => {
    await saveData(
      allItems.map((i) => (i.date === date ? { ...i, completed: false } : i)),
    );
  }, [allItems, saveData, date]);

  const updateItem = useCallback(
    async (id: string, newTitle: string) => {
      await saveData(
        allItems.map((i) => (i.id === id ? { ...i, title: newTitle } : i)),
      );
    },
    [allItems, saveData],
  );

  return {
    items,
    isLoading,
    addItem,
    toggleItem,
    deleteItem,
    resetDay,
    updateItem,
  };
}

export function useDailyTasks() {
  const {
    data: tasks,
    saveData,
    isLoading,
  } = useSharedBackendData<DailyTaskLocal[]>(TASKS_KEY, []);

  const addTask = useCallback(
    async (task: {
      title: string;
      description: string;
      priority: string;
      dueDate: string;
      assignedTo: string;
    }) => {
      const newTask: DailyTaskLocal = {
        id: `dtask-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        ...task,
        status: "Pending",
        createdAt: new Date().toISOString(),
        completedAt: "",
      };
      await saveData([...tasks, newTask]);
      return newTask.id;
    },
    [tasks, saveData],
  );

  const updateTask = useCallback(
    async (
      id: string,
      updates: {
        title: string;
        description: string;
        priority: string;
        dueDate: string;
        assignedTo: string;
        status: string;
      },
    ) => {
      await saveData(
        tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
      );
    },
    [tasks, saveData],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      await saveData(tasks.filter((t) => t.id !== id));
    },
    [tasks, saveData],
  );

  const completeTask = useCallback(
    async (id: string) => {
      await saveData(
        tasks.map((t) =>
          t.id === id
            ? { ...t, status: "Done", completedAt: new Date().toISOString() }
            : t,
        ),
      );
    },
    [tasks, saveData],
  );

  return { tasks, isLoading, addTask, updateTask, deleteTask, completeTask };
}
