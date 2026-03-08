import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useExpenditures } from "../hooks/useExpenditures";
import { useSales } from "../hooks/useSales";

const MONTHS = [
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

export default function ProfitAnalysis() {
  const { invoices } = useSales();
  const { expenditures } = useExpenditures();
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));

  const yearNum = Number(year);

  const monthlyData = useMemo(() => {
    return MONTHS.map((month, idx) => {
      const revenue = invoices
        .filter((inv) => {
          const d = new Date(inv.date);
          return (
            inv.paid && d.getMonth() === idx && d.getFullYear() === yearNum
          );
        })
        .reduce((sum, inv) => {
          const sub = inv.lineItems.reduce(
            (s, l) => s + l.quantity * l.unitPrice,
            0,
          );
          return sum + sub;
        }, 0);

      const expenses = expenditures
        .filter((e) => {
          const d = new Date(e.date);
          return d.getMonth() === idx && d.getFullYear() === yearNum;
        })
        .reduce((sum, e) => sum + e.amount, 0);

      return {
        month,
        Revenue: Number(revenue.toFixed(2)),
        Expenses: Number(expenses.toFixed(2)),
        Profit: Number((revenue - expenses).toFixed(2)),
      };
    });
  }, [invoices, expenditures, yearNum]);

  const totalRevenue = monthlyData.reduce((s, d) => s + d.Revenue, 0);
  const totalExpenses = monthlyData.reduce((s, d) => s + d.Expenses, 0);
  const netProfit = totalRevenue - totalExpenses;

  const years = Array.from(
    new Set([
      currentYear - 1,
      currentYear,
      ...invoices.map((i) => new Date(i.date).getFullYear()),
      ...expenditures.map((e) => new Date(e.date).getFullYear()),
    ]),
  ).sort((a, b) => b - a);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Profit Analysis
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Financial overview
          </p>
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32" data-ocid="profit.year.select">
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-success" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display font-bold text-success">
              ${totalRevenue.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Paid invoices — {year}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-destructive" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-display font-bold text-destructive">
              ${totalExpenses.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All categories — {year}
            </p>
          </CardContent>
        </Card>

        <Card
          className={`border-border ${
            netProfit >= 0
              ? "bg-success/5 border-success/20"
              : "bg-destructive/5 border-destructive/20"
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <DollarSign
                className={`w-4 h-4 ${netProfit >= 0 ? "text-success" : "text-destructive"}`}
              />
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-display font-bold ${
                netProfit >= 0 ? "text-success" : "text-destructive"
              }`}
            >
              {netProfit >= 0 ? "+" : ""}${netProfit.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {netProfit >= 0 ? "Profitable year 🌱" : "Net loss this year"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Monthly Revenue vs Expenses — {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={monthlyData}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.88 0.025 140)"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "oklch(0.45 0.04 145)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "oklch(0.45 0.04 145)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${v}`}
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
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Expenses"
                fill="oklch(0.577 0.245 27.325)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Profit line chart */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            Monthly Net Profit — {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={monthlyData}
              margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="oklch(0.88 0.025 140)"
              />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "oklch(0.45 0.04 145)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "oklch(0.45 0.04 145)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${v}`}
              />
              <Tooltip
                formatter={(value: number) => [
                  `₹${value.toFixed(2)}`,
                  "Net Profit",
                ]}
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid oklch(0.88 0.025 140)",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="Profit"
                fill="oklch(0.65 0.16 85)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
