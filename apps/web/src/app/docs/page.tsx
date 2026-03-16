import Link from 'next/link';
import { docs } from '@/lib/site-content';

export const metadata = {
  title: 'PackagePro Docs',
  description: 'Documentation for onboarding, desktop setup, WooCommerce pairing, ShipStation, and security.',
};

export default function DocsIndexPage() {
  return (
    <div className="min-h-screen bg-muted/30 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Documentation</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Guides for every PackagePro surface</h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          Start with onboarding, then move into store pairing, station setup, ShipStation mapping, and security hardening.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {docs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/docs/${doc.slug}`}
              className="rounded-2xl border border-border bg-background p-6 shadow-sm transition hover:border-primary/30 hover:shadow-md"
            >
              <h2 className="text-xl font-bold">{doc.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{doc.description}</p>
              <p className="mt-4 text-sm font-semibold text-primary">Read guide</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
