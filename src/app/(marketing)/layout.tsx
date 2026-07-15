import Link from "next/link";
import { Disclaimer } from "@/components/disclaimer";
import { buttonVariants } from "@/components/ui/button";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <Link href="/" className="text-lg font-semibold">
          TaxOps
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-4">
          <Link href="/tips" className="text-sm text-muted-foreground hover:text-foreground">
            Tips
          </Link>
          <Link href="/sign-in" className={buttonVariants({ variant: "ghost" })}>
            Sign in
          </Link>
          <Link href="/sign-up" className={buttonVariants()}>
            Get started
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="space-y-4 border-t px-6 py-6">
        <nav aria-label="Footer" className="flex justify-center">
          <Link
            href="/tax-dates"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Tax Dates
          </Link>
        </nav>
        <Disclaimer variant="footer" />
      </footer>
    </div>
  );
}
