-- PackagePro membership RLS helpers

CREATE OR REPLACE FUNCTION public.is_org_member(target_org uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = auth.uid()
      AND org_id = target_org
  );
$$;

CREATE OR REPLACE FUNCTION public.has_org_role(target_org uuid, allowed_roles membership_role[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE user_id = auth.uid()
      AND org_id = target_org
      AND role = ANY(allowed_roles)
  );
$$;

CREATE OR REPLACE FUNCTION public.org_has_members(target_org uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships
    WHERE org_id = target_org
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, membership_role[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_has_members(uuid) TO authenticated;

DROP POLICY IF EXISTS "memberships_select" ON memberships;
DROP POLICY IF EXISTS "memberships_insert" ON memberships;
DROP POLICY IF EXISTS "memberships_update" ON memberships;
DROP POLICY IF EXISTS "memberships_delete" ON memberships;

CREATE POLICY "memberships_select" ON memberships
  FOR SELECT TO authenticated
  USING (public.is_org_member(org_id));

CREATE POLICY "memberships_insert" ON memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_org_role(
      org_id,
      ARRAY['org_owner'::membership_role, 'org_admin'::membership_role]
    )
    OR (user_id = auth.uid() AND NOT public.org_has_members(org_id))
  );

CREATE POLICY "memberships_update" ON memberships
  FOR UPDATE TO authenticated
  USING (
    public.has_org_role(
      org_id,
      ARRAY['org_owner'::membership_role, 'org_admin'::membership_role]
    )
  );

CREATE POLICY "memberships_delete" ON memberships
  FOR DELETE TO authenticated
  USING (
    public.has_org_role(
      org_id,
      ARRAY['org_owner'::membership_role, 'org_admin'::membership_role]
    )
  );
