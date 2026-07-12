import Link from "next/link";
import { redirect } from "next/navigation";
import { Disclaimer } from "@/components/disclaimer";
import { AppSidebar } from "@/components/nav/app-sidebar";
import { UserMenu } from "@/components/nav/user-menu";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // proxy.ts already redirects unauthenticated requests, but it's an optimistic check only
  // (see Next.js Proxy docs) - verify the user again here before rendering anything private.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex flex-1">
      <aside className="hidden w-56 shrink-0 border-r md:block">
        <Link href="/" className="block px-4 py-4 text-lg font-semibold">
          TaxOps
        </Link>
        <AppSidebar />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end border-b px-6 py-3">
          <UserMenu email={user.email ?? ""} />
        </header>
        <main className="flex-1 px-6 py-8">{children}</main>
        <footer className="border-t px-6 py-4">
          <Disclaimer variant="footer" />
        </footer>
      </div>
    </div>
  );
}
