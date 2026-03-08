import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileSpreadsheet, FileText } from "lucide-react";
import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useSales } from "../hooks/useSales";

const paymentColors: Record<string, string> = {
  Cash: "bg-success/15 text-success border-0",
  UPI: "bg-primary/15 text-primary border-0",
  Card: "bg-chart-3/15 text-chart-3 border-0",
};

export default function Reports() {
  const { invoices } = useSales();

  const today = new Date().toISOString().split("T")[0];
  const [dailyDate, setDailyDate] = useState(today);
  const [rangeFrom, setRangeFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [rangeTo, setRangeTo] = useState(today);

  // ── Stock-wise Sales ──────────────────────────────────────────────────────
  const stockwiseData = useMemo(() => {
    const map = new Map<
      string,
      { name: string; qtySold: number; revenue: number; cogs: number }
    >();

    for (const inv of invoices) {
      for (const li of inv.lineItems) {
        const key = li.inventoryItemId || li.name;
        const existing = map.get(key) ?? {
          name: li.name,
          qtySold: 0,
          revenue: 0,
          cogs: 0,
        };
        map.set(key, {
          name: li.name,
          qtySold: existing.qtySold + li.quantity,
          revenue: existing.revenue + li.quantity * li.unitPrice,
          cogs: existing.cogs + (li.costPrice ?? 0) * li.quantity,
        });
      }
    }

    return Array.from(map.values())
      .map((row) => ({
        ...row,
        profit: row.revenue - row.cogs,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [invoices]);

  // ── Daily Sales ───────────────────────────────────────────────────────────
  const dailyData = useMemo(
    () => invoices.filter((inv) => inv.date === dailyDate),
    [invoices, dailyDate],
  );

  const dailyTotal = dailyData.reduce(
    (sum, inv) =>
      sum + inv.lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
    0,
  );

  // ── Date Range Sales ──────────────────────────────────────────────────────
  const rangeData = useMemo(
    () =>
      invoices.filter((inv) => inv.date >= rangeFrom && inv.date <= rangeTo),
    [invoices, rangeFrom, rangeTo],
  );

  const rangeTotal = rangeData.reduce(
    (sum, inv) =>
      sum + inv.lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
    0,
  );

  const rangeCOGS = rangeData.reduce(
    (sum, inv) =>
      sum +
      inv.lineItems.reduce((s, l) => s + (l.costPrice ?? 0) * l.quantity, 0),
    0,
  );

  // ── Excel Export ──────────────────────────────────────────────────────────
  const exportStockwiseXLSX = () => {
    const ws = XLSX.utils.json_to_sheet(
      stockwiseData.map((row) => ({
        "Item Name": row.name,
        "Qty Sold": row.qtySold,
        "Revenue (₹)": row.revenue.toFixed(2),
        "COGS (₹)": row.cogs.toFixed(2),
        "Profit (₹)": row.profit.toFixed(2),
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stock-wise Sales");
    XLSX.writeFile(wb, "stockwise-sales.xlsx");
  };

  const exportDailyXLSX = () => {
    const rows = dailyData.flatMap((inv) => {
      const invTotal = inv.lineItems.reduce(
        (s, l) => s + l.quantity * l.unitPrice,
        0,
      );
      return [
        {
          "Invoice #": inv.invoiceNumber,
          Date: inv.date,
          Customer: inv.customerName,
          Items: inv.lineItems
            .map((l) => `${l.name} x${l.quantity}`)
            .join(", "),
          "Total (₹)": invTotal.toFixed(2),
          Payment: inv.paymentMethod,
          Status: inv.paid ? "Paid" : "Unpaid",
        },
      ];
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Daily Sales ${dailyDate}`);
    XLSX.writeFile(wb, `daily-sales-${dailyDate}.xlsx`);
  };

  const exportRangeXLSX = () => {
    const rows = rangeData.map((inv) => {
      const invTotal = inv.lineItems.reduce(
        (s, l) => s + l.quantity * l.unitPrice,
        0,
      );
      return {
        "Invoice #": inv.invoiceNumber,
        Date: inv.date,
        Customer: inv.customerName,
        "Items Count": inv.lineItems.length,
        "Total (₹)": invTotal.toFixed(2),
        Payment: inv.paymentMethod,
        Status: inv.paid ? "Paid" : "Unpaid",
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Sales ${rangeFrom} to ${rangeTo}`);
    XLSX.writeFile(wb, `sales-report-${rangeFrom}-to-${rangeTo}.xlsx`);
  };

  // ── Print PDF ─────────────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Reports
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Sales reports and data exports
        </p>
      </div>

      <Tabs defaultValue="stockwise">
        <TabsList data-ocid="reports.tab">
          <TabsTrigger value="stockwise">Stock-wise Sales</TabsTrigger>
          <TabsTrigger value="daily">Daily Sales</TabsTrigger>
          <TabsTrigger value="range">Date Range</TabsTrigger>
        </TabsList>

        {/* ── Stock-wise Sales ───────────────────────────────────────────── */}
        <TabsContent value="stockwise" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              All-time sales performance by inventory item
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportStockwiseXLSX}
                data-ocid="reports.stockwise.excel.button"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                data-ocid="reports.stockwise.pdf.button"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                PDF
              </Button>
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Total Revenue
                </p>
                <p className="text-xl font-display font-bold text-primary">
                  ₹{stockwiseData.reduce((s, r) => s + r.revenue, 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Total COGS
                </p>
                <p className="text-xl font-display font-bold text-destructive">
                  ₹{stockwiseData.reduce((s, r) => s + r.cogs, 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Total Profit
                </p>
                <p className="text-xl font-display font-bold text-success">
                  ₹{stockwiseData.reduce((s, r) => s + r.profit, 0).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <Table data-ocid="reports.stockwise.table">
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead className="text-right">Qty Sold</TableHead>
                  <TableHead className="text-right">Revenue ₹</TableHead>
                  <TableHead className="text-right">COGS ₹</TableHead>
                  <TableHead className="text-right">Profit ₹</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockwiseData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-10 text-muted-foreground"
                      data-ocid="reports.stockwise.empty_state"
                    >
                      No sales data yet
                    </TableCell>
                  </TableRow>
                ) : (
                  stockwiseData.map((row, idx) => (
                    <TableRow
                      key={row.name}
                      data-ocid={`reports.stockwise.item.${idx + 1}`}
                    >
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {row.qtySold}
                      </TableCell>
                      <TableCell className="text-right font-mono text-primary">
                        ₹{row.revenue.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-destructive">
                        ₹{row.cogs.toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono font-semibold ${
                          row.profit >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        ₹{row.profit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Daily Sales ────────────────────────────────────────────────── */}
        <TabsContent value="daily" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Label className="text-sm">Date:</Label>
              <Input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="w-44"
                data-ocid="reports.daily.date.input"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportDailyXLSX}
                data-ocid="reports.daily.excel.button"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                data-ocid="reports.daily.pdf.button"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                PDF
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Total for {dailyDate}
                </p>
                <p className="text-2xl font-display font-bold text-primary">
                  ₹{dailyTotal.toFixed(2)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {dailyData.length} invoice{dailyData.length !== 1 ? "s" : ""}
              </p>
            </CardContent>
          </Card>

          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <Table data-ocid="reports.daily.table">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Items</TableHead>
                  <TableHead className="text-right">Total ₹</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dailyData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-10 text-muted-foreground"
                      data-ocid="reports.daily.empty_state"
                    >
                      No sales on {dailyDate}
                    </TableCell>
                  </TableRow>
                ) : (
                  dailyData.map((inv, idx) => {
                    const total = inv.lineItems.reduce(
                      (s, l) => s + l.quantity * l.unitPrice,
                      0,
                    );
                    return (
                      <TableRow
                        key={inv.id}
                        data-ocid={`reports.daily.item.${idx + 1}`}
                      >
                        <TableCell className="font-mono text-sm font-semibold text-primary">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">
                            {inv.customerName}
                          </p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {inv.lineItems
                            .map((l) => `${l.name} ×${l.quantity}`)
                            .join(", ")}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          ₹{total.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${paymentColors[inv.paymentMethod] ?? ""}`}
                          >
                            {inv.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${
                              inv.paid
                                ? "bg-success/15 text-success border-0"
                                : "bg-warning/20 text-warning-foreground border-0"
                            }`}
                          >
                            {inv.paid ? "Paid" : "Unpaid"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Date Range ─────────────────────────────────────────────────── */}
        <TabsContent value="range" className="space-y-4 mt-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-sm">From:</Label>
                <Input
                  type="date"
                  value={rangeFrom}
                  onChange={(e) => setRangeFrom(e.target.value)}
                  className="w-40"
                  data-ocid="reports.range.from.input"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm">To:</Label>
                <Input
                  type="date"
                  value={rangeTo}
                  onChange={(e) => setRangeTo(e.target.value)}
                  className="w-40"
                  data-ocid="reports.range.to.input"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportRangeXLSX}
                data-ocid="reports.range.excel.button"
              >
                <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                data-ocid="reports.range.pdf.button"
              >
                <FileText className="w-4 h-4 mr-1.5" />
                PDF
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Revenue
                </p>
                <p className="text-xl font-display font-bold text-primary">
                  ₹{rangeTotal.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  COGS
                </p>
                <p className="text-xl font-display font-bold text-destructive">
                  ₹{rangeCOGS.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Gross Profit
                </p>
                <p className="text-xl font-display font-bold text-success">
                  ₹{(rangeTotal - rangeCOGS).toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="border border-border rounded-xl overflow-hidden bg-card">
            <Table data-ocid="reports.range.table">
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Items</TableHead>
                  <TableHead className="text-right">Total ₹</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rangeData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-10 text-muted-foreground"
                      data-ocid="reports.range.empty_state"
                    >
                      No sales in this date range
                    </TableCell>
                  </TableRow>
                ) : (
                  rangeData.map((inv, idx) => {
                    const total = inv.lineItems.reduce(
                      (s, l) => s + l.quantity * l.unitPrice,
                      0,
                    );
                    return (
                      <TableRow
                        key={inv.id}
                        data-ocid={`reports.range.item.${idx + 1}`}
                      >
                        <TableCell className="font-mono text-sm font-semibold text-primary">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell className="text-sm">{inv.date}</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">
                            {inv.customerName}
                          </p>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {inv.lineItems.length} item
                          {inv.lineItems.length !== 1 ? "s" : ""}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          ₹{total.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${paymentColors[inv.paymentMethod] ?? ""}`}
                          >
                            {inv.paymentMethod}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`text-xs ${
                              inv.paid
                                ? "bg-success/15 text-success border-0"
                                : "bg-warning/20 text-warning-foreground border-0"
                            }`}
                          >
                            {inv.paid ? "Paid" : "Unpaid"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
