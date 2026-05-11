export function buildAuditQueries(supabase: any, orgId: string, storeIds: string[]) {
  return [
    supabase.from('audit_logs').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase
      .from('email_events')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds)
      .eq('status', 'failed'),
    supabase
      .from('webhook_deliveries')
      .select('id', { count: 'exact', head: true })
      .in('store_id', storeIds),
    supabase
      .from('audit_logs')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('email_events')
      .select('*')
      .in('store_id', storeIds)
      .order('created_at', { ascending: false })
      .limit(25),
  ];
}
