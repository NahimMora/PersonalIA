"use client";

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import type { ReactNode } from "react";

export function NavLink({
  href,
  label,
  icon,
  exact = false,
  hint,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
  hint?: string;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
        active ? "bg-accent-soft text-accent-strong font-medium" : "text-muted hover:bg-surface-hover hover:text-foreground"
      )}
    >
      {/* Lucide icons stroke with currentColor, so they follow the link's own active/hover color automatically. */}
      <span className="shrink-0">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {hint && (
        <kbd className="hidden shrink-0 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted lg:inline-block">
          {hint}
        </kbd>
      )}
    </Link>
  );
}
