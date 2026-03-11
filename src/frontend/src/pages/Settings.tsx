import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Key, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePinRole } from "../contexts/PinRoleContext";
import {
  useLowStockThreshold,
  useSaveLowStockThreshold,
} from "../hooks/useQueries";

export default function Settings() {
  const { ownerPin, clerkPin, savePins } = usePinRole();
  const { data: threshold } = useLowStockThreshold();
  const saveThreshold = useSaveLowStockThreshold();

  const [newOwnerPin, setNewOwnerPin] = useState(ownerPin);
  const [newClerkPin, setNewClerkPin] = useState(clerkPin);
  const [thresholdValue, setThresholdValue] = useState(
    threshold ? Number(threshold) : 10,
  );
  const [confirmOwnerPin, setConfirmOwnerPin] = useState("");
  const [confirmClerkPin, setConfirmClerkPin] = useState("");

  useEffect(() => {
    if (threshold !== undefined) {
      setThresholdValue(Number(threshold));
    }
  }, [threshold]);

  // Sync input fields if PINs load from backend after mount
  useEffect(() => {
    setNewOwnerPin(ownerPin);
  }, [ownerPin]);
  useEffect(() => {
    setNewClerkPin(clerkPin);
  }, [clerkPin]);

  const handleSavePins = () => {
    if (newOwnerPin.length !== 4 || !/^\d{4}$/.test(newOwnerPin)) {
      toast.error("Owner PIN must be exactly 4 digits");
      return;
    }
    if (newClerkPin.length !== 4 || !/^\d{4}$/.test(newClerkPin)) {
      toast.error("Clerk PIN must be exactly 4 digits");
      return;
    }
    if (newOwnerPin !== confirmOwnerPin) {
      toast.error("Owner PIN confirmation does not match");
      return;
    }
    if (newClerkPin !== confirmClerkPin) {
      toast.error("Clerk PIN confirmation does not match");
      return;
    }
    savePins(newOwnerPin, newClerkPin);
    setConfirmOwnerPin("");
    setConfirmClerkPin("");
    toast.success("PINs updated and synced to all devices");
  };

  const handleSaveThreshold = async () => {
    if (thresholdValue < 0) {
      toast.error("Threshold must be a positive number");
      return;
    }
    try {
      await saveThreshold.mutateAsync(BigInt(thresholdValue));
      toast.success("Low stock threshold updated");
    } catch {
      toast.error("Failed to save threshold");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Owner configuration
        </p>
      </div>

      {/* PIN Settings */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            PIN Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="p-3 bg-muted/50 rounded-lg flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-warning-foreground mt-0.5" />
            <span>
              PINs are synced to the backend canister and shared across all
              devices. Make sure you remember your new PINs before saving.
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold mb-3 text-foreground">
                Owner PIN
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>New Owner PIN</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newOwnerPin}
                    onChange={(e) =>
                      setNewOwnerPin(
                        e.target.value.replace(/\D/g, "").slice(0, 4),
                      )
                    }
                    placeholder="4 digits"
                    data-ocid="settings.owner_pin.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm Owner PIN</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmOwnerPin}
                    onChange={(e) =>
                      setConfirmOwnerPin(
                        e.target.value.replace(/\D/g, "").slice(0, 4),
                      )
                    }
                    placeholder="Confirm PIN"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-3 text-foreground">
                Clerk PIN
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>New Clerk PIN</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={newClerkPin}
                    onChange={(e) =>
                      setNewClerkPin(
                        e.target.value.replace(/\D/g, "").slice(0, 4),
                      )
                    }
                    placeholder="4 digits"
                    data-ocid="settings.clerk_pin.input"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirm Clerk PIN</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmClerkPin}
                    onChange={(e) =>
                      setConfirmClerkPin(
                        e.target.value.replace(/\D/g, "").slice(0, 4),
                      )
                    }
                    placeholder="Confirm PIN"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button onClick={handleSavePins} data-ocid="settings.save.button">
            <Save className="w-4 h-4 mr-2" />
            Save PINs
          </Button>
        </CardContent>
      </Card>

      {/* Inventory Settings */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            Inventory Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Low Stock Threshold</Label>
            <p className="text-xs text-muted-foreground">
              Items with quantity at or below this number will show a Low Stock
              warning.
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                value={thresholdValue}
                onChange={(e) => setThresholdValue(Number(e.target.value))}
                className="w-32"
                data-ocid="settings.threshold.input"
              />
              <Button
                variant="outline"
                onClick={handleSaveThreshold}
                disabled={saveThreshold.isPending}
              >
                {saveThreshold.isPending ? "Saving..." : "Update Threshold"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* App info */}
      <Card className="border-border bg-muted/20">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Esearth Nursery Manager</strong>{" "}
            — All data (inventory, sales, expenditures, checklist, tasks, PINs)
            is synced with the backend canister. No data is stored locally on
            the device.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
