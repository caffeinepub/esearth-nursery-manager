/**
 * PinRoleContext — PINs stored in the shared backend canister.
 * No localStorage writes; all data synced via setSharedData/getSharedData.
 */
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";
import { useSharedBackendData } from "../hooks/useSharedBackendData";
import type { Role } from "../types";

interface PinData {
  ownerPin: string;
  clerkPin: string;
}

interface PinRoleContextType {
  role: Role | null;
  setRole: (role: Role, pin: string) => boolean;
  logout: () => void;
  ownerPin: string;
  clerkPin: string;
  /** Save both PINs atomically to the backend */
  savePins: (ownerPin: string, clerkPin: string) => void;
  pinsLoading: boolean;
}

const PinRoleContext = createContext<PinRoleContextType | null>(null);

const SESSION_KEY = "esearth_role";
const PINS_KEY = "esearth_pins_v4";
const DEFAULT_PINS: PinData = { ownerPin: "1234", clerkPin: "0000" };

export function PinRoleProvider({ children }: { children: ReactNode }) {
  const {
    data: pinData,
    saveData: savePinData,
    isLoading: pinsLoading,
  } = useSharedBackendData<PinData>(PINS_KEY, DEFAULT_PINS);

  const [role, setRoleState] = useState<Role | null>(() => {
    try {
      return (sessionStorage.getItem(SESSION_KEY) as Role) ?? null;
    } catch {
      return null;
    }
  });

  const { ownerPin, clerkPin } = pinData;

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

  const savePins = useCallback(
    (newOwnerPin: string, newClerkPin: string) => {
      savePinData({ ownerPin: newOwnerPin, clerkPin: newClerkPin });
    },
    [savePinData],
  );

  return (
    <PinRoleContext.Provider
      value={{
        role,
        setRole,
        logout,
        ownerPin,
        clerkPin,
        savePins,
        pinsLoading,
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
