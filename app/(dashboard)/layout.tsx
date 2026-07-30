import { Sidebar } from "@/components/sidebar";
import { AutoRefresh } from "@/components/auto-refresh";
import { DemoModeProvider } from "@/components/demo-mode-provider";
import { ChatSidebar } from "@/components/chat-sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoModeProvider>
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-20 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <div className="flex min-h-dvh flex-col md:flex-row">
        <Sidebar />
        <main id="main-content" className="min-w-0 flex-1 overflow-auto bg-background">
          <AutoRefresh />
          {children}
        </main>
        <ChatSidebar />
      </div>
    </DemoModeProvider>
  );
}
