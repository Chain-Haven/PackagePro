export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">Welcome to PackagePro fulfillment management.</p>
      
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="Active Stations" value="—" />
        <DashboardCard title="Orders Today" value="—" />
        <DashboardCard title="Videos Recorded" value="—" />
        <DashboardCard title="Pending Uploads" value="—" />
      </div>
    </div>
  );
}

function DashboardCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-6 shadow-sm">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
