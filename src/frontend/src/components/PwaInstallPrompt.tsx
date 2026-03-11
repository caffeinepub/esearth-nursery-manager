import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Only show if not dismissed before
      const dismissed = sessionStorage.getItem("pwa_install_dismissed");
      if (!dismissed) setShowBanner(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem("pwa_install_dismissed", "1");
  };

  if (!showBanner) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-card border border-border shadow-lg rounded-xl px-4 py-3 max-w-sm w-[calc(100%-2rem)]"
      data-ocid="pwa.install.toast"
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">
          Install Esearth App
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add to home screen for quick access
        </p>
      </div>
      <Button
        size="sm"
        onClick={handleInstall}
        className="flex-shrink-0"
        data-ocid="pwa.install.button"
      >
        <Download className="w-3.5 h-3.5 mr-1.5" />
        Install
      </Button>
      <button
        type="button"
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground text-lg leading-none flex-shrink-0"
        aria-label="Dismiss"
        data-ocid="pwa.install.close_button"
      >
        &times;
      </button>
    </div>
  );
}
