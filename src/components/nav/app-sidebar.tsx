"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Tax Profile" },
  { href: "/calculators", label: "Calculators" },
  { href: "/checklists", label: "Checklists" },
  { href: "/tips", label: "Tips" },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="flex flex-col gap-1 p-4">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-200 ease-in-out",
              isActive
                ? "bg-accentSubtle text-accentOnSurface"
                : "text-textMuted hover:bg-neutralSubtle hover:text-textPrimary",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
