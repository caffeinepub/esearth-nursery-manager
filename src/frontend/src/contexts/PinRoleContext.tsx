import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import type { Role } from "../types";

interface PinRoleContextType {
  role: Role | null;
  setRole: (role: Role, pin: string) => boolean;
  logout: () => void;
  ownerPin: string;
  clerkPin: string;
  setOwnerPin: (pin: string) => void;
  setClerkPin: (pin: string) => void;
}

const PinRoleContext = createContext<PinRoleContextType | null>(null);

const STORAGE_KEY = "esearth_pins";
const SESSION_KEY = "esearth_role";

export function PinRoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role | null>(() => {
    try {
      return (sessionStorage.getItem(SESSION_KEY) as Role) ?? null;
    } catch {
      return null;
    }
  });

  const [ownerPin, setOwnerPinState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored).ownerPin ?? "1234";
    } catch {}
    return "1234";
  });

  const [clerkPin, setClerkPinState] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored).clerkPin ?? "0000";
    } catch {}
    return "0000";
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ownerPin, clerkPin }));
    } catch {}
  }, [ownerPin, clerkPin]);

  const setRole = (roleToSet: Role, pin: string): boolean => {
    const expectedPin = roleToSet === "owner" ? ownerPin : clerkPin;
    if (pin === expectedPin) {
      setRoleState(roleToSet);
      try {
        sessionStorage.setItem(SESSION_KEY, roleToSet);
      } catch {}
      return true;
    }
    return false;
  };

  const logout = () => {
    setRoleState(null);
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
  };

  const setOwnerPin = (pin: string) => setOwnerPinState(pin);
  const setClerkPin = (pin: string) => setClerkPinState(pin);

  return (
    <PinRoleContext.Provider
      value={{
        role,
        setRole,
        logout,
        ownerPin,
        clerkPin,
        setOwnerPin,
        setClerkPin,
      }}
    >
      {children}
    </PinRoleContext.Provider>
  );
}

export function usePinRole() {
  const ctx = useContext(PinRoleContext);
  if (!ctx) throw new Error("usePinRole must be used within PinRoleProvider");
  return ctx;
}
