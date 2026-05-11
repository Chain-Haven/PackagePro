import Link from 'next/link';
import { Apple, Monitor, Package, Download, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Download PackagePro',
  description:
    'Download the PackagePro desktop app for macOS or Windows, and the WooCommerce fulfillment plugin.',
};

export default function DownloadPage() {
  return (
    <div className="min-h-screen bg-muted/30 px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to home
        </Link>

        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Downloads</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Get PackagePro</h1>
        <p className="mt-4 max-w-3xl text-base text-muted-foreground">
          Download the desktop app for your packing stations and the WooCommerce plugin for your
          store. Every button triggers an immediate download of the latest release.
        </p>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <DownloadCard
            icon={<Apple className="h-7 w-7" />}
            title="macOS"
            description="DMG installer for Apple Silicon and Intel."
            href="/download/desktop/macos"
            buttonText="Download .dmg"
          />
          <DownloadCard
            icon={<Monitor className="h-7 w-7" />}
            title="Windows"
            description="ZIP package for Windows 10 and later. Extract the archive and open the included desktop app."
            href="/download/desktop/windows"
            buttonText="Download .zip"
          />
          <DownloadCard
            icon={<Package className="h-7 w-7" />}
            title="WooCommerce Plugin"
            description="Upload via Plugins &rarr; Add New &rarr; Upload in WP Admin."
            href="/download/plugin/woocommerce"
            buttonText="Download .zip"
          />
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-background p-8 shadow-sm">
          <h2 className="text-xl font-bold">Quick setup checklist</h2>
          <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
            <li>
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                1
              </span>{' '}
              Install the WooCommerce plugin and note the pairing code on the plugin settings page.
            </li>
            <li>
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                2
              </span>{' '}
              Install the desktop app on the packing station and sign in with your PackagePro
              account.
            </li>
            <li>
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                3
              </span>{' '}
              Enter the pairing code during the desktop setup wizard to connect the store.
            </li>
            <li>
              <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                4
              </span>{' '}
              Scan an order barcode to start your first recording.
            </li>
          </ol>
        </div>

        <div className="mt-8 text-sm text-muted-foreground">
          All releases are published on{' '}
          <a
            href="https://github.com/Chain-Haven/PackagePro/releases"
            className="font-medium text-primary hover:underline"
          >
            GitHub Releases
          </a>
          .
        </div>
      </div>
    </div>
  );
}

function DownloadCard({
  icon,
  title,
  description,
  href,
  buttonText,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  buttonText: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-background p-6 shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-xl font-bold">{title}</h3>
      <p
        className="mt-2 flex-1 text-sm text-muted-foreground"
        dangerouslySetInnerHTML={{ __html: description }}
      />
      <a
        href={href}
        download
        className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
      >
        <Download className="h-4 w-4" />
        {buttonText}
      </a>
    </div>
  );
}
