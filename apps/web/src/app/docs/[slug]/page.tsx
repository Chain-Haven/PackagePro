import Link from 'next/link';
import { notFound } from 'next/navigation';
import { docs, getDocBySlug } from '@/lib/site-content';

type DocPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return docs.map((doc) => ({ slug: doc.slug }));
}

export default async function DocPage({ params }: DocPageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

  if (!doc) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-muted/30 px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <Link href="/docs" className="text-sm font-semibold text-primary">
          Back to docs
        </Link>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight">{doc.title}</h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">{doc.intro}</p>

        <div className="mt-10 space-y-8">
          {doc.sections.map((section) => (
            <section key={section.heading} className="rounded-2xl border border-border bg-background p-6 shadow-sm">
              <h2 className="text-2xl font-bold">{section.heading}</h2>
              <div className="mt-4 space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
