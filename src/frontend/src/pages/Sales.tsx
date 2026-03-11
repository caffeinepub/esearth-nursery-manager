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
  Download,
  Loader2,
  Plus,
  Printer,
  Receipt,
  Trash2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
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

export default function Sales() {
  const { role } = usePinRole();
  const { invoices, addInvoice, deleteInvoice, togglePaid } = useSales();
  const { items: inventory } = useInventory();
  const { getNextNumber } = useGetNextInvoiceNumber();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<InvoiceFormData>(emptyForm());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
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

  const buildThermalInvoiceHtml = (invoice: Invoice): string => {
    const total = invoice.lineItems.reduce(
      (s, l) => s + l.quantity * l.unitPrice,
      0,
    );

    const itemRows = invoice.lineItems
      .map((li) => {
        const amount = (li.quantity * li.unitPrice).toFixed(2);
        return `
      <tr>
        <td class="item-name">${li.name}</td>
        <td class="item-qty">${li.quantity}</td>
        <td class="item-rate">&#8377;${li.unitPrice.toFixed(2)}</td>
        <td class="item-amt">&#8377;${amount}</td>
      </tr>`;
      })
      .join("");

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 0;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      width: 80mm;
      font-family: 'Courier New', Courier, monospace;
      font-size: 11pt;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .wrap {
      width: 80mm;
      padding: 4mm 4mm 6mm 4mm;
    }
    .center { text-align: center; }
    .header { text-align: center; margin-bottom: 4mm; }
    .header h1 {
      font-size: 13pt;
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-bottom: 1mm;
    }
    .header p { font-size: 9pt; line-height: 1.5; }
    .divider-solid { border-top: 1px solid #000; margin: 2mm 0; }
    .divider-dashed { border-top: 1px dashed #000; margin: 2mm 0; }
    .invoice-title {
      text-align: center;
      font-size: 12pt;
      font-weight: 700;
      letter-spacing: 2px;
      margin: 2mm 0;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 9.5pt;
      margin-bottom: 1mm;
    }
    .meta-label { font-weight: 700; }
    .customer-block { font-size: 9.5pt; margin: 2mm 0; }
    .customer-block .lbl { font-weight: 700; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 2mm 0;
    }
    thead tr th {
      font-size: 9pt;
      font-weight: 700;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
      padding: 1mm 0.5mm;
    }
    th.item-name { text-align: left; width: 42%; }
    th.item-qty { text-align: center; width: 10%; }
    th.item-rate { text-align: right; width: 22%; }
    th.item-amt { text-align: right; width: 26%; }
    tbody tr td {
      font-size: 9.5pt;
      padding: 1.5mm 0.5mm;
      vertical-align: top;
      border-bottom: 1px dotted #aaa;
    }
    td.item-name { text-align: left; word-break: break-word; }
    td.item-qty { text-align: center; }
    td.item-rate { text-align: right; }
    td.item-amt { text-align: right; font-weight: 700; }
    .total-section { margin: 2mm 0; }
    .total-line {
      display: flex;
      justify-content: space-between;
      font-size: 11pt;
      font-weight: 900;
      padding: 1.5mm 0;
    }
    .payment-line {
      display: flex;
      justify-content: space-between;
      font-size: 9.5pt;
      margin-top: 1mm;
    }
    .footer {
      text-align: center;
      margin-top: 3mm;
    }
    .footer .decl {
      font-size: 8pt;
      line-height: 1.5;
      margin-bottom: 2mm;
    }
    .footer .thanks {
      font-size: 10pt;
      font-weight: 900;
      margin: 2mm 0 0.5mm;
    }
    .footer .visit { font-size: 9pt; margin-bottom: 2mm; }
    .footer .tamil { font-size: 9pt; line-height: 1.7; }
  </style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <h1>ESEARTH NURSERY</h1>
    <h1>GARDEN</h1>
    <p>Near Jio Petrol Bunk, Salem Highway</p>
    <p>Papinaickenpatti, Namakkal - 637003</p>
    <p>Ph: 7695887203 / 9443551796</p>
  </div>

  <div class="divider-solid"></div>
  <div class="invoice-title">INVOICE</div>
  <div class="divider-solid"></div>

  <div class="meta-row">
    <span><span class="meta-label">INV#:</span> ${invoice.invoiceNumber}</span>
    <span><span class="meta-label">Date:</span> ${invoice.date}</span>
  </div>
  <div class="meta-row">
    <span><span class="meta-label">Payment:</span> ${invoice.paymentMethod}</span>
  </div>

  <div class="divider-dashed"></div>

  <div class="customer-block">
    <span class="lbl">Bill To: </span>${invoice.customerName}${invoice.customerPhone ? `<br/><span class="lbl">Phone: </span>${invoice.customerPhone}` : ""}
  </div>

  ${invoice.notes ? `<div class="customer-block"><span class="lbl">Note: </span>${invoice.notes}</div>` : ""}

  <div class="divider-dashed"></div>

  <table>
    <thead>
      <tr>
        <th class="item-name">Item</th>
        <th class="item-qty">Qty</th>
        <th class="item-rate">Rate</th>
        <th class="item-amt">Amt</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="divider-solid"></div>

  <div class="total-section">
    <div class="total-line">
      <span>TOTAL</span>
      <span>&#8377;${total.toFixed(2)}</span>
    </div>
    <div class="payment-line">
      <span>Payment Method</span>
      <span>${invoice.paymentMethod}</span>
    </div>
  </div>

  <div class="divider-dashed"></div>

  <div class="footer">
    <p class="decl">We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</p>
    <div class="divider-dashed"></div>
    <p class="thanks">THANK YOU FOR SHOPPING WITH US</p>
    <p class="visit">VISIT AGAIN - HAVE A NICE DAY</p>
    <p class="tamil">உழுதுண்டு வாழ்வாரே வாழ்வார்மற் றெல்லாம்<br/>தொழுதுண்டு பின்செல் பவர்.</p>
  </div>
</div>
</body>
</html>`;
  };

  const handlePrint = (invoice: Invoice) => {
    const htmlContent = buildThermalInvoiceHtml(invoice);
    const printWindow = window.open("", "_blank", "width=400,height=700");
    if (!printWindow) {
      toast.error(
        "Popup blocked. Please allow popups for this site and try again.",
      );
      return;
    }
    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    const htmlContent = buildThermalInvoiceHtml(invoice);
    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, "_blank", "width=400,height=700");
    if (!printWindow) {
      toast.error(
        "Popup blocked. Please allow popups for this site and try again.",
      );
      URL.revokeObjectURL(url);
      return;
    }
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    };
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
                          title="Print Invoice"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownloadPDF(inv)}
                          data-ocid={`sales.download_pdf.button.${idx + 1}`}
                          title="Download Invoice PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
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
    </div>
  );
}
