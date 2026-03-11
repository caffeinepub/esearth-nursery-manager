import { useOnlineStatus } from "../hooks/useOnlineStatus";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      data-ocid="offline.banner"
      className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground text-center text-sm py-2 px-4 font-medium shadow-md"
    >
      You are offline. Data is read-only. Changes will not be saved until
      connection is restored.
    </div>
  );
}
