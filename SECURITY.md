# Security Policy

## Scope

TaxOps handles user-provided financial estimates (income, deductions, property details) for
educational calculators. It does not store bank credentials, does not integrate with the ATO,
and does not process payments in v1.

## Reporting a vulnerability

Do not open a public GitHub issue for security reports. Email the maintainer directly
(see repository owner) with:

- A description of the vulnerability and its impact
- Steps to reproduce
- Any relevant logs or screenshots (redact personal data)

Expect an acknowledgement within 3 business days.

## Data handling principles

- Row Level Security is enabled on every user table; policies restrict read/write to the
  owning `auth.uid()`. No table is created without an RLS policy in the same migration.
- No financial data is written to logs, error reporting, or analytics.
- All user input is validated server-side with Zod, even when already validated client-side.
- Supabase service-role keys are never exposed to the client and are only used in trusted
  server contexts (migrations, seed scripts, admin scripts) — never in API routes reachable
  by end users unless explicitly required and RLS-equivalent checks are enforced first.
- Auth cookies are managed via `@supabase/ssr`; sessions are validated on the server for every
  protected route, not just checked optimistically in `proxy.ts`.

## Dependencies

Dependency updates are reviewed before merge. `npm audit` is run as part of the quality loop;
known vulnerabilities in direct dependencies are patched promptly. Transitive advisories with
no exploitable path in this app's usage are documented rather than blocking, since forcing an
upgrade can introduce breaking changes of its own.

## Supported versions

Only the `main` branch is supported. There are no historical releases to patch during initial
development.
