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
import { Textarea } from "@/components/ui/textarea";
import {
  AlertTriangle,
  Download,
  Edit,
  History,
  Loader2,
  Plus,
  QrCode,
  Search,
  Trash2,
} from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { usePinRole } from "../contexts/PinRoleContext";
import { useInventory } from "../hooks/useInventory";
import { useLowStockThreshold } from "../hooks/useQueries";
import { useStockMovements } from "../hooks/useStockMovements";
import type { InventoryItem, InventoryUnit, StockMovementType } from "../types";
import { exportToCSV } from "../utils/csv";

const CATEGORIES = [
  "Flowering Plants",
  "Indoor Plants",
  "Herbs",
  "Seedlings",
  "Soil & Mulch",
  "Tropical Plants",
  "Succulents",
  "Trees & Shrubs",
  "Tools & Supplies",
  "Other",
];

const UNITS: InventoryUnit[] = [
  "Plant nos.",
  "Pot",
  "Piece",
  "Bag",
  "Sq. Ft",
  "Other",
];

const MOVEMENT_TYPES: StockMovementType[] = [
  "Purchase",
  "Loss",
  "Damage",
  "Adjustment",
];

interface ItemFormData {
  name: string;
  description: string;
  agePlant: string;
  category: string;
  costPrice: string;
  sellingPrice: string;
  quantity: string;
  unit: InventoryUnit;
  threshold: string;
}

const emptyForm = (): ItemFormData => ({
  name: "",
  description: "",
  agePlant: "",
  category: "Indoor Plants",
  costPrice: "",
  sellingPrice: "",
  quantity: "",
  unit: "Plant nos.",
  threshold: "10",
});

const movementTypeColors: Record<StockMovementType, string> = {
  Purchase: "bg-success/15 text-success border-0",
  Loss: "bg-destructive/15 text-destructive border-0",
  Damage: "bg-destructive/15 text-destructive border-0",
  Adjustment: "bg-warning/20 text-warning-foreground border-0",
  Sales: "bg-primary/15 text-primary border-0",
};

export default function Inventory() {
  const { role } = usePinRole();
  const { items, addItem, updateItem, deleteItem } = useInventory();
  const { getMovementsByItem } = useStockMovements();
  const { data: threshold = 10n } = useLowStockThreshold();
  const globalThreshold = Number(threshold);
  const isClerk = role === "clerk";

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemFormData>(emptyForm());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Movement history modal
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);

  // QR modal
  const [qrItem, setQrItem] = useState<InventoryItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrLoading, setQrLoading] = useState(false);
  const qrCanvasRef = useRef<HTMLImageElement>(null);

  // Add stock movement modal
  const [stockMoveItem, setStockMoveItem] = useState<InventoryItem | null>(
    null,
  );
  const [moveType, setMoveType] = useState<StockMovementType>("Purchase");
  const [moveQty, setMoveQty] = useState("");
  const [moveRemarks, setMoveRemarks] = useState("");

  // Per-item threshold from item, or fall back to global
  const getEffectiveThreshold = (item: InventoryItem) =>
    item.threshold ?? globalThreshold;

  const filtered = items.filter((item) => {
    const matchSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "All" || item.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      description: item.description,
      agePlant: item.agePlant,
      category: item.category,
      costPrice: String(item.costPrice),
      sellingPrice: String(item.sellingPrice),
      quantity: String(item.quantity),
      unit: item.unit,
      threshold: String(item.threshold ?? globalThreshold),
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.quantity || !form.costPrice || !form.sellingPrice) {
      toast.error("Please fill in all required fields");
      return;
    }
    const data = {
      name: form.name,
      description: form.description,
      agePlant: form.agePlant,
      category: form.category,
      costPrice: Number(form.costPrice),
      sellingPrice: Number(form.sellingPrice),
      quantity: Number(form.quantity),
      unit: form.unit,
      threshold: Number(form.threshold) || globalThreshold,
    };
    if (editingId) {
      updateItem(editingId, data, role ?? "owner");
      toast.success("Item updated");
    } else {
      addItem(data, role ?? "owner");
      toast.success("Item added to inventory");
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteItem(id);
    setDeleteConfirmId(null);
    toast.success("Item deleted");
  };

  const handleExport = () => {
    exportToCSV(
      "inventory.csv",
      filtered.map((i) => ({
        SKU: i.sku,
        Name: i.name,
        Description: i.description,
        "Age of Plant": i.agePlant,
        Category: i.category,
        // Cost price excluded from Clerk exports
        ...(role === "owner" ? { "Cost Price (₹)": i.costPrice } : {}),
        "Selling Price (₹)": i.sellingPrice,
        ...(role === "owner"
          ? {
              "Margin %": (
                ((i.sellingPrice - i.costPrice) / i.costPrice) *
                100
              ).toFixed(1),
            }
          : {}),
        Quantity: i.quantity,
        Unit: i.unit,
        "Low Stock Threshold": i.threshold ?? globalThreshold,
        Status:
          i.quantity <= getEffectiveThreshold(i) ? "Low Stock" : "In Stock",
      })),
    );
    toast.success("CSV exported");
  };

  // QR code generation with plant name footer
  const openQR = async (item: InventoryItem) => {
    setQrItem(item);
    setQrLoading(true);
    try {
      const data = JSON.stringify({
        name: item.name,
        description: item.description,
        sellingPrice: item.sellingPrice,
      });

      const qrSize = 256;
      const padding = 16;
      const footerHeight = 40;
      const canvasWidth = qrSize + padding * 2;
      const canvasHeight = qrSize + padding * 2 + footerHeight;

      // Generate raw QR data URL
      const rawQr = await QRCode.toDataURL(data, {
        width: qrSize,
        margin: 1,
        color: { dark: "#1a3d1f", light: "#ffffff" },
      });

      // Draw QR + footer text on canvas
      const canvas = document.createElement("canvas");
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not available");

      // White background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw QR image
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = rawQr;
      });
      ctx.drawImage(img, padding, padding, qrSize, qrSize);

      // Footer: plant name centered below QR
      ctx.fillStyle = "#1a3d1f";
      ctx.font = "bold 15px Arial, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        item.name,
        canvasWidth / 2,
        qrSize + padding * 2 + footerHeight / 2,
      );

      setQrDataUrl(canvas.toDataURL("image/png"));
    } catch {
      toast.error("Failed to generate QR code");
    } finally {
      setQrLoading(false);
    }
  };

  const downloadQR = () => {
    if (!qrDataUrl || !qrItem) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${qrItem.sku}-qr.png`;
    a.click();
    toast.success("QR code downloaded");
  };

  // Stock movement
  const handleStockMove = () => {
    if (!stockMoveItem || !moveQty) return;
    const qty = Number(moveQty);
    if (qty <= 0) {
      toast.error("Quantity must be positive");
      return;
    }

    if (moveType === "Purchase") {
      const newQty = stockMoveItem.quantity + qty;
      updateItem(stockMoveItem.id, { quantity: newQty }, role ?? "owner");
    } else {
      const newQty = Math.max(0, stockMoveItem.quantity - qty);
      updateItem(stockMoveItem.id, { quantity: newQty }, role ?? "owner");
    }

    setStockMoveItem(null);
    setMoveQty("");
    setMoveRemarks("");
    toast.success("Stock updated");
  };

  const uniqueCategories = [
    "All",
    ...Array.from(new Set(items.map((i) => i.category))),
  ];

  const getMarginBadge = (item: InventoryItem) => {
    if (isClerk) return null;
    if (item.costPrice === 0) return null;
    const margin =
      ((item.sellingPrice - item.costPrice) / item.costPrice) * 100;
    if (margin >= 40) {
      return (
        <Badge className="text-[10px] bg-success/15 text-success border-0">
          {margin.toFixed(0)}%
        </Badge>
      );
    }
    if (margin < 20) {
      return (
        <Badge className="text-[10px] bg-destructive/15 text-destructive border-0">
          {margin.toFixed(0)}%
        </Badge>
      );
    }
    return (
      <Badge className="text-[10px] bg-warning/20 text-warning-foreground border-0">
        {margin.toFixed(0)}%
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Inventory
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} total items
          </p>
        </div>
        <div className="flex gap-2">
          {role === "owner" && (
            <>
              <Button
                variant="outline"
                onClick={handleExport}
                data-ocid="inventory.export.button"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button onClick={openAdd} data-ocid="inventory.add.button">
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, SKU, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-ocid="inventory.search_input"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48" data-ocid="inventory.category.select">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {uniqueCategories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <Table data-ocid="inventory.table">
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">
                Description
              </TableHead>
              <TableHead className="hidden sm:table-cell">Category</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="hidden sm:table-cell">Unit</TableHead>
              {/* Cost price hidden from Clerk */}
              {!isClerk && (
                <TableHead className="text-right hidden md:table-cell">
                  Cost ₹
                </TableHead>
              )}
              <TableHead className="text-right">Sell ₹</TableHead>
              {!isClerk && (
                <TableHead className="hidden lg:table-cell">Margin</TableHead>
              )}
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={isClerk ? 8 : 11}
                  className="text-center py-12 text-muted-foreground"
                  data-ocid="inventory.empty_state"
                >
                  No inventory items found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item, idx) => {
                const effectiveThreshold = getEffectiveThreshold(item);
                return (
                  <TableRow
                    key={item.id}
                    data-ocid={`inventory.item.${idx + 1}`}
                    className={
                      item.quantity <= effectiveThreshold
                        ? "bg-destructive/5"
                        : ""
                    }
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.sku}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{item.name}</p>
                        {item.agePlant && (
                          <p className="text-xs text-muted-foreground">
                            Age: {item.agePlant}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-32 truncate">
                      {item.description || "—"}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="secondary" className="text-xs">
                        {item.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                      {item.unit}
                    </TableCell>
                    {/* Cost price column - hidden from Clerk */}
                    {!isClerk && (
                      <TableCell className="text-right font-mono text-sm hidden md:table-cell">
                        ₹{item.costPrice.toFixed(2)}
                      </TableCell>
                    )}
                    <TableCell className="text-right font-mono text-sm">
                      ₹{item.sellingPrice.toFixed(2)}
                    </TableCell>
                    {!isClerk && (
                      <TableCell className="hidden lg:table-cell">
                        {getMarginBadge(item)}
                      </TableCell>
                    )}
                    <TableCell>
                      {item.quantity <= effectiveThreshold ? (
                        <Badge variant="destructive" className="gap-1 text-xs">
                          <AlertTriangle className="w-3 h-3" />
                          Low
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-success/15 text-success border-0">
                          In Stock
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openQR(item)}
                          title="Export QR Code"
                          data-ocid={`inventory.qr.button.${idx + 1}`}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setHistoryItem(item)}
                          title="Movement History"
                          data-ocid={`inventory.history.button.${idx + 1}`}
                        >
                          <History className="w-3.5 h-3.5" />
                        </Button>
                        {role === "owner" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => openEdit(item)}
                              data-ocid={`inventory.edit_button.${idx + 1}`}
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirmId(item.id)}
                              data-ocid={`inventory.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-3xl max-h-[90vh] overflow-y-auto"
          data-ocid="inventory.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Inventory Item" : "Add Inventory Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Item Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. Rose Bush (Red)"
                  data-ocid="inventory.name.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>SKU (Auto-generated)</Label>
                <Input
                  value={
                    editingId
                      ? (items.find((i) => i.id === editingId)?.sku ?? "—")
                      : "Auto-generated on save"
                  }
                  disabled
                  className="bg-muted/50 text-muted-foreground font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Plant description, characteristics..."
                rows={2}
                data-ocid="inventory.description.textarea"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Age of Plant</Label>
                <Input
                  value={form.agePlant}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, agePlant: e.target.value }))
                  }
                  placeholder="e.g. 6 months, 1 year"
                  data-ocid="inventory.age.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger data-ocid="inventory.category_form.select">
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

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Cost Price (₹) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.costPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, costPrice: e.target.value }))
                  }
                  placeholder="0.00"
                  data-ocid="inventory.cost_price.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Selling Price (₹) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.sellingPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sellingPrice: e.target.value }))
                  }
                  placeholder="0.00"
                  data-ocid="inventory.selling_price.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Margin{" "}
                  {form.costPrice && form.sellingPrice
                    ? `(${(
                        ((Number(form.sellingPrice) - Number(form.costPrice)) /
                          Number(form.costPrice)) *
                          100
                      ).toFixed(1)}%)`
                    : ""}
                </Label>
                <Input
                  value={
                    form.costPrice && form.sellingPrice
                      ? `₹${(Number(form.sellingPrice) - Number(form.costPrice)).toFixed(2)}`
                      : "—"
                  }
                  disabled
                  className="bg-muted/50 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, quantity: e.target.value }))
                  }
                  placeholder="0"
                  data-ocid="inventory.quantity.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Unit *</Label>
                <Select
                  value={form.unit}
                  onValueChange={(v) =>
                    setForm((f) => ({ ...f, unit: v as InventoryUnit }))
                  }
                >
                  <SelectTrigger data-ocid="inventory.unit.select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Low Stock Threshold</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.threshold}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, threshold: e.target.value }))
                  }
                  placeholder="10"
                  data-ocid="inventory.threshold.input"
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="inventory.cancel_button"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} data-ocid="inventory.save_button">
              {editingId ? "Save Changes" : "Add Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="inventory.delete.dialog"
        >
          <DialogHeader>
            <DialogTitle>Delete Item</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this item? This cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              data-ocid="inventory.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              data-ocid="inventory.delete.confirm_button"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Movement History Dialog */}
      <Dialog open={!!historyItem} onOpenChange={() => setHistoryItem(null)}>
        <DialogContent
          className="sm:max-w-2xl max-h-[80vh] flex flex-col"
          data-ocid="inventory.history.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              Movement History — {historyItem?.name} ({historyItem?.sku})
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {historyItem &&
              (() => {
                const movs = getMovementsByItem(historyItem.id);
                return movs.length === 0 ? (
                  <div
                    className="py-10 text-center text-muted-foreground text-sm"
                    data-ocid="inventory.history.empty_state"
                  >
                    No movement history recorded yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date/Time</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Qty Change</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead>By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {movs.map((mov, idx) => (
                        <TableRow
                          key={mov.id}
                          data-ocid={`inventory.history.item.${idx + 1}`}
                        >
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(mov.timestamp).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`text-xs ${movementTypeColors[mov.type]}`}
                            >
                              {mov.type}
                            </Badge>
                          </TableCell>
                          <TableCell
                            className={`text-right font-mono font-semibold ${
                              mov.quantity > 0
                                ? "text-success"
                                : "text-destructive"
                            }`}
                          >
                            {mov.quantity > 0 ? "+" : ""}
                            {mov.quantity}
                          </TableCell>
                          <TableCell className="text-sm max-w-40 truncate">
                            {mov.remarks || "—"}
                          </TableCell>
                          <TableCell className="text-sm capitalize text-muted-foreground">
                            {mov.performedBy}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                );
              })()}
          </div>
          {role === "owner" && historyItem && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-semibold text-muted-foreground mb-3">
                Add Stock Movement
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Select
                  value={moveType}
                  onValueChange={(v) => setMoveType(v as StockMovementType)}
                >
                  <SelectTrigger
                    className="h-8 text-sm"
                    data-ocid="inventory.move.type.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOVEMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="1"
                  placeholder="Qty"
                  value={moveQty}
                  onChange={(e) => setMoveQty(e.target.value)}
                  className="h-8 text-sm"
                  data-ocid="inventory.move.qty.input"
                />
                <Input
                  placeholder="Remarks"
                  value={moveRemarks}
                  onChange={(e) => setMoveRemarks(e.target.value)}
                  className="h-8 text-sm"
                  data-ocid="inventory.move.remarks.input"
                />
              </div>
              <Button
                size="sm"
                className="mt-2"
                onClick={() => {
                  if (historyItem) {
                    setStockMoveItem(historyItem);
                    handleStockMove();
                  }
                }}
                data-ocid="inventory.move.submit_button"
              >
                Record Movement
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog
        open={!!qrItem}
        onOpenChange={() => {
          setQrItem(null);
          setQrDataUrl("");
        }}
      >
        <DialogContent className="sm:max-w-sm" data-ocid="inventory.qr.dialog">
          <DialogHeader>
            <DialogTitle>QR Code — {qrItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrLoading ? (
              <div
                className="flex items-center gap-2 text-muted-foreground"
                data-ocid="inventory.qr.loading_state"
              >
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Generating QR...</span>
              </div>
            ) : qrDataUrl ? (
              <>
                <img
                  ref={qrCanvasRef}
                  src={qrDataUrl}
                  alt={`QR Code for ${qrItem?.name}`}
                  className="rounded-lg border border-border"
                  style={{ width: 288, height: "auto" }}
                />
                <div className="text-center text-xs text-muted-foreground space-y-1">
                  <p>Selling Price: ₹{qrItem?.sellingPrice.toFixed(2)}</p>
                  {qrItem?.description && (
                    <p className="max-w-48 truncate">{qrItem.description}</p>
                  )}
                </div>
                <Button
                  onClick={downloadQR}
                  data-ocid="inventory.qr.download.button"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR
                </Button>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
