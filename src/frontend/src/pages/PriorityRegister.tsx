import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { usePinRole } from "../contexts/PinRoleContext";
import { usePriorityTasks } from "../hooks/usePriorityTasks";
import type { AssignedTo, Priority, PriorityTask, TaskStatus } from "../types";

const priorityColors: Record<Priority, string> = {
  High: "bg-destructive/15 text-destructive border-0",
  Medium: "bg-warning/20 text-warning-foreground border-0",
  Low: "bg-success/15 text-success border-0",
};

const statusColors: Record<TaskStatus, string> = {
  Pending: "bg-muted text-muted-foreground border-0",
  "In Progress": "bg-primary/15 text-primary border-0",
  Done: "bg-success/15 text-success border-0",
};

const assignedToColors: Record<AssignedTo, string> = {
  owner: "bg-primary/10 text-primary border-0",
  clerk: "bg-chart-2/15 text-chart-2 border-0",
  all: "bg-accent/30 text-accent-foreground border-0",
};

const assignedToLabels: Record<AssignedTo, string> = {
  owner: "Owner",
  clerk: "Clerk",
  all: "All",
};

interface TaskForm {
  title: string;
  description: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
  assignedTo: AssignedTo;
}

const emptyForm = (): TaskForm => ({
  title: "",
  description: "",
  priority: "Medium",
  status: "Pending",
  dueDate: "",
  assignedTo: "all",
});

export default function PriorityRegister() {
  const { role } = usePinRole();
  const { tasks, addTask, updateTask, deleteTask, completeTask } =
    usePriorityTasks();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm>(emptyForm());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  // Clerk: filter to tasks assigned to them or all
  const relevantTasks =
    role === "owner"
      ? tasks
      : tasks.filter((t) => t.assignedTo === "clerk" || t.assignedTo === "all");

  const filtered = relevantTasks.filter((t) => {
    const matchPriority =
      priorityFilter === "All" || t.priority === priorityFilter;
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    return matchPriority && matchStatus;
  });

  const priorityOrder: Record<Priority, number> = {
    High: 0,
    Medium: 1,
    Low: 2,
  };
  const sorted = [...filtered].sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (task: PriorityTask) => {
    setEditingId(task.id);
    setForm({
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      assignedTo: task.assignedTo,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title) {
      toast.error("Title is required");
      return;
    }
    if (editingId) {
      updateTask(editingId, form);
      toast.success("Task updated");
    } else {
      addTask(form);
      toast.success("Task added");
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Priority Register
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {relevantTasks.filter((t) => t.status === "Pending").length}{" "}
            pending,{" "}
            {relevantTasks.filter((t) => t.status === "In Progress").length} in
            progress
          </p>
        </div>
        {role === "owner" && (
          <Button onClick={openAdd} data-ocid="priority.add.button">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Priority</p>
          <Tabs value={priorityFilter} onValueChange={setPriorityFilter}>
            <TabsList data-ocid="priority.filter.tab">
              <TabsTrigger value="All" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="High" className="text-xs">
                High
              </TabsTrigger>
              <TabsTrigger value="Medium" className="text-xs">
                Medium
              </TabsTrigger>
              <TabsTrigger value="Low" className="text-xs">
                Low
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Status</p>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList>
              <TabsTrigger value="All" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="Pending" className="text-xs">
                Pending
              </TabsTrigger>
              <TabsTrigger value="In Progress" className="text-xs">
                In Progress
              </TabsTrigger>
              <TabsTrigger value="Done" className="text-xs">
                Done
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <Table data-ocid="priority.table">
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden sm:table-cell">
                Assigned To
              </TableHead>
              <TableHead className="hidden md:table-cell">Due Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-12 text-muted-foreground"
                  data-ocid="priority.empty_state"
                >
                  No tasks found
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((task, idx) => (
                <TableRow key={task.id} data-ocid={`priority.item.${idx + 1}`}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-xs truncate">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-xs ${priorityColors[task.priority]}`}
                    >
                      {task.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${statusColors[task.status]}`}>
                      {task.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge
                      className={`text-xs ${assignedToColors[task.assignedTo]}`}
                    >
                      {assignedToLabels[task.assignedTo]}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {task.dueDate || "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {task.status !== "Done" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-success hover:text-success"
                          title="Mark Done"
                          onClick={() => {
                            completeTask(task.id);
                            toast.success("Task completed");
                          }}
                          data-ocid={`priority.complete.button.${idx + 1}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {role === "owner" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEdit(task)}
                            data-ocid={`priority.edit_button.${idx + 1}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(task.id)}
                            data-ocid={`priority.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" data-ocid="priority.dialog">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Task" : "Add Task"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="Task title"
                data-ocid="priority.title.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Optional details..."
                rows={2}
                data-ocid="priority.description.textarea"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, priority: v as Priority }))
                  }
                >
                  <SelectTrigger data-ocid="priority.priority.select">
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
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, status: v as TaskStatus }))
                  }
                >
                  <SelectTrigger data-ocid="priority.status.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Assign To</Label>
                <Select
                  value={form.assignedTo}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, assignedTo: v as AssignedTo }))
                  }
                >
                  <SelectTrigger data-ocid="priority.assigned_to.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="clerk">Clerk</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dueDate: e.target.value }))
                  }
                  data-ocid="priority.due_date.input"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="priority.cancel_button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} data-ocid="priority.save_button">
              {editingId ? "Save Changes" : "Add Task"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="priority.delete.dialog"
        >
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this task?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              data-ocid="priority.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteTask(deleteConfirmId);
                  setDeleteConfirmId(null);
                  toast.success("Task deleted");
                }
              }}
              data-ocid="priority.delete.confirm_button"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
