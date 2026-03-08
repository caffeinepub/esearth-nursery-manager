import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Lightbulb, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useExpenditures } from "../hooks/useExpenditures";
import { useInventory } from "../hooks/useInventory";
import { useSales } from "../hooks/useSales";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const fmt = (v: number) => `₹${v.toFixed(0)}`;

export default function BusinessAnalytics() {
  const { invoices } = useSales();
  const { items: inventory } = useInventory();
  const { expenditures } = useExpenditures();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const yearNum = Number(year);

  const years = Array.from(
    new Set([
      currentYear - 1,
      currentYear,
      ...invoices.map((i) => new Date(i.date).getFullYear()),
      ...expenditures.map((e) => new Date(e.date).getFullYear()),
    ]),
  ).sort((a, b) => b - a);

  // ── Monthly data ──────────────────────────────────────────────────────────
  const monthlyData = useMemo(() => {
    return MONTHS_SHORT.map((month, idx) => {
      const monthInvoices = invoices.filter((inv) => {
        const d = new Date(inv.date);
        return d.getMonth() === idx && d.getFullYear() === yearNum;
      });
      const revenue = monthInvoices.reduce(
        (sum, inv) =>
          sum + inv.lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
        0,
      );
      const cogs = monthInvoices.reduce(
        (sum, inv) =>
          sum +
          inv.lineItems.reduce(
            (s, l) => s + (l.costPrice ?? 0) * l.quantity,
            0,
          ),
        0,
      );
      const expenses = expenditures
        .filter((e) => {
          const d = new Date(e.date);
          return d.getMonth() === idx && d.getFullYear() === yearNum;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        month,
        Revenue: Number(revenue.toFixed(2)),
        COGS: Number(cogs.toFixed(2)),
        Expenditure: Number(expenses.toFixed(2)),
        Profit: Number((revenue - cogs - expenses).toFixed(2)),
        salesCount: monthInvoices.length,
      };
    });
  }, [invoices, expenditures, yearNum]);

  // ── Summary totals ────────────────────────────────────────────────────────
  const totalRevenue = monthlyData.reduce((s, d) => s + d.Revenue, 0);
  const totalCOGS = monthlyData.reduce((s, d) => s + d.COGS, 0);
  const totalExpenses = monthlyData.reduce((s, d) => s + d.Expenditure, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;
  const grossMarginPct =
    totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // ── Margin Analysis per item ──────────────────────────────────────────────
  const marginData = useMemo(() => {
    // Build sold data per inventory item
    const soldMap = new Map<
      string,
      { qtySold: number; revenue: number; cogs: number }
    >();

    for (const inv of invoices.filter(
      (i) => new Date(i.date).getFullYear() === yearNum,
    )) {
      for (const li of inv.lineItems) {
        const key = li.inventoryItemId || li.name;
        const existing = soldMap.get(key) ?? {
          qtySold: 0,
          revenue: 0,
          cogs: 0,
        };
        soldMap.set(key, {
          qtySold: existing.qtySold + li.quantity,
          revenue: existing.revenue + li.quantity * li.unitPrice,
          cogs: existing.cogs + (li.costPrice ?? 0) * li.quantity,
        });
      }
    }

    return inventory
      .map((item) => {
        const sold = soldMap.get(item.id) ?? {
          qtySold: 0,
          revenue: 0,
          cogs: 0,
        };
        const margin =
          item.costPrice > 0
            ? ((item.sellingPrice - item.costPrice) / item.costPrice) * 100
            : 0;
        return {
          id: item.id,
          name: item.name,
          costPrice: item.costPrice,
          sellingPrice: item.sellingPrice,
          margin,
          totalSold: sold.qtySold,
          cogs: sold.cogs,
          revenue: sold.revenue,
          profit: sold.revenue - sold.cogs,
        };
      })
      .sort((a, b) => b.margin - a.margin);
  }, [inventory, invoices, yearNum]);

  // ── Sales Trend peak/poor detection ──────────────────────────────────────
  const peakMonth = useMemo(() => {
    const best = monthlyData.reduce(
      (prev, curr) => (curr.Revenue > prev.Revenue ? curr : prev),
      monthlyData[0] ?? { month: "", Revenue: 0 },
    );
    return best.Revenue > 0 ? best.month : null;
  }, [monthlyData]);

  const poorMonth = useMemo(() => {
    const nonZeroMonths = monthlyData.filter((m) => m.Revenue > 0);
    if (nonZeroMonths.length === 0) return null;
    const worst = nonZeroMonths.reduce((prev, curr) =>
      curr.Revenue < prev.Revenue ? curr : prev,
    );
    return worst.month;
  }, [monthlyData]);

  // ── Rule-based AI Suggestions ─────────────────────────────────────────────
  const suggestions = useMemo(() => {
    const tips: {
      id: string;
      text: string;
      type: "warn" | "info" | "danger";
    }[] = [];
    const now = new Date();
    const last30 = new Date(now);
    last30.setDate(now.getDate() - 30);
    const last30Str = last30.toISOString().split("T")[0];

    // Items sold in last 30 days
    const recentSold = new Set<string>();
    for (const inv of invoices.filter((i) => i.date >= last30Str)) {
      for (const li of inv.lineItems) {
        if (li.inventoryItemId) recentSold.add(li.inventoryItemId);
      }
    }

    // Items with no recent sales
    for (const item of inventory) {
      if (!recentSold.has(item.id)) {
        tips.push({
          id: `no-sales-${item.id}`,
          text: `📢 Consider promoting "${item.name}" — no sales in the last 30 days.`,
          type: "info",
        });
      }
    }

    // Low margin items
    for (const item of marginData.filter((m) => m.margin < 15)) {
      tips.push({
        id: `low-margin-${item.id}`,
        text: `⚠ Low margin on "${item.name}" (${item.margin.toFixed(0)}%) — review pricing.`,
        type: "warn",
      });
    }

    // Average stock calculation
    const avgStock =
      inventory.length > 0
        ? inventory.reduce((s, i) => s + i.quantity, 0) / inventory.length
        : 0;

    // Overstocked items
    for (const item of inventory.filter((i) => i.quantity > avgStock * 3)) {
      tips.push({
        id: `overstock-${item.id}`,
        text: `📦 Overstocked: "${item.name}" (${item.quantity} units). Consider running a promotion.`,
        type: "warn",
      });
    }

    // Low stock items
    for (const item of inventory.filter(
      (i) => i.quantity < 5 && i.quantity > 0,
    )) {
      tips.push({
        id: `lowstock-${item.id}`,
        text: `🔴 Restock soon: "${item.name}" — only ${item.quantity} remaining.`,
        type: "danger",
      });
    }

    // Out of stock
    for (const item of inventory.filter((i) => i.quantity === 0)) {
      tips.push({
        id: `outofstock-${item.id}`,
        text: `❌ "${item.name}" is out of stock — reorder immediately.`,
        type: "danger",
      });
    }

    // Peak season
    if (peakMonth) {
      tips.push({
        id: `peak-${peakMonth}`,
        text: `📈 Peak sales month: ${peakMonth}. Stock up before this period next year.`,
        type: "info",
      });
    }

    // Net profit negative
    if (netProfit < 0 && totalRevenue > 0) {
      tips.push({
        id: "net-profit-negative",
        text: `⚠ Expenses are exceeding revenue (Net: ₹${netProfit.toFixed(2)}) — review cost structure.`,
        type: "danger",
      });
    }

    return tips.slice(0, 10);
  }, [inventory, invoices, marginData, peakMonth, netProfit, totalRevenue]);

  const getMarginBadge = (margin: number) => {
    if (margin >= 40) {
      return (
        <Badge className="text-xs bg-success/15 text-success border-0">
          High Margin
        </Badge>
      );
    }
    if (margin < 20) {
      return (
        <Badge className="text-xs bg-destructive/15 text-destructive border-0">
          Low Margin
        </Badge>
      );
    }
    return (
      <Badge className="text-xs bg-warning/20 text-warning-foreground border-0">
        Average
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Business Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Advanced performance analysis
          </p>
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32" data-ocid="analytics.year.select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Profit Summary Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            label: "Total Revenue",
            value: totalRevenue,
            color: "text-primary",
            icon: <TrendingUp className="w-4 h-4" />,
          },
          {
            label: "Total COGS",
            value: totalCOGS,
            color: "text-destructive",
            icon: <TrendingDown className="w-4 h-4" />,
          },
          {
            label: "Gross Profit",
            value: grossProfit,
            color: grossProfit >= 0 ? "text-success" : "text-destructive",
            icon: null,
          },
          {
            label: "Net Profit",
            value: netProfit,
            color: netProfit >= 0 ? "text-success" : "text-destructive",
            icon: null,
          },
          {
            label: "Gross Margin",
            value: null,
            color: grossMarginPct >= 30 ? "text-success" : "text-destructive",
            icon: null,
            customValue: `${grossMarginPct.toFixed(1)}%`,
          },
        ].map((card) => (
          <Card key={card.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-1 mb-2">
                {card.icon && <span className={card.color}>{card.icon}</span>}
                <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">
                  {card.label}
                </p>
              </div>
              <p className={`text-lg font-display font-bold ${card.color}`}>
                {card.customValue ?? `₹${(card.value ?? 0).toFixed(2)}`}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{year}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Revenue vs Cost Chart ─────────────────────────────────────────── */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Revenue vs COGS vs Expenditure — {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={monthlyData}
              margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.88 0.025 140)"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "oklch(0.45 0.04 145)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "oklch(0.45 0.04 145)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmt}
                width={64}
              />
              <Tooltip
                formatter={(value: number) => [
                  `₹${value.toFixed(2)}`,
                  undefined,
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid oklch(0.88 0.025 140)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
              <Bar
                dataKey="Revenue"
                fill="oklch(0.55 0.18 145)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="COGS"
                fill="oklch(0.577 0.245 27)"
                radius={[3, 3, 0, 0]}
              />
              <Bar
                dataKey="Expenditure"
                fill="oklch(0.65 0.16 85)"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Sales Trend Line Chart ────────────────────────────────────────── */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold">
              Sales Volume Trend — {year}
            </CardTitle>
            <div className="flex gap-2 text-xs text-muted-foreground">
              {peakMonth && (
                <Badge className="bg-success/15 text-success border-0">
                  Peak: {peakMonth}
                </Badge>
              )}
              {poorMonth && poorMonth !== peakMonth && (
                <Badge className="bg-destructive/15 text-destructive border-0">
                  Slowest: {poorMonth}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={monthlyData}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.88 0.025 140)"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "oklch(0.45 0.04 145)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "oklch(0.45 0.04 145)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={fmt}
                width={64}
              />
              <Tooltip
                formatter={(value: number) => [
                  `₹${value.toFixed(2)}`,
                  "Revenue",
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid oklch(0.88 0.025 140)",
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="Revenue"
                stroke="oklch(0.55 0.18 145)"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ── Margin Analysis Table ─────────────────────────────────────────── */}
      <Card className="border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Margin Analysis — All Inventory Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-lg overflow-hidden">
            <Table data-ocid="analytics.margin.table">
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">
                    Cost ₹
                  </TableHead>
                  <TableHead className="text-right">Sell ₹</TableHead>
                  <TableHead className="text-right">Margin %</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead className="text-right hidden md:table-cell">
                    Sold (yr)
                  </TableHead>
                  <TableHead className="text-right hidden md:table-cell">
                    Revenue ₹
                  </TableHead>
                  <TableHead className="text-right hidden lg:table-cell">
                    Profit ₹
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marginData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-10 text-muted-foreground"
                      data-ocid="analytics.margin.empty_state"
                    >
                      No inventory items
                    </TableCell>
                  </TableRow>
                ) : (
                  marginData.map((item, idx) => (
                    <TableRow
                      key={item.id}
                      data-ocid={`analytics.margin.item.${idx + 1}`}
                    >
                      <TableCell className="font-medium text-sm">
                        {item.name}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm hidden sm:table-cell">
                        ₹{item.costPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        ₹{item.sellingPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {item.margin.toFixed(1)}%
                      </TableCell>
                      <TableCell>{getMarginBadge(item.margin)}</TableCell>
                      <TableCell className="text-right font-mono text-sm hidden md:table-cell">
                        {item.totalSold}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-primary hidden md:table-cell">
                        ₹{item.revenue.toFixed(2)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-mono text-sm font-semibold hidden lg:table-cell ${
                          item.profit >= 0 ? "text-success" : "text-destructive"
                        }`}
                      >
                        ₹{item.profit.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── AI Suggestions Panel ─────────────────────────────────────────── */}
      <Card className="border-border bg-primary/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
            <Lightbulb className="w-4 h-4" />
            Smart Business Suggestions
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Rule-based insights based on your sales, inventory, and spending
            patterns.
          </p>
        </CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <div
              className="text-center py-6 text-muted-foreground text-sm"
              data-ocid="analytics.suggestions.empty_state"
            >
              Add inventory and sales data to get smart suggestions.
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map((tip, idx) => (
                <div
                  key={tip.id}
                  data-ocid={`analytics.suggestions.item.${idx + 1}`}
                  className={`flex items-start gap-3 p-3 rounded-lg text-sm ${
                    tip.type === "danger"
                      ? "bg-destructive/10 text-destructive"
                      : tip.type === "warn"
                        ? "bg-warning/15 text-warning-foreground"
                        : "bg-primary/10 text-primary"
                  }`}
                >
                  {tip.text}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
