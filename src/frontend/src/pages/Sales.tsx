import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
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
  CheckCircle,
  ChevronsUpDown,
  CreditCard,
  Loader2,
  Plus,
  Printer,
  Receipt,
  Trash2,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { usePinRole } from "../contexts/PinRoleContext";
import { useInventory } from "../hooks/useInventory";
import { useGetNextInvoiceNumber } from "../hooks/useQueries";
import { useSales } from "../hooks/useSales";
import type { Invoice, PaymentMethod } from "../types";

interface LineItemForm {
  id: string;
  inventoryItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  maxStock: number;
}

function newLineItem(): LineItemForm {
  return {
    id: `li-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    inventoryItemId: "",
    name: "",
    quantity: 1,
    unitPrice: 0,
    costPrice: 0,
    maxStock: 9999,
  };
}

interface InvoiceFormData {
  date: string;
  customerName: string;
  customerPhone: string;
  notes: string;
  lineItems: LineItemForm[];
  paymentMethod: PaymentMethod;
}

function emptyForm(): InvoiceFormData {
  return {
    date: new Date().toISOString().split("T")[0],
    customerName: "",
    customerPhone: "",
    notes: "",
    lineItems: [newLineItem()],
    paymentMethod: "Cash",
  };
}

function calcTotal(lineItems: LineItemForm[]) {
  return lineItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
}

const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "UPI", "Card"];

const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
  Cash: <Receipt className="w-3.5 h-3.5" />,
  UPI: <CreditCard className="w-3.5 h-3.5" />,
  Card: <CreditCard className="w-3.5 h-3.5" />,
};

const paymentColors: Record<PaymentMethod, string> = {
  Cash: "bg-success/15 text-success border-0",
  UPI: "bg-primary/15 text-primary border-0",
  Card: "bg-chart-3/15 text-chart-3 border-0",
};

// ── Invoice Print Template ────────────────────────────────────────────────
function InvoicePrintTemplate({ invoice }: { invoice: Invoice }) {
  const total = invoice.lineItems.reduce(
    (s, l) => s + l.quantity * l.unitPrice,
    0,
  );

  return (
    <div style={{ padding: "2cm", background: "white", color: "black" }}>
      <div style={{ maxWidth: 700, margin: "0 auto", fontFamily: "serif" }}>
        {/* Header */}
        <div
          style={{
            textAlign: "center",
            borderBottom: "2px solid #1a3d1f",
            paddingBottom: 12,
            marginBottom: 16,
          }}
        >
          <h1
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "#1a3d1f",
              letterSpacing: 2,
              margin: 0,
            }}
          >
            ESEARTH NURSERY GARDEN
          </h1>
          <p style={{ fontSize: 12, color: "#444", margin: "4px 0 0" }}>
            Near Jio Petrol Bunk, Salem Highway
          </p>
          <p style={{ fontSize: 12, color: "#444", margin: "2px 0 0" }}>
            Papinaickenpatti, Namakkal – 637003
          </p>
          <p style={{ fontSize: 12, color: "#444", margin: "2px 0 0" }}>
            Ph: 7695887203 / 9443551796
          </p>
        </div>

        {/* Invoice Info */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: 16,
          }}
        >
          <div>
            <p
              style={{
                fontWeight: 700,
                fontSize: 16,
                color: "#1a3d1f",
                margin: 0,
              }}
            >
              INVOICE
            </p>
            <p style={{ fontSize: 12, color: "#555", margin: "2px 0 0" }}>
              Invoice No: {invoice.invoiceNumber}
            </p>
            <p style={{ fontSize: 12, color: "#555", margin: "2px 0 0" }}>
              Date: {invoice.date}
            </p>
            <p style={{ fontSize: 12, color: "#555", margin: "2px 0 0" }}>
              Payment: {invoice.paymentMethod}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>Bill To:</p>
            <p style={{ fontSize: 13, margin: "2px 0 0" }}>
              {invoice.customerName}
            </p>
            {invoice.customerPhone && (
              <p style={{ fontSize: 12, color: "#555", margin: "2px 0 0" }}>
                {invoice.customerPhone}
              </p>
            )}
          </div>
        </div>

        {invoice.notes && (
          <p style={{ fontSize: 12, color: "#666", marginBottom: 12 }}>
            Note: {invoice.notes}
          </p>
        )}

        {/* Line items table */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: 16,
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: "2px solid #1a3d1f",
                backgroundColor: "#f5f9f5",
              }}
            >
              <th
                style={{ textAlign: "left", padding: "8px 6px", fontSize: 12 }}
              >
                Item
              </th>
              <th
                style={{ textAlign: "right", padding: "8px 6px", fontSize: 12 }}
              >
                Qty
              </th>
              <th
                style={{ textAlign: "right", padding: "8px 6px", fontSize: 12 }}
              >
                Unit Price
              </th>
              <th
                style={{ textAlign: "right", padding: "8px 6px", fontSize: 12 }}
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems.map((li, idx) => (
              <tr
                key={li.id}
                style={{
                  borderBottom: "1px solid #e8f0e8",
                  backgroundColor: idx % 2 === 0 ? "white" : "#fafef9",
                }}
              >
                <td style={{ padding: "7px 6px", fontSize: 12 }}>{li.name}</td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "7px 6px",
                    fontSize: 12,
                  }}
                >
                  {li.quantity}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "7px 6px",
                    fontSize: 12,
                  }}
                >
                  ₹{li.unitPrice.toFixed(2)}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    padding: "7px 6px",
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  ₹{(li.quantity * li.unitPrice).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Total */}
        <div
          style={{
            textAlign: "right",
            borderTop: "2px solid #1a3d1f",
            paddingTop: 8,
            marginBottom: 24,
          }}
        >
          <p style={{ fontSize: 18, fontWeight: 700, color: "#1a3d1f" }}>
            Total: ₹{total.toFixed(2)}
          </p>
          <p style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
            Payment Method: {invoice.paymentMethod}
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            borderTop: "1px dashed #ccc",
            paddingTop: 16,
            textAlign: "center",
            color: "#555",
          }}
        >
          <p style={{ fontSize: 11, lineHeight: 1.6, marginBottom: 8 }}>
            We declare that this invoice shows the actual price of the goods
            described and that all particulars are true and correct.
          </p>
          <p
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "#1a3d1f",
              margin: "8px 0 2px",
            }}
          >
            THANK YOU FOR SHOPPING WITH US
          </p>
          <p style={{ fontSize: 12, color: "#444", marginBottom: 8 }}>
            VISIT AGAIN – HAVE A NICE DAY
          </p>
          <p style={{ fontSize: 13, fontStyle: "italic", color: "#2d5a2e" }}>
            உழுதுண்டு வாழ்வாரே வாழ்வார்மற் றெல்லாம்
            <br />
            தொழுதுண்டு பின்செல் பவர்.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Sales() {
  const { role } = usePinRole();
  const { invoices, addInvoice, deleteInvoice, togglePaid } = useSales();
  const { items: inventory } = useInventory();
  const { getNextNumber } = useGetNextInvoiceNumber();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<InvoiceFormData>(emptyForm());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const invoicePrintRef = useRef<HTMLDivElement>(null);
  // Track open state for each line item's inventory combobox
  const [comboOpenMap, setComboOpenMap] = useState<Record<string, boolean>>({});

  const setComboOpen = (id: string, open: boolean) => {
    setComboOpenMap((prev) => ({ ...prev, [id]: open }));
  };

  const handleAddLineItem = () => {
    setForm((f) => ({ ...f, lineItems: [...f.lineItems, newLineItem()] }));
  };

  const handleRemoveLineItem = (id: string) => {
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.filter((l) => l.id !== id),
    }));
  };

  const handleInventorySelect = (
    lineItemId: string,
    inventoryItemId: string,
  ) => {
    const invItem = inventory.find((i) => i.id === inventoryItemId);
    if (!invItem) return;
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((l) =>
        l.id === lineItemId
          ? {
              ...l,
              inventoryItemId,
              name: invItem.name,
              unitPrice: invItem.sellingPrice,
              costPrice: invItem.costPrice,
              maxStock: invItem.quantity,
            }
          : l,
      ),
    }));
  };

  const handleLineItemChange = (
    id: string,
    field: "quantity" | "unitPrice",
    value: number,
  ) => {
    setForm((f) => ({
      ...f,
      lineItems: f.lineItems.map((l) =>
        l.id === id ? { ...l, [field]: value } : l,
      ),
    }));
  };

  const validateLineItems = () => {
    for (const li of form.lineItems) {
      if (!li.inventoryItemId) {
        toast.error("Please select an inventory item for each line");
        return false;
      }
      if (li.quantity <= 0) {
        toast.error("Quantity must be at least 1");
        return false;
      }
      if (li.quantity > li.maxStock) {
        toast.error(
          `Not enough stock for ${li.name}. Available: ${li.maxStock}`,
        );
        return false;
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!form.customerName) {
      toast.error("Customer name is required");
      return;
    }
    if (!validateLineItems()) return;

    setSaving(true);
    try {
      const invoiceNumber = await getNextNumber();
      await addInvoice(
        {
          invoiceNumber,
          date: form.date,
          customerName: form.customerName,
          customerPhone: form.customerPhone,
          notes: form.notes,
          lineItems: form.lineItems.map((li) => ({
            id: li.id,
            inventoryItemId: li.inventoryItemId,
            name: li.name,
            quantity: li.quantity,
            unitPrice: li.unitPrice,
            costPrice: li.costPrice,
          })),
          paymentMethod: form.paymentMethod,
          paid: false,
        },
        role ?? "owner",
      );
      toast.success(`Invoice ${invoiceNumber} created`);
      setDialogOpen(false);
      setForm(emptyForm());
    } catch {
      toast.error("Failed to create invoice");
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async (invoice: Invoice) => {
    setExporting(true);
    setPrintInvoice(invoice);
    // Wait for the hidden print area to render
    await new Promise((r) => setTimeout(r, 300));
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");
      const el = invoicePrintRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      // 80mm thermal printer width = ~226pt; use A4 fallback for readability
      const pageWidth = 210; // A4 mm
      const pageHeight = (canvas.height / canvas.width) * pageWidth;
      const pdf = new jsPDF({
        orientation: pageHeight > pageWidth ? "portrait" : "landscape",
        unit: "mm",
        format: [pageWidth, Math.max(pageHeight, 80)],
      });
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, pageHeight);
      pdf.save(`Invoice-${invoice.invoiceNumber}.pdf`);
      toast.success(`Invoice ${invoice.invoiceNumber} exported as PDF`);
    } catch {
      toast.error("Failed to export PDF");
    } finally {
      setExporting(false);
      setPrintInvoice(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Sales & Billing
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {invoices.length} invoices
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm());
            setDialogOpen(true);
          }}
          data-ocid="sales.add.button"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Invoice list */}
      <div className="border border-border rounded-xl overflow-hidden bg-card">
        <Table data-ocid="sales.table">
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="hidden sm:table-cell">Items</TableHead>
              <TableHead className="text-right">Total ₹</TableHead>
              <TableHead className="hidden md:table-cell">Payment</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-12 text-muted-foreground"
                  data-ocid="sales.empty_state"
                >
                  No invoices yet. Create your first invoice!
                </TableCell>
              </TableRow>
            ) : (
              invoices.map((inv, idx) => {
                const total = inv.lineItems.reduce(
                  (s, l) => s + l.quantity * l.unitPrice,
                  0,
                );
                return (
                  <TableRow key={inv.id} data-ocid={`sales.item.${idx + 1}`}>
                    <TableCell>
                      <span className="font-mono text-sm font-semibold text-primary">
                        {inv.invoiceNumber}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{inv.date}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">
                          {inv.customerName}
                        </p>
                        {inv.customerPhone && (
                          <p className="text-xs text-muted-foreground">
                            {inv.customerPhone}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                      {inv.lineItems.length} item
                      {inv.lineItems.length !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      ₹{total.toFixed(2)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge
                        className={`text-xs gap-1 ${paymentColors[inv.paymentMethod]}`}
                      >
                        {paymentIcons[inv.paymentMethod]}
                        {inv.paymentMethod}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={inv.paid}
                          onCheckedChange={() => togglePaid(inv.id)}
                          data-ocid={`sales.paid.toggle.${idx + 1}`}
                        />
                        <Badge
                          className={`text-xs ${
                            inv.paid
                              ? "bg-success/15 text-success border-0"
                              : "bg-warning/20 text-warning-foreground border-0"
                          }`}
                        >
                          {inv.paid ? (
                            <>
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Paid
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 mr-1" />
                              Unpaid
                            </>
                          )}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePrint(inv)}
                          data-ocid={`sales.print.button.${idx + 1}`}
                          title="Export Invoice as PDF"
                          disabled={exporting}
                        >
                          {exporting && printInvoice?.id === inv.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Printer className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        {role === "owner" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirmId(inv.id)}
                            data-ocid={`sales.delete_button.${idx + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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

      {/* New Invoice Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-4xl max-h-[90vh] overflow-y-auto"
          data-ocid="sales.dialog"
        >
          <DialogHeader>
            <DialogTitle>New Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Customer & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Customer Name *</Label>
                <Input
                  value={form.customerName}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customerName: e.target.value }))
                  }
                  placeholder="Full name"
                  data-ocid="sales.customer_name.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.customerPhone}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, customerPhone: e.target.value }))
                  }
                  placeholder="Mobile number"
                  data-ocid="sales.customer_phone.input"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, date: e.target.value }))
                  }
                  data-ocid="sales.date.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <div className="flex gap-2">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({ ...f, paymentMethod: method }))
                      }
                      data-ocid={`sales.payment.${method.toLowerCase()}.toggle`}
                      className={`flex-1 h-10 rounded-lg border text-sm font-medium flex items-center justify-center gap-1.5 transition-colors ${
                        form.paymentMethod === method
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-primary/50"
                      }`}
                    >
                      {paymentIcons[method]}
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
                placeholder="Any notes..."
                rows={2}
                data-ocid="sales.notes.textarea"
              />
            </div>

            {/* Line items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-sm font-semibold">Line Items</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddLineItem}
                  data-ocid="sales.add_item.button"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add Item
                </Button>
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item (from Inventory)</TableHead>
                      <TableHead className="w-20">Qty</TableHead>
                      <TableHead className="w-32">Unit Price ₹</TableHead>
                      <TableHead className="w-28 text-right">
                        Subtotal
                      </TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.lineItems.map((li, idx) => {
                      const stockWarn =
                        li.inventoryItemId && li.quantity > li.maxStock;
                      return (
                        <TableRow
                          key={li.id}
                          className={stockWarn ? "bg-destructive/5" : ""}
                        >
                          <TableCell>
                            <div className="space-y-1">
                              <Popover
                                open={!!comboOpenMap[li.id]}
                                onOpenChange={(open) =>
                                  setComboOpen(li.id, open)
                                }
                              >
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    aria-haspopup="listbox"
                                    aria-expanded={!!comboOpenMap[li.id]}
                                    className="h-8 w-full text-sm justify-between font-normal"
                                    data-ocid={`sales.line_item.select.${idx + 1}`}
                                  >
                                    <span className="truncate">
                                      {li.inventoryItemId
                                        ? (inventory.find(
                                            (i) => i.id === li.inventoryItemId,
                                          )?.name ?? "Select item...")
                                        : "Select item..."}
                                    </span>
                                    <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-80 p-0"
                                  align="start"
                                >
                                  <Command>
                                    <CommandInput
                                      placeholder="Search item..."
                                      className="h-8"
                                      data-ocid={`sales.line_item.search_input.${idx + 1}`}
                                    />
                                    <CommandList>
                                      <CommandEmpty>
                                        No items found.
                                      </CommandEmpty>
                                      <CommandGroup>
                                        {inventory
                                          .filter((i) => i.quantity > 0)
                                          .map((i) => (
                                            <CommandItem
                                              key={i.id}
                                              value={`${i.name} ${i.sku ?? ""}`}
                                              onSelect={() => {
                                                handleInventorySelect(
                                                  li.id,
                                                  i.id,
                                                );
                                                setComboOpen(li.id, false);
                                              }}
                                            >
                                              <div className="flex flex-col w-full">
                                                <span className="font-medium text-sm">
                                                  {i.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                  Stock: {i.quantity} | ₹
                                                  {i.sellingPrice.toFixed(2)}
                                                </span>
                                              </div>
                                            </CommandItem>
                                          ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              {stockWarn && (
                                <p className="text-xs text-destructive">
                                  Only {li.maxStock} in stock
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              max={li.maxStock}
                              value={li.quantity}
                              onChange={(e) =>
                                handleLineItemChange(
                                  li.id,
                                  "quantity",
                                  Number(e.target.value),
                                )
                              }
                              className="h-8 text-sm w-20"
                              data-ocid={`sales.line_item.qty.input.${idx + 1}`}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={li.unitPrice}
                              onChange={(e) =>
                                handleLineItemChange(
                                  li.id,
                                  "unitPrice",
                                  Number(e.target.value),
                                )
                              }
                              className="h-8 text-sm w-32"
                              data-ocid={`sales.line_item.price.input.${idx + 1}`}
                            />
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">
                            ₹{(li.quantity * li.unitPrice).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => handleRemoveLineItem(li.id)}
                              disabled={form.lineItems.length === 1}
                              data-ocid={`sales.line_item.delete_button.${idx + 1}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Total */}
            <div className="border border-border rounded-lg p-4 bg-muted/30">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span className="font-mono text-primary">
                  ₹{calcTotal(form.lineItems).toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                No tax applied
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="sales.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              data-ocid="sales.submit_button"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Invoice"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
      >
        <DialogContent className="sm:max-w-sm" data-ocid="sales.delete.dialog">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this invoice?
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmId(null)}
              data-ocid="sales.delete.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmId) {
                  deleteInvoice(deleteConfirmId);
                  setDeleteConfirmId(null);
                  toast.success("Invoice deleted");
                }
              }}
              data-ocid="sales.delete.confirm_button"
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Hidden invoice render area for PDF export */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: -9999,
          pointerEvents: "none",
          opacity: printInvoice ? 1 : 0,
          width: 794,
        }}
      >
        <div ref={invoicePrintRef}>
          {printInvoice && <InvoicePrintTemplate invoice={printInvoice} />}
        </div>
      </div>
    </div>
  );
}
