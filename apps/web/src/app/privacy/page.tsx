export const metadata = {
  title: 'PackagePro Privacy Policy',
  description: 'Privacy principles for PackagePro proof-of-packing video workflows.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-muted/30 px-6 py-16">
      <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-background p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Privacy Policy
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">
          PackagePro privacy commitments
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            PackagePro is designed for per-order proof-of-packing recordings, not continuous
            employee surveillance. Merchants are expected to aim cameras only at the packing area
            and avoid capturing unrelated workspaces or printed labels whenever possible.
          </p>
          <p>
            Customer videos are stored privately and are never exposed through public object URLs.
            Access is granted through single-order viewer links backed by opaque tokens and
            server-side authorization checks.
          </p>
          <p>
            Administrative access is scoped to organization members using role-based permissions and
            Supabase row-level security. Operational logs are retained for debugging, access
            auditing, and compliance needs.
          </p>
        </div>
      </div>
    </div>
  );
}
