import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Returns the viewer count for a live_status_id.
 * Counts users with last_seen_at within the last 2 minutes.
 */
export function useLiveViewerCount(liveStatusId: string | undefined) {
  return useQuery({
    queryKey: ["liveViewerCount", liveStatusId],
    queryFn: async () => {
      if (!liveStatusId) return 0;
      const cutoff = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("live_viewers")
        .select("*", { count: "exact", head: true })
        .eq("live_status_id", liveStatusId)
        .gte("last_seen_at", cutoff);
      return count || 0;
    },
    enabled: !!liveStatusId,
    refetchInterval: 15000,
  });
}

/**
 * Registers the current user as a viewer and keeps heartbeat alive.
 * Call when user opens the live viewer dialog.
 */
export function useLiveViewerPresence(liveStatusId: string | undefined, active: boolean) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!active || !liveStatusId || !user) return;

    const upsertPresence = async () => {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("live_viewers")
        .upsert(
          { live_status_id: liveStatusId, user_id: user.id, last_seen_at: now } as any,
          { onConflict: "live_status_id,user_id" }
        );
      if (!error) {
        queryClient.invalidateQueries({ queryKey: ["liveViewerCount", liveStatusId] });
      }
    };

    // Initial presence
    upsertPresence();

    // Heartbeat every 30s
    const interval = setInterval(upsertPresence, 30000);

    // Cleanup: remove presence on unmount/close
    return () => {
      clearInterval(interval);
      supabase
        .from("live_viewers")
        .delete()
        .eq("live_status_id", liveStatusId)
        .eq("user_id", user.id)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["liveViewerCount", liveStatusId] });
        });
    };
  }, [active, liveStatusId, user, queryClient]);
}
