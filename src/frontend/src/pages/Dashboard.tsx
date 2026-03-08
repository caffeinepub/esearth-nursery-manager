import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  BarChart3,
  CheckSquare,
  FileText,
  IndianRupee,
  ListTodo,
  Package,
  Receipt,
  Settings,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePinRole } from "../contexts/PinRoleContext";
import { useExpenditures } from "../hooks/useExpenditures";
import { useInventory } from "../hooks/useInventory";
import { usePriorityTasks } from "../hooks/usePriorityTasks";
import { useChecklistItems, useLowStockThreshold } from "../hooks/useQueries";
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

export default function Dashboard() {
  const { role } = usePinRole();
  const { items: inventory, totalInventoryValue } = useInventory();
  const { invoices } = useSales();
  const { tasks } = usePriorityTasks();
  const { expenditures } = useExpenditures();
  const { data: threshold = 10n } = useLowStockThreshold();
  const today = new Date().toISOString().split("T")[0];
  const { data: checklistItems = [] } = useChecklistItems(today);

  const [salesTab, setSalesTab] = useState("7days");
  const [profitTab, setProfitTab] = useState("monthly");

  const thresholdNum = Number(threshold);
  const lowStockItems = inventory.filter((i) => i.quantity <= thresholdNum);
  const lowStockCount = lowStockItems.length;
  const completedChecklist = checklistItems.filter((i) => i.completed).length;
  const totalChecklist = checklistItems.length;

  // Total revenue from all paid invoices
  const totalRevenue = useMemo(
    () =>
      invoices
        .filter((i) => i.paid)
        .reduce(
          (sum, inv) =>
            sum +
            inv.lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
          0,
        ),
    [invoices],
  );

  // Total COGS
  const totalCOGS = useMemo(
    () =>
      invoices
        .filter((i) => i.paid)
        .reduce(
          (sum, inv) =>
            sum +
            inv.lineItems.reduce((s, l) => s + l.costPrice * l.quantity, 0),
          0,
        ),
    [invoices],
  );

  const totalProfit = totalRevenue - totalCOGS;

  // Sales chart data
  const salesChartData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();

    if (salesTab === "7days") {
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().split("T")[0];
        const revenue = invoices
          .filter((inv) => inv.date === dateStr)
          .reduce(
            (sum, inv) =>
              sum +
              inv.lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
            0,
          );
        return {
          name: d.toLocaleDateString("en-IN", { weekday: "short" }),
          Revenue: Number(revenue.toFixed(2)),
        };
      });
    }

    if (salesTab === "monthly") {
      return MONTHS_SHORT.map((month, idx) => {
        const revenue = invoices
          .filter((inv) => {
            const d = new Date(inv.date);
            return d.getMonth() === idx && d.getFullYear() === year;
          })
          .reduce(
            (sum, inv) =>
              sum +
              inv.lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
            0,
          );
        return { name: month, Revenue: Number(revenue.toFixed(2)) };
      });
    }

    // yearly — last 5 years
    return Array.from({ length: 5 }, (_, i) => {
      const yr = year - 4 + i;
      const revenue = invoices
        .filter((inv) => new Date(inv.date).getFullYear() === yr)
        .reduce(
          (sum, inv) =>
            sum +
            inv.lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
          0,
        );
      return { name: String(yr), Revenue: Number(revenue.toFixed(2)) };
    });
  }, [invoices, salesTab]);

  // Profit chart data
  const profitChartData = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();

    if (profitTab === "weekly") {
      return Array.from({ length: 4 }, (_, i) => {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - i * 7);
        const weekStart = new Date(weekEnd);
        weekStart.setDate(weekEnd.getDate() - 6);
        const label = `W${4 - i}`;
        const startStr = weekStart.toISOString().split("T")[0];
        const endStr = weekEnd.toISOString().split("T")[0];

        const weekInvoices = invoices.filter(
          (inv) => inv.date >= startStr && inv.date <= endStr,
        );
        const rev = weekInvoices.reduce(
          (sum, inv) =>
            sum +
            inv.lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
          0,
        );
        const cogs = weekInvoices.reduce(
          (sum, inv) =>
            sum +
            inv.lineItems.reduce((s, l) => s + l.costPrice * l.quantity, 0),
          0,
        );
        return { name: label, Profit: Number((rev - cogs).toFixed(2)) };
      }).reverse();
    }

    if (profitTab === "monthly") {
      return MONTHS_SHORT.map((month, idx) => {
        const monthInvoices = invoices.filter((inv) => {
          const d = new Date(inv.date);
          return d.getMonth() === idx && d.getFullYear() === year;
        });
        const rev = monthInvoices.reduce(
          (sum, inv) =>
            sum +
            inv.lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
          0,
        );
        const cogs = monthInvoices.reduce(
          (sum, inv) =>
            sum +
            inv.lineItems.reduce((s, l) => s + l.costPrice * l.quantity, 0),
          0,
        );
        const expenses = expenditures
          .filter((e) => {
            const d = new Date(e.date);
            return d.getMonth() === idx && d.getFullYear() === year;
          })
          .reduce((sum, e) => sum + e.amount, 0);
        return {
          name: month,
          Profit: Number((rev - cogs - expenses).toFixed(2)),
        };
      });
    }

    // yearly
    return Array.from({ length: 5 }, (_, i) => {
      const yr = year - 4 + i;
      const yearInvoices = invoices.filter(
        (inv) => new Date(inv.date).getFullYear() === yr,
      );
      const rev = yearInvoices.reduce(
        (sum, inv) =>
          sum + inv.lineItems.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
        0,
      );
      const cogs = yearInvoices.reduce(
        (sum, inv) =>
          sum + inv.lineItems.reduce((s, l) => s + l.costPrice * l.quantity, 0),
        0,
      );
      const expYear = expenditures
        .filter((e) => new Date(e.date).getFullYear() === yr)
        .reduce((sum, e) => sum + e.amount, 0);
      return {
        name: String(yr),
        Profit: Number((rev - cogs - expYear).toFixed(2)),
      };
    });
  }, [invoices, expenditures, profitTab]);

  const quickLinks = [
    {
      label: "Inventory",
      path: "/inventory",
      icon: <Package className="w-6 h-6" />,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Sales",
      path: "/sales",
      icon: <Receipt className="w-6 h-6" />,
      color: "bg-chart-2/20 text-chart-2",
    },
    {
      label: "Priority Tasks",
      path: "/priority",
      icon: <ListTodo className="w-6 h-6" />,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Checklist",
      path: "/checklist",
      icon: <CheckSquare className="w-6 h-6" />,
      color: "bg-primary/10 text-primary",
    },
    ...(role === "owner"
      ? [
          {
            label: "Expenditures",
            path: "/expenditures",
            icon: <TrendingDown className="w-6 h-6" />,
            color: "bg-destructive/10 text-destructive",
          },
          {
            label: "Reports",
            path: "/reports",
            icon: <FileText className="w-6 h-6" />,
            color: "bg-chart-3/20 text-chart-3",
          },
          {
            label: "Analytics",
            path: "/analytics",
            icon: <BarChart3 className="w-6 h-6" />,
            color: "bg-primary/10 text-primary",
          },
          {
            label: "Settings",
            path: "/settings",
            icon: <Settings className="w-6 h-6" />,
            color: "bg-muted text-muted-foreground",
          },
        ]
      : []),
  ];

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.07 } },
  };
  const itemAnim = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Summary Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          {
            title: "Total Sales Revenue",
            value: `₹${totalRevenue.toFixed(2)}`,
            sub: `${invoices.filter((i) => i.paid).length} paid invoices`,
            icon: <IndianRupee className="w-5 h-5" />,
            color: "text-success",
            bg: "bg-success/10",
            alert: false,
          },
          {
            title: "Total Profit",
            value: `₹${totalProfit.toFixed(2)}`,
            sub: "Revenue minus COGS",
            icon: <TrendingUp className="w-5 h-5" />,
            color: totalProfit >= 0 ? "text-success" : "text-destructive",
            bg: totalProfit >= 0 ? "bg-success/10" : "bg-destructive/10",
            alert: false,
          },
          {
            title: "Inventory Value",
            value: `₹${totalInventoryValue.toFixed(2)}`,
            sub: `${inventory.length} items in stock`,
            icon: <Package className="w-5 h-5" />,
            color: "text-primary",
            bg: "bg-primary/10",
            alert: false,
          },
          {
            title: "Low Stock Alerts",
            value: lowStockCount,
            sub:
              lowStockCount > 0 ? "Items need restocking" : "All items stocked",
            icon: <AlertTriangle className="w-5 h-5" />,
            color: lowStockCount > 0 ? "text-destructive" : "text-success",
            bg: lowStockCount > 0 ? "bg-destructive/10" : "bg-success/10",
            alert: lowStockCount > 0,
          },
        ].map((stat) => (
          <motion.div key={stat.title} variants={itemAnim}>
            <Card className="border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center`}
                  >
                    <span className={stat.color}>{stat.icon}</span>
                  </div>
                  {stat.alert && (
                    <AlertTriangle className="w-4 h-4 text-destructive" />
                  )}
                </div>
                <p className="text-xl font-display font-bold text-foreground">
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {stat.title}
                </p>
                <p className="text-[11px] text-muted-foreground/70 mt-1 leading-tight">
                  {stat.sub}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Checklist progress quick card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-4"
      >
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Today's Checklist
                </p>
                <p className="text-xl font-display font-bold text-foreground">
                  {totalChecklist > 0
                    ? `${completedChecklist}/${totalChecklist}`
                    : "0 items"}
                </p>
              </div>
              <CheckSquare className="w-8 h-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Pending Tasks
                </p>
                <p className="text-xl font-display font-bold text-foreground">
                  {tasks.filter((t) => t.status === "Pending").length}
                </p>
              </div>
              <ListTodo className="w-8 h-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sales Analytics Chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold">
                Sales Analytics
              </CardTitle>
              <Tabs value={salesTab} onValueChange={setSalesTab}>
                <TabsList className="h-7">
                  <TabsTrigger value="7days" className="text-xs px-2 py-1">
                    Last 7 Days
                  </TabsTrigger>
                  <TabsTrigger value="monthly" className="text-xs px-2 py-1">
                    Monthly
                  </TabsTrigger>
                  <TabsTrigger value="yearly" className="text-xs px-2 py-1">
                    Yearly
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={salesChartData}
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="oklch(0.88 0.025 140)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "oklch(0.45 0.04 145)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "oklch(0.45 0.04 145)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={fmt}
                  width={60}
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
                <Bar
                  dataKey="Revenue"
                  fill="oklch(0.55 0.18 145)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Profit Analytics Chart (owner only) */}
      {role === "owner" && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-sm font-semibold">
                  Profit Analytics (Net Profit = Revenue − COGS − Expenses)
                </CardTitle>
                <Tabs value={profitTab} onValueChange={setProfitTab}>
                  <TabsList className="h-7">
                    <TabsTrigger value="weekly" className="text-xs px-2 py-1">
                      Weekly
                    </TabsTrigger>
                    <TabsTrigger value="monthly" className="text-xs px-2 py-1">
                      Monthly
                    </TabsTrigger>
                    <TabsTrigger value="yearly" className="text-xs px-2 py-1">
                      Yearly
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={profitChartData}
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.88 0.025 140)"
                  />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "oklch(0.45 0.04 145)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "oklch(0.45 0.04 145)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={fmt}
                    width={60}
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
                    radius={[4, 4, 0, 0]}
                    fill="oklch(0.65 0.16 85)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Quick nav */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Quick Access
        </h2>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-8 gap-3"
        >
          {quickLinks.map((link) => (
            <motion.div key={link.path} variants={itemAnim}>
              <Link
                to={link.path}
                data-ocid={`dashboard.${link.label.toLowerCase().replace(/\s+/g, "_")}.link`}
                className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card hover:bg-secondary transition-colors group"
              >
                <div
                  className={`w-10 h-10 rounded-xl ${link.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                >
                  {link.icon}
                </div>
                <span className="text-xs font-medium text-muted-foreground text-center leading-tight">
                  {link.label}
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Low stock alert */}
      {lowStockCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">
                    Low Stock Alert
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lowStockCount} item{lowStockCount > 1 ? "s are" : " is"}{" "}
                    running low on stock.{" "}
                    <Link to="/inventory" className="underline text-primary">
                      View Inventory
                    </Link>
                  </p>
                </div>
                <Badge variant="destructive">{lowStockCount}</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                {lowStockItems.slice(0, 5).map((item) => (
                  <Badge
                    key={item.id}
                    variant="outline"
                    className="text-xs border-destructive/30 text-destructive"
                  >
                    {item.name} ({item.quantity} left)
                  </Badge>
                ))}
                {lowStockItems.length > 5 && (
                  <Badge variant="outline" className="text-xs">
                    +{lowStockItems.length - 5} more
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
