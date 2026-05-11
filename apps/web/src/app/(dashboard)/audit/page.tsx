import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { buildAuditQueries } from '@/lib/audit-page-data';

export const dynamic = 'force-dynamic';

export default async function AuditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: memberships } = await supabase
    .from('memberships')
    .select('organizations(id)')
    .eq('user_id', user.id);

  const organization = Array.isArray(memberships?.[0]?.organizations)
    ? memberships?.[0]?.organizations?.[0]
    : memberships?.[0]?.organizations;
  const orgId = organization?.id;

  if (!orgId) {
    redirect('/onboarding');
  }

  const { data: stores } = await supabase.from('stores').select('id').eq('org_id', orgId);
  const storeIds = (stores ?? []).map((store) => store.id);

  const auditQueries = buildAuditQueries(supabase, orgId, storeIds);

  const [
    { count: auditCount },
    { count: emailFailures },
    { count: webhookCount },
    { data: auditLogs },
    { data: emailEvents },
  ] = await Promise.all(auditQueries);

  const logs = (auditLogs as any[]) || [];
  const events = (emailEvents as any[]) || [];

  return (
    <div>
      <h1 className="text-3xl font-bold">Audit Log</h1>
      <p className="mt-2 text-muted-foreground">
        Review route-level audit entries and recent customer email outcomes.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <SummaryCard label="Audit events" value={String(auditCount ?? 0)} />
        <SummaryCard label="Failed emails" value={String(emailFailures ?? 0)} />
        <SummaryCard label="Webhook deliveries" value={String(webhookCount ?? 0)} />
      </div>

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
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No audit events recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((entry) => (
                <tr key={entry.id} className="border-t border-border">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {entry.actor_type || 'unknown'}:{entry.actor_id || 'system'}
                  </td>
                  <td className="px-4 py-3 font-medium">{entry.action}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.resource_type || 'n/a'} {entry.resource_id || ''}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(entry.details || {}, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 rounded-lg border border-border overflow-hidden">
        <div className="border-b border-border bg-muted px-4 py-3">
          <h2 className="text-sm font-semibold">Recent email events</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Time</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Recipient</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Error</th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No email events yet.
                </td>
              </tr>
            ) : (
              events.map((event) => (
                <tr key={event.id} className="border-t border-border">
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(event.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{event.type}</td>
                  <td className="px-4 py-3">{event.recipient}</td>
                  <td className="px-4 py-3">{event.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">{event.error || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}
