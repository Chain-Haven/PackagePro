export const metadata = {
  title: 'PackagePro Terms of Service',
  description:
    'Terms governing the use of PackagePro for WooCommerce fulfillment video operations.',
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-muted/30 px-6 py-16">
      <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-background p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
          Terms of Service
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight">
          Using PackagePro responsibly
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground">
          <p>
            Merchants are responsible for complying with local privacy, employment, and
            customer-notice requirements before recording proof-of-packing videos.
          </p>
          <p>
            PackagePro should be used only for explicit, per-order fulfillment evidence. Operators
            must not use the system to monitor unrelated employee activity or to associate one
            recording with multiple orders.
          </p>
          <p>
            Merchants are responsible for keeping WooCommerce, ShipStation, and station hardware
            credentials secure and for promptly revoking access when staff roles change.
          </p>
        </div>
      </div>
    </div>
  );
}
