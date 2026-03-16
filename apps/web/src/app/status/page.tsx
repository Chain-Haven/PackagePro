const statusChecks = [
  { label: 'Marketing site', value: 'Operational' },
  { label: 'Admin authentication', value: 'Operational' },
  { label: 'Supabase project', value: 'Connected' },
  { label: 'WooCommerce pairing flow', value: 'Ready for store install' },
];

export const metadata = {
  title: 'PackagePro Status',
  description: 'Current PackagePro platform status and operational readiness summary.',
};

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-muted/30 px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Status</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Platform readiness</h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          This page summarizes the current live state of the PackagePro deployment and the core user flows required for onboarding and fulfillment setup.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {statusChecks.map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-background p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-2xl font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
