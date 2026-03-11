import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import Layout from "./components/Layout";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import { PinRoleProvider, usePinRole } from "./contexts/PinRoleContext";
import BusinessAnalytics from "./pages/BusinessAnalytics";
import DailyChecklist from "./pages/DailyChecklist";
import Dashboard from "./pages/Dashboard";
import Expenditures from "./pages/Expenditures";
import Inventory from "./pages/Inventory";
import PinLogin from "./pages/PinLogin";
import PriorityRegister from "./pages/PriorityRegister";
import Reports from "./pages/Reports";
import Sales from "./pages/Sales";
import Settings from "./pages/Settings";

// ── Route guards ─────────────────────────────────────────────────────────
function getRole(): "owner" | "clerk" | null {
  try {
    return (
      (sessionStorage.getItem("esearth_role") as "owner" | "clerk") ?? null
    );
  } catch {
    return null;
  }
}

function requireAuth() {
  const role = getRole();
  if (!role) throw redirect({ to: "/login" });
}

function requireOwner() {
  const role = getRole();
  if (!role) throw redirect({ to: "/login" });
  if (role !== "owner") throw redirect({ to: "/sales" });
}

// ── Root ──────────────────────────────────────────────────────────────────
const rootRoute = createRootRoute({
  component: () => (
    <>
      <Outlet />
      <Toaster richColors position="top-right" />
      <PwaInstallPrompt />
    </>
  ),
});

// ── Login ─────────────────────────────────────────────────────────────────
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: PinLogin,
});

// ── App layout wrapper ────────────────────────────────────────────────────
const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  beforeLoad: requireAuth,
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const dashboardRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  beforeLoad: requireOwner,
  component: Dashboard,
});

const inventoryRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/inventory",
  component: Inventory,
});

const salesRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/sales",
  component: Sales,
});

const expendituresRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/expenditures",
  beforeLoad: requireOwner,
  component: Expenditures,
});

const reportsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/reports",
  beforeLoad: requireOwner,
  component: Reports,
});

const analyticsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/analytics",
  beforeLoad: requireOwner,
  component: BusinessAnalytics,
});

const priorityRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/priority",
  component: PriorityRegister,
});

const checklistRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/checklist",
  component: DailyChecklist,
});

const settingsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/settings",
  beforeLoad: requireOwner,
  component: Settings,
});

// ── Tree & Router ─────────────────────────────────────────────────────────
const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    dashboardRoute,
    inventoryRoute,
    salesRoute,
    expendituresRoute,
    reportsRoute,
    analyticsRoute,
    priorityRoute,
    checklistRoute,
    settingsRoute,
  ]),
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// ── Inner app (uses context) ──────────────────────────────────────────────
function AppInner() {
  const { role } = usePinRole();

  // Show login if not authenticated
  if (!role) {
    return (
      <>
        <PinLogin />
        <Toaster richColors position="top-right" />
        <PwaInstallPrompt />
      </>
    );
  }

  return <RouterProvider router={router} />;
}

// ── Root component ────────────────────────────────────────────────────────
export default function App() {
  return (
    <PinRoleProvider>
      <AppInner />
    </PinRoleProvider>
  );
}
