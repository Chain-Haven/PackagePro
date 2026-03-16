export default function AuditPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold">Audit Log</h1>
      <p className="mt-2 text-muted-foreground">
        View system activity and access logs.
      </p>

      <div className="mt-6 rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Time</th>
              <th className="px-4 py-3 text-left font-medium">Actor</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
              <th className="px-4 py-3 text-left font-medium">Resource</th>
              <th className="px-4 py-3 text-left font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={5}
                className="px-4 py-8 text-center text-muted-foreground"
              >
                Connect a Supabase project to view audit logs.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
