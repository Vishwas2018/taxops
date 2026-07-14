"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { MenuIcon, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogOverlay, DialogPortal, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NAV_ITEMS } from "./nav-items";

/**
 * Below `md`, the sidebar (`(app)/layout.tsx`) is hidden entirely with no replacement - a
 * signed-in user at 390px had no way to move between app sections. This reuses the same Dialog
 * primitive as `ui/dialog.tsx` (modal by default: focus trap, body scroll lock, Escape-to-close
 * all come for free from `@base-ui/react`) but renders the popup as a left slide-over instead of
 * a centered modal, listing the same `NAV_ITEMS` as `AppSidebar` so the two can't drift apart.
 *
 * `open` is controlled (not `DialogClose`-wrapped links) and closed via a `pathname` effect,
 * not the link's own click handler: wrapping a Next `Link` in `DialogClose` unmounts the Popup
 * (and the Link with it) in the same tick as the click, racing Next's client-side navigation and
 * silently dropping it before the route actually changes.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Reset (not an effect) per https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes -
  // closes the sheet the moment the route changes, without an extra post-render effect pass.
  const [openedForPathname, setOpenedForPathname] = useState(pathname);
  if (pathname !== openedForPathname) {
    setOpenedForPathname(pathname);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Open navigation menu" />}>
        <MenuIcon aria-hidden="true" />
      </DialogTrigger>
      <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Popup
          data-slot="mobile-nav-content"
          className="fixed inset-y-0 left-0 z-50 flex h-full w-72 max-w-[85%] flex-col gap-1 bg-surface p-4 shadow-floating outline-none duration-150 data-open:animate-in data-open:slide-in-from-left data-open:fade-in-0 data-closed:animate-out data-closed:slide-out-to-left data-closed:fade-out-0"
        >
          <div className="mb-2 flex items-center justify-between">
            {/* This is the dialog's accessible name (Base UI wires aria-labelledby to it
              automatically, which wins over any aria-label on Popup) - "Menu" rather than
              "TaxOps" so it doesn't read as a second, ambiguous brand link to AT users. */}
            <DialogTitle className="text-lg font-semibold">Menu</DialogTitle>
            <DialogClose render={<Button variant="ghost" size="icon-sm" aria-label="Close navigation menu" />}>
              <XIcon aria-hidden="true" />
            </DialogClose>
          </div>
          <nav aria-label="Main" className="flex flex-col gap-1">
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
        </DialogPrimitive.Popup>
      </DialogPortal>
    </Dialog>
  );
}
