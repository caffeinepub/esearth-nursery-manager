import type { ReactNode } from "react";
import OfflineBanner from "./OfflineBanner";
import Sidebar from "./Sidebar";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <OfflineBanner />
      <Sidebar />
      {/* Content area — offset for desktop sidebar, add top padding for mobile bar */}
      <main className="lg:pl-60 pt-16 lg:pt-0 flex-1">
        <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
      </main>
      <footer className="lg:pl-60 border-t border-border bg-card">
        <div className="max-w-6xl mx-auto px-4 py-3 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()}.{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-foreground transition-colors"
          >
            Built with love using caffeine.ai
          </a>
        </div>
      </footer>
    </div>
  );
}
