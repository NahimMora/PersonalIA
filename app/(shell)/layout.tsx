import { TopBar } from "@/components/shell/TopBar";
import { BottomNav } from "@/components/shell/BottomNav";
import { Sidebar } from "@/components/shell/Sidebar";
import { KeyboardShortcuts } from "@/components/shell/KeyboardShortcuts";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:pl-60">
      <KeyboardShortcuts />
      <Sidebar />
      <TopBar />
      <main className="mx-auto max-w-4xl px-4 pt-4 pb-24 md:px-10 md:pt-8 md:pb-12">{children}</main>
      <BottomNav />
    </div>
  );
}
