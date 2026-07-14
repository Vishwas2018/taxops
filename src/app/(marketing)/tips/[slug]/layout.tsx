/**
 * Wraps every article's content width/spacing. The footer disclaimer itself is NOT rendered
 * here - `(marketing)/layout.tsx` already renders one unconditionally for every route in this
 * group, this route included, so the no-omit guarantee (an MDX file can't skip a layout) already
 * holds one level up. Rendering it again here duplicated it back-to-back on every article page
 * (this is the only route nested under two layouts in the app, so no other route hit this).
 */
export default function TipArticleLayout({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-3xl px-6 py-16">{children}</div>;
}
