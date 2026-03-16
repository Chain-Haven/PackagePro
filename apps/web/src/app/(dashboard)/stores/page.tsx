import Link from 'next/link';

export default function StoresPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Stores</h1>
        <Link href="/stores/connect" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Connect Store
        </Link>
      </div>
      <p className="mt-2 text-muted-foreground">Manage your WooCommerce store connections.</p>
      <div className="mt-6">
        <p className="text-muted-foreground">No stores connected yet. Connect your first WooCommerce store to get started.</p>
      </div>
    </div>
  );
}
