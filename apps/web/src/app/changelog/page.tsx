export const metadata = {
  title: 'PackagePro Changelog',
  description: 'Recent PackagePro release milestones and launch-readiness updates.',
};

const entries = [
  {
    date: '2026-03-15',
    title: 'Production onboarding and live Supabase wiring',
    body:
      'Connected the live PackagePro deployment to a dedicated Supabase project, added onboarding pages, and replaced placeholder marketing links with real docs and status pages.',
  },
  {
    date: '2026-03-14',
    title: 'Landing page and deployment hardening',
    body:
      'Published the branded marketing site, fixed public-route handling, and removed API crashes caused by missing configuration.',
  },
  {
    date: '2026-03-13',
    title: 'WooCommerce and ShipStation MVP scaffold',
    body:
      'Completed the monorepo scaffold, core data model, desktop app skeleton, WooCommerce plugin bootstrap, and ShipStation service layer.',
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-muted/30 px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Changelog</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Recent release milestones</h1>

        <div className="mt-10 space-y-6">
          {entries.map((entry) => (
            <section key={entry.title} className="rounded-2xl border border-border bg-background p-6 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{entry.date}</p>
              <h2 className="mt-2 text-2xl font-bold">{entry.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{entry.body}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
