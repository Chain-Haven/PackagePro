import { createAdminClient } from '@/lib/supabase/admin';

interface AuditParams {
  org_id?: string;
  actor_id?: string;
  actor_type?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: Record<string, unknown>;
  ip_address?: string;
}

export async function logAudit(params: AuditParams) {
  try {
    const admin = createAdminClient();
    await admin.from('audit_logs').insert({
      org_id: params.org_id || null,
      actor_id: params.actor_id || null,
      actor_type: params.actor_type || 'system',
      action: params.action,
      resource_type: params.resource_type || null,
      resource_id: params.resource_id || null,
      details: params.details || {},
      ip_address: params.ip_address || null,
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}
