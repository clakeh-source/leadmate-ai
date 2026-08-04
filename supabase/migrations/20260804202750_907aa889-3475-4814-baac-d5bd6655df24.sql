REVOKE EXECUTE ON FUNCTION public.is_workspace_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_workspace_role(uuid, public.workspace_role[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_workspace_ids() FROM anon;
REVOKE EXECUTE ON FUNCTION public.normalize_lead() FROM anon, authenticated;