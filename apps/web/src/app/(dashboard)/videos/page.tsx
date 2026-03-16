export default function VideosPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Videos</h1>
      <p className="mt-2 text-muted-foreground">
        Manage packing videos and uploads.
      </p>

      <div className="mt-4 flex gap-4">
        <div className="rounded-lg border border-border bg-background p-4 flex-1">
          <p className="text-sm text-muted-foreground">Total Videos</p>
          <p className="text-2xl font-bold mt-1">—</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4 flex-1">
          <p className="text-sm text-muted-foreground">Pending Uploads</p>
          <p className="text-2xl font-bold mt-1">—</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4 flex-1">
          <p className="text-sm text-muted-foreground">Failed</p>
          <p className="text-2xl font-bold mt-1">—</p>
        </div>
        <div className="rounded-lg border border-border bg-background p-4 flex-1">
          <p className="text-sm text-muted-foreground">Storage Used</p>
          <p className="text-2xl font-bold mt-1">—</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-muted-foreground">
          No videos recorded yet. Videos will appear here once packing stations
          are active.
        </p>
      </div>
    </div>
  );
}
