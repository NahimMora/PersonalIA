import Link from "next/link";
import { getCurrentActivity } from "@/lib/services/activities";
import { ActivityStopButton } from "@/components/shell/ActivityStopButton";
import { relativeTime } from "@/lib/ui-maps";

export async function TopBar() {
  const activity = await getCurrentActivity();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/95 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          Segundo Cerebro
        </Link>

        {activity ? (
          <div className="flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-in-progress" />
            <span className="max-w-[100px] truncate">
              {activity.project.name}
              {activity.label ? ` · ${activity.label}` : ""}
            </span>
            <span className="text-muted">{relativeTime(activity.startedAt)}</span>
            <ActivityStopButton />
          </div>
        ) : null}
      </div>
    </header>
  );
}
