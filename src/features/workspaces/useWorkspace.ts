import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type WorkspaceRole = Database["public"]["Enums"]["workspace_role"];

export interface CurrentWorkspace {
  id: string;
  name: string;
  slug: string;
  role: WorkspaceRole;
  timezone: string;
  dailyEmailLimit: number;
}

export const workspaceQueryKey = ["current-workspace"] as const;

/** Resolves the signed-in user's active workspace (first membership). */
export function useWorkspace() {
  return useQuery({
    queryKey: workspaceQueryKey,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<CurrentWorkspace | null> => {
      const { data, error } = await supabase
        .from("workspace_members")
        .select("role, workspaces(id, name, slug, timezone, daily_email_limit)")
        .eq("status", "active")
        .order("created_at", { ascending: true })
        .limit(1);
      if (error) throw error;

      const row = data?.[0];
      const ws = row?.workspaces;
      if (!row || !ws) return null;

      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        role: row.role,
        timezone: ws.timezone,
        dailyEmailLimit: ws.daily_email_limit,
      };
    },
  });
}

const WRITE_ROLES: WorkspaceRole[] = ["owner", "admin", "manager", "sales_rep"];
const MANAGE_ROLES: WorkspaceRole[] = ["owner", "admin", "manager"];

export const canWrite = (role?: WorkspaceRole) => !!role && WRITE_ROLES.includes(role);
export const canManage = (role?: WorkspaceRole) => !!role && MANAGE_ROLES.includes(role);
