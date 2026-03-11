import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "@tanstack/react-router";
import {
  BarChart3,
  CheckSquare,
  FileText,
  LayoutDashboard,
  Leaf,
  ListTodo,
  LogOut,
  Menu,
  Package,
  Receipt,
  Settings,
  TrendingDown,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { usePinRole } from "../contexts/PinRoleContext";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  ownerOnly?: boolean;
  ocid: string;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    path: "/",
    icon: <LayoutDashboard className="w-4 h-4" />,
    ownerOnly: true,
    ocid: "nav.dashboard.link",
  },
  {
    label: "Inventory",
    path: "/inventory",
    icon: <Package className="w-4 h-4" />,
    ocid: "nav.inventory.link",
  },
  {
    label: "Sales & Billing",
    path: "/sales",
    icon: <Receipt className="w-4 h-4" />,
    ocid: "nav.sales.link",
  },
  {
    label: "Expenditures",
    path: "/expenditures",
    icon: <TrendingDown className="w-4 h-4" />,
    ownerOnly: true,
    ocid: "nav.expenditures.link",
  },
  {
    label: "Reports",
    path: "/reports",
    icon: <FileText className="w-4 h-4" />,
    ownerOnly: true,
    ocid: "nav.reports.link",
  },
  {
    label: "Analytics",
    path: "/analytics",
    icon: <BarChart3 className="w-4 h-4" />,
    ownerOnly: true,
    ocid: "nav.analytics.link",
  },
  {
    label: "Priority Register",
    path: "/priority",
    icon: <ListTodo className="w-4 h-4" />,
    ocid: "nav.priority.link",
  },
  {
    label: "Daily Checklist",
    path: "/checklist",
    icon: <CheckSquare className="w-4 h-4" />,
    ocid: "nav.checklist.link",
  },
  {
    label: "Settings",
    path: "/settings",
    icon: <Settings className="w-4 h-4" />,
    ownerOnly: true,
    ocid: "nav.settings.link",
  },
];

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const { role, logout } = usePinRole();
  const location = useLocation();

  const visibleItems = navItems.filter(
    (item) => !item.ownerOnly || role === "owner",
  );

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 border border-sidebar-border overflow-hidden">
            <img
              src="/assets/uploads/IMG_20250112_193736_047-1.jpg"
              alt="Esearth logo"
              className="w-7 h-7 object-contain"
            />
          </div>
          <div>
            <p className="text-sm font-display font-bold text-sidebar-foreground leading-none">
              Esearth
            </p>
            <p className="text-[10px] text-sidebar-foreground/60 leading-none mt-0.5">
              Nursery Manager
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-sidebar-foreground/60 hover:text-sidebar-foreground lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={onClose}
                  data-ocid={item.ocid}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                  }`}
                >
                  {item.icon}
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
            <Leaf className="w-3.5 h-3.5 text-sidebar-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-sidebar-foreground truncate capitalize">
              {role}
            </p>
          </div>
          <Badge
            variant="secondary"
            className={`text-[10px] px-1.5 py-0.5 ${
              role === "owner"
                ? "bg-sidebar-primary/20 text-sidebar-primary border-0"
                : "bg-sidebar-accent text-sidebar-foreground border-0"
            }`}
          >
            {role === "owner" ? "Owner" : "Clerk"}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          data-ocid="nav.logout.button"
          className="w-full justify-start gap-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-60 lg:fixed lg:inset-y-0 lg:z-50">
        <SidebarContent />
      </div>

      {/* Mobile topbar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-sidebar border-b border-sidebar-border px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground"
          onClick={() => setMobileOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-white flex items-center justify-center border border-sidebar-border overflow-hidden">
            <img
              src="/assets/uploads/IMG_20250112_193736_047-1.jpg"
              alt="Esearth logo"
              className="w-5 h-5 object-contain"
            />
          </div>
          <span className="text-sm font-display font-bold text-sidebar-foreground">
            Esearth
          </span>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-50"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-64 z-50"
            >
              <SidebarContent onClose={() => setMobileOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
