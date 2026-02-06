import { Sidebar } from "@/components/sidebar";
import { AutoRefresh } from "@/components/auto-refresh";
import { DemoModeProvider } from "@/components/demo-mode-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DemoModeProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <AutoRefresh />
          {children}
        </main>
      </div>
    </DemoModeProvider>
  );
}
