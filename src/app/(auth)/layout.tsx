import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/" className="block text-center text-lg font-semibold">
          TaxOps
        </Link>
        {children}
      </div>
    </div>
  );
}
