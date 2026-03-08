import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Download, Edit, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useExpenditures } from "../hooks/useExpenditures";
import type { Expenditure, ExpenseCategory } from "../types";
import { exportToCSV } from "../utils/csv";

const CATEGORIES: ExpenseCategory[] = [
  "Seeds",
  "Tools",
  "Labour",
  "Utilities",
  "Other",
];

const categoryColors: Record<ExpenseCategory, string> = {
  Seeds: "bg-success/15 text-success border-0",
  Tools: "bg-accent/50 text-accent-foreground border-0",
  Labour: "bg-primary/15 text-primary border-0",
  Utilities: "bg-primary/10 text-primary border-0",
  Other: "bg-muted text-muted-foreground border-0",
};

interface ExpForm {
  date: string;
  category: ExpenseCategory;
  amount: string;
  description: string;
}

const emptyForm = (): ExpForm => ({
  date: new Date().toISOString().split("T")[0],
  category: "Other",
  amount: "",
  description: "",
});

export default function Expenditures() {
  const { expenditures, addExpenditure, updateExpenditure, deleteExpenditure } =
    useExpenditures();
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ExpForm>(emptyForm());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const filtered = expenditures.filter(
    (e) => categoryFilter === "All" || e.category === categoryFilter,
  );

  const monthlyTotal = expenditures
    .filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const totalAllTime = expenditures.reduce((sum, e) => sum + e.amount, 0);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (exp: Expenditure) => {
    setEditingId(exp.id);
    setForm({
      date: exp.date,
      category: exp.category,
      amount: String(exp.amount),
      description: exp.description,
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.amount || !form.description) {
      toast.error("Please fill in all required fields");
      return;
    }
    const data = {
      date: form.date,
      category: form.category,
      amount: Number(form.amount),
      description: form.description,
    };
    if (editingId) {
      updateExpenditure(editingId, data);
      toast.success("Expense updated");
    } else {
      addExpenditure(data);
      toast.success("Expense recorded");
    }
    setDialogOpen(false);
  };

  const handleExport = () => {
    exportToCSV(
      "expenditures.csv",
      filtered.map((e) => ({
        Date: e.date,
        Category: e.category,
        Amount: e.amount,
        Description: e.description,
      })),
    );
    toast.success("CSV exported");
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Expenditures
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track all business expenses
          </p>
        </div>
        <Button onClick={openAdd} data-ocid="expenditure.add.button">
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display font-bold text-destructive">
              ₹{monthlyTotal.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date().toLocaleDateString("en-AU", {
                month: "long",
                year: "numeric",
              })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              All Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display font-bold text-foreground">
              ₹{totalAllTime.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {expenditures.length} expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Categories</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <Table data-ocid="expenditure.table">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-muted-foreground"
                >
                  No expenses recorded
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((exp, idx) => (
                <TableRow
                  key={exp.id}
                  data-ocid={`expenditure.item.${idx + 1}`}
                >
                  <TableCell className="text-sm">{exp.date}</TableCell>
                  <TableCell>
                    <Badge className={categoryColors[exp.category]}>
                      {exp.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-xs truncate">
                    {exp.description}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold text-destructive">
                    ₹{exp.amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(exp)}
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirmId(exp.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Expense" : "Add Expense"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, category: v as ExpenseCategory }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description *</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="What was this expense for?"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingId ? "Save Changes" : "Add Expense"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Expense</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this expense?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteExpenditure(deleteConfirmId);
                  setDeleteConfirmId(null);
                  toast.success("Expense deleted");
                }
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
