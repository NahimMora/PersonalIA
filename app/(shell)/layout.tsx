import { TopBar } from "@/components/shell/TopBar";
import { BottomNav } from "@/components/shell/BottomNav";

export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh pb-20 md:pb-8">
      <TopBar />
      <main className="mx-auto max-w-5xl px-4 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
