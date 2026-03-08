import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Ban, Search, ShieldOff, Eye, Calendar, FileText, Users as UsersIcon, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { timeAgo } from "@/lib/time";
import VerifiedBadge from "@/components/VerifiedBadge";

export default function AdminUsers() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [suspendDialog, setSuspendDialog] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [suspendDuration, setSuspendDuration] = useState("permanent");
  const [detailUser, setDetailUser] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin_users", search],
    queryFn: async () => {
      let query = supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
      if (search) query = query.or(`username.ilike.%${search}%,display_name.ilike.%${search}%`);
      const { data } = await query;
      return data || [];
    },
  });

  const { data: suspensions = [] } = useQuery({
    queryKey: ["admin_suspensions"],
    queryFn: async () => {
      const { data } = await supabase.from("user_suspensions").select("*").eq("is_active", true);
      return data || [];
    },
  });

  const { data: verifiedSet = new Set<string>() } = useQuery({
    queryKey: ["admin_verified_ids"],
    queryFn: async () => {
      const { data } = await supabase.from("verified_users").select("user_id");
      return new Set((data || []).map((v: any) => v.user_id));
    },
  });

  const suspendedMap = new Map(suspensions.map((s: any) => [s.user_id, s]));

  // User detail stats
  const { data: userStats } = useQuery({
    queryKey: ["admin_user_stats", detailUser?.id],
    queryFn: async () => {
      if (!detailUser) return null;
      const [posts, followers, following, likes] = await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("author_id", detailUser.id).is("parent_id", null),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", detailUser.id),
        supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", detailUser.id),
        supabase.from("likes").select("*", { count: "exact", head: true }).eq("user_id", detailUser.id),
      ]);
      return { posts: posts.count || 0, followers: followers.count || 0, following: following.count || 0, likes: likes.count || 0 };
    },
    enabled: !!detailUser,
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ userId, reason, duration }: { userId: string; reason: string; duration: string }) => {
      const insert: any = { user_id: userId, reason, suspended_by: user!.id };
      if (duration !== "permanent") {
        const days = parseInt(duration);
        insert.expires_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      }
      await supabase.from("user_suspensions").insert(insert);
    },
    onSuccess: () => {
      toast.success("User suspended");
      queryClient.invalidateQueries({ queryKey: ["admin_suspensions"] });
      queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
      setSuspendDialog(null);
      setReason("");
      setSuspendDuration("permanent");
    },
  });

  const unsuspendMutation = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from("user_suspensions").update({ is_active: false }).eq("user_id", userId).eq("is_active", true);
    },
    onSuccess: () => {
      toast.success("User unsuspended");
      queryClient.invalidateQueries({ queryKey: ["admin_suspensions"] });
      queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke("delete-account", {
        body: { user_id: userId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Account deleted");
      queryClient.invalidateQueries({ queryKey: ["admin_users"] });
      queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
      setDeleteConfirm(null);
    },
    onError: () => toast.error("Failed to delete account. Edge function may not support admin deletion."),
  });

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">User Management</h2>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search users by name or username..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="divide-y divide-border rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : users.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No users found</p>
        ) : (
          users.map((u: any) => {
            const suspension = suspendedMap.get(u.id);
            const isSuspended = !!suspension;
            const isVerified = (verifiedSet as Set<string>).has(u.id);
            return (
              <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={u.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {u.display_name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate flex items-center gap-1">
                    {u.display_name}
                    {isVerified && <VerifiedBadge userId={u.id} />}
                    {isSuspended && <span className="text-[10px] font-medium text-destructive bg-destructive/10 px-1.5 rounded">SUSPENDED</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">@{u.username} · Joined {timeAgo(u.created_at)}</p>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => setDetailUser(u)} className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-accent" title="View details">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  {isSuspended ? (
                    <button onClick={() => unsuspendMutation.mutate(u.id)}
                      className="flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20">
                      <ShieldOff className="h-3 w-3" /> Unsuspend
                    </button>
                  ) : u.id !== user?.id ? (
                    <button onClick={() => setSuspendDialog(u)}
                      className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent">
                      <Ban className="h-3 w-3" /> Suspend
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!detailUser} onOpenChange={(v) => !v && setDetailUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={detailUser.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground">{detailUser.display_name?.[0]?.toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold flex items-center gap-1">{detailUser.display_name}
                    {(verifiedSet as Set<string>).has(detailUser.id) && <VerifiedBadge userId={detailUser.id} />}
                  </p>
                  <p className="text-sm text-muted-foreground">@{detailUser.username}</p>
                </div>
              </div>

              {detailUser.bio && <p className="text-sm text-muted-foreground">{detailUser.bio}</p>}

              <div className="grid grid-cols-2 gap-2 text-center">
                {[
                  { label: "Posts", value: userStats?.posts, icon: FileText },
                  { label: "Followers", value: userStats?.followers, icon: UsersIcon },
                  { label: "Following", value: userStats?.following, icon: UsersIcon },
                  { label: "Likes", value: userStats?.likes, icon: Calendar },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border p-2.5">
                    <p className="text-lg font-bold">{s.value ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>Joined: {new Date(detailUser.created_at).toLocaleDateString()}</p>
                {detailUser.birthday && <p>Birthday: {detailUser.birthday}</p>}
                <p>User ID: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{detailUser.id}</code></p>
              </div>

              {suspendedMap.has(detailUser.id) && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <p className="text-xs font-semibold text-destructive">Currently Suspended</p>
                  <p className="text-xs text-muted-foreground mt-1">Reason: {suspendedMap.get(detailUser.id)?.reason}</p>
                  {suspendedMap.get(detailUser.id)?.expires_at && (
                    <p className="text-xs text-muted-foreground">Expires: {new Date(suspendedMap.get(detailUser.id).expires_at).toLocaleDateString()}</p>
                  )}
                </div>
              )}

              {detailUser.id !== user?.id && (
                <button onClick={() => { setDetailUser(null); setDeleteConfirm(detailUser); }}
                  className="w-full rounded-lg border border-destructive/30 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 flex items-center justify-center gap-2">
                  <Trash2 className="h-4 w-4" /> Delete Account
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={!!suspendDialog} onOpenChange={(v) => !v && setSuspendDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend @{suspendDialog?.username}</DialogTitle>
          </DialogHeader>
          <Textarea placeholder="Reason for suspension..." value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="space-y-2">
            <label className="text-sm font-medium">Duration</label>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "1 Day", value: "1" },
                { label: "7 Days", value: "7" },
                { label: "30 Days", value: "30" },
                { label: "Permanent", value: "permanent" },
              ].map((d) => (
                <button key={d.value} onClick={() => setSuspendDuration(d.value)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${suspendDuration === d.value ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-accent"}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => suspendMutation.mutate({ userId: suspendDialog.id, reason, duration: suspendDuration })}
            disabled={!reason.trim()}
            className="w-full rounded-lg bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
            Confirm Suspension
          </button>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to permanently delete <strong>@{deleteConfirm?.username}</strong>'s account? This action cannot be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setDeleteConfirm(null)}
              className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-accent">
              Cancel
            </button>
            <button onClick={() => deleteAccountMutation.mutate(deleteConfirm.id)}
              disabled={deleteAccountMutation.isPending}
              className="flex-1 rounded-lg bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
              Delete Permanently
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
