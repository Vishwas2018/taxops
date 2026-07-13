import { Disclaimer } from "@/components/disclaimer";

/**
 * Wraps every article so the footer disclaimer is structurally guaranteed - an MDX file has
 * no way to render its own layout and so cannot omit this, unlike a per-article copy/paste
 * that an author could forget or edit out.
 */
export default function TipArticleLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      {children}
      <Disclaimer variant="footer" />
    </div>
  );
}
