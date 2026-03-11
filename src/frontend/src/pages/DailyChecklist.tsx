import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import confetti from "canvas-confetti";
import {
  Calendar,
  CheckCircle2,
  ClipboardList,
  Edit,
  Loader2,
  Plus,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { usePinRole } from "../contexts/PinRoleContext";
import { useChecklist, useDailyTasks } from "../hooks/useChecklistData";
import type {
  ChecklistItemLocal,
  DailyTaskLocal,
} from "../hooks/useChecklistData";

interface TaskForm {
  title: string;
  description: string;
  priority: string;
  dueDate: string;
  assignedTo: string;
}

const emptyTaskForm = (): TaskForm => ({
  title: "",
  description: "",
  priority: "Medium",
  dueDate: "",
  assignedTo: "clerk",
});

const priorityColors: Record<string, string> = {
  High: "bg-destructive/15 text-destructive border-0",
  Medium: "bg-warning/20 text-warning-foreground border-0",
  Low: "bg-success/15 text-success border-0",
};

const statusColors: Record<string, string> = {
  Pending: "bg-muted text-muted-foreground border-0",
  "In Progress": "bg-primary/15 text-primary border-0",
  Done: "bg-success/15 text-success border-0",
};

const assignedToLabels: Record<string, string> = {
  owner: "Owner",
  clerk: "Clerk",
  all: "All",
};

export default function DailyChecklist() {
  const { role } = usePinRole();
  const today = new Date().toISOString().split("T")[0];

  // Backend-synced checklist
  const {
    items: checklistItems,
    isLoading: checklistLoading,
    addItem,
    toggleItem,
    deleteItem,
    resetDay,
    updateItem,
  } = useChecklist(today);

  // Backend-synced tasks
  const {
    tasks: allTasks,
    isLoading: tasksLoading,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
  } = useDailyTasks();

  const [newTitle, setNewTitle] = useState("");
  const [checklistDeleteId, setChecklistDeleteId] = useState<string | null>(
    null,
  );
  const prevAllDone = useRef(false);

  // Checklist item editing state
  const [editChecklistItem, setEditChecklistItem] =
    useState<ChecklistItemLocal | null>(null);
  const [editChecklistTitle, setEditChecklistTitle] = useState("");

  // Async pending states
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [isEditingChecklist, setIsEditingChecklist] = useState(false);

  // Task management
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<TaskForm>(emptyTaskForm());
  const [taskDeleteId, setTaskDeleteId] = useState<string | null>(null);
  const [isSavingTask, setIsSavingTask] = useState(false);

  const total = checklistItems.length;
  const completed = checklistItems.filter((i) => i.completed).length;
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = total > 0 && completed === total;

  // Confetti on all done
  useEffect(() => {
    if (allDone && !prevAllDone.current) {
      prevAllDone.current = true;
      const fire = (particleRatio: number, opts: confetti.Options) => {
        confetti({
          ...opts,
          origin: { y: 0.7 },
          particleCount: Math.floor(200 * particleRatio),
        });
      };
      fire(0.25, {
        spread: 26,
        startVelocity: 55,
        colors: ["#3d9970", "#7fba00", "#f39c12"],
      });
      fire(0.2, { spread: 60, colors: ["#2ecc71", "#27ae60", "#f1c40f"] });
      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
        colors: ["#1abc9c", "#16a085"],
      });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
      toast.success("All tasks complete! Great work today!", {
        duration: 4000,
      });
    } else if (!allDone) {
      prevAllDone.current = false;
    }
  }, [allDone]);

  const handleAddChecklist = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setIsAddingChecklist(true);
    try {
      await addItem(title, "Daily");
      setNewTitle("");
    } catch {
      toast.error("Failed to add item");
    } finally {
      setIsAddingChecklist(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await toggleItem(id);
    } catch {
      toast.error("Failed to update item");
    }
  };

  const handleDeleteChecklist = async (id: string) => {
    try {
      await deleteItem(id);
      setChecklistDeleteId(null);
      toast.success("Item removed");
    } catch {
      toast.error("Failed to delete item");
    }
  };

  const handleReset = async () => {
    try {
      await resetDay();
      toast.success("Checklist reset for today");
    } catch {
      toast.error("Failed to reset checklist");
    }
  };

  const openEditChecklist = (item: ChecklistItemLocal) => {
    setEditChecklistItem(item);
    setEditChecklistTitle(item.title);
  };

  const handleSaveEditChecklist = async () => {
    if (!editChecklistItem || !editChecklistTitle.trim()) return;
    setIsEditingChecklist(true);
    try {
      await updateItem(editChecklistItem.id, editChecklistTitle.trim());
      setEditChecklistItem(null);
      setEditChecklistTitle("");
      toast.success("Item updated");
    } catch {
      toast.error("Failed to update item");
    } finally {
      setIsEditingChecklist(false);
    }
  };

  // Task management
  const openAddTask = () => {
    setEditingTaskId(null);
    setTaskForm(emptyTaskForm());
    setTaskDialogOpen(true);
  };

  const openEditTask = (task: DailyTaskLocal) => {
    setEditingTaskId(task.id);
    setTaskForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      dueDate: task.dueDate,
      assignedTo: task.assignedTo,
    });
    setTaskDialogOpen(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.title) {
      toast.error("Task title is required");
      return;
    }
    setIsSavingTask(true);
    try {
      if (editingTaskId !== null) {
        const task = allTasks.find((t) => t.id === editingTaskId);
        await updateTask(editingTaskId, {
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          dueDate: taskForm.dueDate,
          assignedTo: taskForm.assignedTo,
          status: task?.status ?? "Pending",
        });
        toast.success("Task updated");
      } else {
        await addTask({
          title: taskForm.title,
          description: taskForm.description,
          priority: taskForm.priority,
          dueDate: taskForm.dueDate,
          assignedTo: taskForm.assignedTo,
        });
        toast.success("Task assigned");
      }
      setTaskDialogOpen(false);
    } catch {
      toast.error("Failed to save task");
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      await deleteTask(id);
      setTaskDeleteId(null);
      toast.success("Task deleted");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleCompleteTask = async (id: string) => {
    try {
      await completeTask(id);
      toast.success("Task marked as done");
    } catch {
      toast.error("Failed to complete task");
    }
  };

  // Clerk sees only tasks assigned to them or all
  const visibleTasks =
    role === "owner"
      ? allTasks
      : allTasks.filter(
          (t) => t.assignedTo === "clerk" || t.assignedTo === "all",
        );

  const formattedDate = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {role === "owner" ? "Checklist & Tasks" : "Daily Checklist"}
          </h1>
          <div className="flex items-center gap-1.5 mt-1">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="checklist">
        <TabsList data-ocid="checklist.tab">
          <TabsTrigger value="checklist" className="gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Daily Checklist
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" />
            {role === "owner" ? "Assigned Tasks" : "My Tasks"}
            {visibleTasks.filter((t) => t.status !== "Done").length > 0 && (
              <Badge className="ml-1 text-[10px] px-1.5 py-0.5 bg-primary/15 text-primary border-0">
                {visibleTasks.filter((t) => t.status !== "Done").length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="space-y-4 mt-4">
          <div className="flex justify-between">
            <div />
            {role === "owner" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                data-ocid="checklist.reset.button"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                Reset Day
              </Button>
            )}
          </div>

          {/* Progress */}
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {allDone ? (
                    <CheckCircle2 className="w-5 h-5 text-success" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center">
                      <span className="text-[10px] font-bold text-muted-foreground">
                        {progress}%
                      </span>
                    </div>
                  )}
                  <span className="text-sm font-medium">
                    {allDone
                      ? "All done!"
                      : `${completed} of ${total} completed`}
                  </span>
                </div>
                <Badge
                  className={
                    allDone
                      ? "bg-success/15 text-success border-0"
                      : "bg-muted text-muted-foreground border-0"
                  }
                >
                  {progress}%
                </Badge>
              </div>
              <Progress
                value={progress}
                className="h-2"
                data-ocid="checklist.progress"
              />
            </CardContent>
          </Card>

          {/* Add item — owner only */}
          {role === "owner" && (
            <div className="flex gap-2">
              <Input
                placeholder="Add a new checklist item..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddChecklist();
                }}
                data-ocid="checklist.add.input"
              />
              <Button
                onClick={handleAddChecklist}
                disabled={!newTitle.trim() || isAddingChecklist}
                data-ocid="checklist.add.button"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Add
              </Button>
            </div>
          )}

          {/* Items */}
          {checklistLoading ? (
            <div className="space-y-2" data-ocid="checklist.loading_state">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : checklistItems.length === 0 ? (
            <Card
              className="border-dashed border-2 border-border"
              data-ocid="checklist.empty_state"
            >
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No items for today.
                </p>
                {role === "owner" && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Add tasks above to get started.
                  </p>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-w-2xl">
              {checklistItems.map((item, idx) => (
                <Card
                  key={item.id}
                  className={`border-border transition-all ${
                    item.completed ? "opacity-60 bg-muted/30" : "bg-card"
                  }`}
                  data-ocid={`checklist.item.${idx + 1}`}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <Checkbox
                      checked={item.completed}
                      onCheckedChange={() => handleToggle(item.id)}
                      data-ocid={`checklist.checkbox.${idx + 1}`}
                      className="flex-shrink-0"
                    />
                    <span
                      className={`flex-1 text-sm ${
                        item.completed
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {item.title}
                    </span>
                    {item.completed && (
                      <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                    )}
                    {role === "owner" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-primary flex-shrink-0"
                          onClick={() => openEditChecklist(item)}
                          data-ocid={`checklist.edit_button.${idx + 1}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive flex-shrink-0"
                          onClick={() => setChecklistDeleteId(item.id)}
                          data-ocid={`checklist.delete_button.${idx + 1}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4 mt-4">
          {role === "owner" && (
            <div className="flex justify-end">
              <Button onClick={openAddTask} data-ocid="tasks.add.button">
                <Plus className="w-4 h-4 mr-2" />
                Assign Task
              </Button>
            </div>
          )}

          {tasksLoading ? (
            <div className="space-y-2" data-ocid="tasks.loading_state">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 rounded-lg bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : visibleTasks.length === 0 ? (
            <Card
              className="border-dashed border-2 border-border"
              data-ocid="tasks.empty_state"
            >
              <CardContent className="py-12 text-center">
                <ClipboardList className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No tasks assigned.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden bg-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                      Task
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase hidden sm:table-cell">
                      Priority
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase hidden md:table-cell">
                      Assigned To
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase hidden lg:table-cell">
                      Due
                    </th>
                    <th className="text-right px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {visibleTasks.map((task, idx) => (
                    <tr
                      key={task.id}
                      className="border-b border-border last:border-0 hover:bg-muted/20"
                      data-ocid={`tasks.item.${idx + 1}`}
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium">{task.title}</p>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
                              {task.description}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <Badge
                          className={`text-xs ${priorityColors[task.priority] ?? ""}`}
                        >
                          {task.priority}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`text-xs ${statusColors[task.status] ?? ""}`}
                        >
                          {task.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {assignedToLabels[task.assignedTo] ?? task.assignedTo}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
                        {task.dueDate || "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {task.status !== "Done" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-success hover:text-success"
                              title="Mark Done"
                              onClick={() => handleCompleteTask(task.id)}
                              data-ocid={`tasks.complete.button.${idx + 1}`}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          )}
                          {role === "owner" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditTask(task)}
                                data-ocid={`tasks.edit_button.${idx + 1}`}
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setTaskDeleteId(task.id)}
                                data-ocid={`tasks.delete_button.${idx + 1}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Checklist item edit dialog */}
      <Dialog
        open={!!editChecklistItem}
        onOpenChange={() => setEditChecklistItem(null)}
      >
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="checklist.edit.dialog"
        >
          <DialogHeader>
            <DialogTitle>Edit Checklist Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Task Title</Label>
              <Input
                value={editChecklistTitle}
                onChange={(e) => setEditChecklistTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveEditChecklist();
                }}
                placeholder="Task title"
                data-ocid="checklist.edit.input"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setEditChecklistItem(null)}
              data-ocid="checklist.edit.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEditChecklist}
              disabled={!editChecklistTitle.trim() || isEditingChecklist}
              data-ocid="checklist.edit.save_button"
            >
              {isEditingChecklist ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checklist delete confirm */}
      <Dialog
        open={!!checklistDeleteId}
        onOpenChange={() => setChecklistDeleteId(null)}
      >
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="checklist.delete.dialog"
        >
          <DialogHeader>
            <DialogTitle>Remove Item</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Remove this item from today's checklist?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setChecklistDeleteId(null)}
              data-ocid="checklist.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                checklistDeleteId !== null &&
                handleDeleteChecklist(checklistDeleteId)
              }
              data-ocid="checklist.delete.confirm_button"
            >
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task add/edit dialog */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-md" data-ocid="tasks.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingTaskId !== null ? "Edit Task" : "Assign New Task"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={taskForm.title}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Task title"
                data-ocid="tasks.title.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Optional details..."
                rows={2}
                data-ocid="tasks.description.textarea"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={taskForm.priority}
                  onValueChange={(v) =>
                    setTaskForm((f) => ({ ...f, priority: v }))
                  }
                >
                  <SelectTrigger data-ocid="tasks.priority.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assign To</Label>
                <Select
                  value={taskForm.assignedTo}
                  onValueChange={(v) =>
                    setTaskForm((f) => ({ ...f, assignedTo: v }))
                  }
                >
                  <SelectTrigger data-ocid="tasks.assigned_to.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clerk">Clerk</SelectItem>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={taskForm.dueDate}
                onChange={(e) =>
                  setTaskForm((f) => ({ ...f, dueDate: e.target.value }))
                }
                data-ocid="tasks.due_date.input"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setTaskDialogOpen(false)}
              data-ocid="tasks.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTask}
              disabled={isSavingTask}
              data-ocid="tasks.submit_button"
            >
              {isSavingTask ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {editingTaskId !== null ? "Save Changes" : "Assign Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task delete confirm */}
      <Dialog open={!!taskDeleteId} onOpenChange={() => setTaskDeleteId(null)}>
        <DialogContent className="sm:max-w-sm" data-ocid="tasks.delete.dialog">
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this task?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setTaskDeleteId(null)}
              data-ocid="tasks.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                taskDeleteId !== null && handleDeleteTask(taskDeleteId)
              }
              data-ocid="tasks.delete.confirm_button"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
