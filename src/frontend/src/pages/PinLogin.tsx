import { Button } from "@/components/ui/button";
import { Leaf, Lock } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { usePinRole } from "../contexts/PinRoleContext";
import type { Role } from "../types";

export default function PinLogin() {
  const { setRole } = usePinRole();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedRole) {
      inputRef.current?.focus();
    }
  }, [selectedRole]);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setPin("");
    setError("");
  };

  const handleSubmit = () => {
    if (!selectedRole || pin.length < 4) return;
    const success = setRole(selectedRole, pin);
    if (!success) {
      setError("Incorrect PIN. Please try again.");
      setPin("");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const handleKeyPress = (key: string) => {
    if (key === "DEL") {
      setPin((p) => p.slice(0, -1));
      setError("");
    } else if (key === "ENTER") {
      handleSubmit();
    } else if (pin.length < 4) {
      const newPin = pin + key;
      setPin(newPin);
      setError("");
      if (newPin.length === 4) {
        setTimeout(() => {
          if (selectedRole) {
            const success = setRole(selectedRole, newPin);
            if (!success) {
              setError("Incorrect PIN. Please try again.");
              setPin("");
              setShake(true);
              setTimeout(() => setShake(false), 500);
            }
          }
        }, 200);
      }
    }
  };

  const keys = [
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "DEL",
    "0",
    "ENTER",
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Background texture */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, oklch(0.55 0.18 145 / 0.15) 0%, transparent 60%), 
                           radial-gradient(circle at 80% 80%, oklch(0.65 0.16 85 / 0.1) 0%, transparent 60%)`,
        }}
      />

      <div className="w-full max-w-sm z-10">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4 shadow-lg">
            <Leaf className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Esearth
          </h1>
          <p className="text-sm text-muted-foreground font-body">
            Nursery Manager
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-6 shadow-lg"
        >
          {/* Role selection */}
          <div className="mb-6">
            <p className="text-sm font-medium text-muted-foreground text-center mb-3">
              Select your role
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant={selectedRole === "owner" ? "default" : "outline"}
                className="h-12 text-sm font-medium"
                onClick={() => handleRoleSelect("owner")}
                data-ocid="pin.role.owner.button"
              >
                <Lock className="w-4 h-4 mr-2" />
                Owner
              </Button>
              <Button
                variant={selectedRole === "clerk" ? "default" : "outline"}
                className="h-12 text-sm font-medium"
                onClick={() => handleRoleSelect("clerk")}
                data-ocid="pin.role.clerk.button"
              >
                <Leaf className="w-4 h-4 mr-2" />
                Clerk
              </Button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {selectedRole && (
              <motion.div
                key="pin-entry"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
              >
                {/* Hidden input for mobile keyboard */}
                <input
                  ref={inputRef}
                  type="tel"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setPin(v);
                    setError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit();
                  }}
                  className="sr-only"
                  aria-label="PIN input"
                  data-ocid="pin.input"
                />

                {/* PIN dots */}
                <motion.div
                  animate={shake ? { x: [-8, 8, -8, 8, 0] } : { x: 0 }}
                  transition={{ duration: 0.4 }}
                  className="flex justify-center gap-4 mb-4"
                >
                  {[0, 1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                        i < pin.length
                          ? "bg-primary border-primary"
                          : "border-border bg-muted"
                      }`}
                    />
                  ))}
                </motion.div>

                {/* Error message */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-destructive text-xs text-center mb-3"
                      data-ocid="pin.error_state"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Numeric keypad */}
                <div className="grid grid-cols-3 gap-2">
                  {keys.map((key) => (
                    <Button
                      key={key}
                      variant={key === "ENTER" ? "default" : "outline"}
                      className={`h-12 text-base font-medium ${
                        key === "ENTER" ? "text-sm" : ""
                      } ${key === "DEL" ? "text-muted-foreground" : ""}`}
                      onClick={() => handleKeyPress(key)}
                      data-ocid={
                        key === "ENTER" ? "pin.submit.button" : undefined
                      }
                    >
                      {key === "DEL" ? "⌫" : key === "ENTER" ? "Enter" : key}
                    </Button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!selectedRole && (
            <p className="text-center text-xs text-muted-foreground">
              Select a role to continue
            </p>
          )}
        </motion.div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Built with love using caffeine.ai
          </a>
        </p>
      </div>
    </div>
  );
}
