import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ChecklistItem } from "../backend.d.ts";
import { useActor } from "./useActor";

export function useChecklistItems(date: string) {
  const { actor, isFetching } = useActor();
  return useQuery<ChecklistItem[]>({
    queryKey: ["checklist", date],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getChecklistItemsByDate(date);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useLowStockThreshold() {
  const { actor, isFetching } = useActor();
  return useQuery<bigint>({
    queryKey: ["lowStockThreshold"],
    queryFn: async () => {
      if (!actor) return 10n;
      return actor.getLowStockThreshold();
    },
    enabled: !!actor && !isFetching,
    placeholderData: 10n,
  });
}

export function useAddChecklistItem() {
  const qc = useQueryClient();
  const { actor } = useActor();
  return useMutation({
    mutationFn: ({
      title,
      date,
      category,
    }: { title: string; date: string; category: string }) => {
      if (!actor) throw new Error("Not connected");
      return actor.addChecklistItem(title, date, category);
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["checklist", vars.date] });
    },
  });
}

export function useToggleChecklistItem(date: string) {
  const qc = useQueryClient();
  const { actor } = useActor();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.toggleChecklistItem(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist", date] });
    },
  });
}

export function useDeleteChecklistItem(date: string) {
  const qc = useQueryClient();
  const { actor } = useActor();
  return useMutation({
    mutationFn: (id: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.deleteChecklistItem(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist", date] });
    },
  });
}

export function useResetChecklist(date: string) {
  const qc = useQueryClient();
  const { actor } = useActor();
  return useMutation({
    mutationFn: () => {
      if (!actor) throw new Error("Not connected");
      return actor.resetChecklistForNewDay(date);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist", date] });
    },
  });
}

export function useSaveLowStockThreshold() {
  const qc = useQueryClient();
  const { actor } = useActor();
  return useMutation({
    mutationFn: (value: bigint) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveLowStockThreshold(value);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lowStockThreshold"] });
    },
  });
}

// ── Task Management (localStorage-based) ─────────────────────────────────
// Note: backend addTask/updateTask/deleteTask require isAdmin which fails for
// anonymous (PIN-based) callers. Tasks are managed via localStorage instead.

const TASKS_STORAGE_KEY = "esearth_tasks";

interface LocalTask {
  id: number;
  title: string;
  description: string;
  priority: string;
  status: string;
  dueDate: string;
  assignedTo: string;
  createdAt: string;
  completedAt: string;
}

function loadTasks(): LocalTask[] {
  try {
    const stored = localStorage.getItem(TASKS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveTasks(tasks: LocalTask[]): void {
  try {
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch {}
}

// Map local task to shape matching backend Task (bigint id)
function toQueryTask(t: LocalTask) {
  return {
    id: BigInt(t.id),
    title: t.title,
    description: t.description,
    priority: t.priority,
    status: t.status,
    dueDate: t.dueDate,
    assignedTo: t.assignedTo,
    createdAt: t.createdAt,
    completedAt: t.completedAt,
  };
}

export function useBackendTasks() {
  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => loadTasks().map(toQueryTask),
    staleTime: 0,
  });
}

export function useBackendTasksByAssignee(assignedTo: string) {
  return useQuery({
    queryKey: ["tasks", "assignee", assignedTo],
    queryFn: async () =>
      loadTasks()
        .filter((t) => t.assignedTo === assignedTo)
        .map(toQueryTask),
    staleTime: 0,
  });
}

export function useAddBackendTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      title,
      description,
      priority,
      dueDate,
      assignedTo,
    }: {
      title: string;
      description: string;
      priority: string;
      dueDate: string;
      assignedTo: string;
    }) => {
      const tasks = loadTasks();
      const nextId =
        tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
      const newTask: LocalTask = {
        id: nextId,
        title,
        description,
        priority,
        status: "Pending",
        dueDate,
        assignedTo,
        createdAt: new Date().toISOString(),
        completedAt: "",
      };
      saveTasks([...tasks, newTask]);
      return BigInt(nextId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useUpdateBackendTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      status,
    }: {
      id: bigint;
      title: string;
      description: string;
      priority: string;
      dueDate: string;
      assignedTo: string;
      status: string;
    }) => {
      const numId = Number(id);
      const tasks = loadTasks();
      const updated = tasks.map((t) =>
        t.id === numId
          ? { ...t, title, description, priority, dueDate, assignedTo, status }
          : t,
      );
      saveTasks(updated);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useDeleteBackendTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const numId = Number(id);
      saveTasks(loadTasks().filter((t) => t.id !== numId));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useCompleteBackendTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const numId = Number(id);
      const tasks = loadTasks();
      const updated = tasks.map((t) =>
        t.id === numId
          ? { ...t, status: "Done", completedAt: new Date().toISOString() }
          : t,
      );
      saveTasks(updated);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
    },
  });
}

export function useGetNextInvoiceNumber() {
  const { actor } = useActor();
  const getNextNumber = async (): Promise<string> => {
    if (!actor) {
      // Fallback: use timestamp-based
      const n = Date.now() % 10000;
      return `INV-${String(n).padStart(4, "0")}`;
    }
    try {
      const n = await actor.getNextInvoiceNumber();
      return `INV-${String(Number(n)).padStart(4, "0")}`;
    } catch {
      const n = Date.now() % 10000;
      return `INV-${String(n).padStart(4, "0")}`;
    }
  };
  return { getNextNumber };
}
