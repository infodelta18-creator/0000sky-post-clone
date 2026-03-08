import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Trash2, Eye, Flag, CheckCircle, Ban, AlertTriangle } from "lucide-react";
import { timeAgo } from "@/lib/time";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function AdminModeration() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [suspendDialog, setSuspendDialog] = useState<any>(null);
  const [reason, setReason] = useState("");

  const { data: postReports = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["admin_post_reports"],
    queryFn: async () => {
      const { data } = await supabase
        .from("reports")
        .select("*, reporter:profiles!reports_reporter_id_fkey(username, display_name), post:posts!reports_post_id_fkey(id, content, author_id)")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  const { data: accountReports = [], isLoading: loadingAccounts } = useQuery({
    queryKey: ["admin_account_reports"],
    queryFn: async () => {
      const { data } = await supabase.from("account_reports").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: topicReports = [], isLoading: loadingTopics } = useQuery({
    queryKey: ["admin_topic_reports"],
    queryFn: async () => {
      const { data } = await supabase.from("trending_topic_reports").select("*").order("created_at", { ascending: false }).limit(50);
      return data || [];
    },
  });

  const { data: reportedProfiles = {} } = useQuery({
    queryKey: ["admin_reported_profiles", accountReports],
    queryFn: async () => {
      const ids = [...new Set(accountReports.flatMap((r: any) => [r.reported_user_id, r.reporter_id]))];
      if (ids.length === 0) return {};
      const { data } = await supabase.from("profiles").select("id, username, display_name").in("id", ids);
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => { map[p.id] = p; });
      return map;
    },
    enabled: accountReports.length > 0,
  });

  const { data: topicReporterProfiles = {} } = useQuery({
    queryKey: ["admin_topic_reporter_profiles", topicReports],
    queryFn: async () => {
      const ids = [...new Set(topicReports.map((r: any) => r.reporter_id))];
      if (ids.length === 0) return {};
      const { data } = await supabase.from("profiles").select("id, username, display_name").in("id", ids);
      const map: Record<string, any> = {};
      (data || []).forEach((p: any) => { map[p.id] = p; });
      return map;
    },
    enabled: topicReports.length > 0,
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await supabase.from("posts").delete().eq("id", postId);
    },
    onSuccess: () => {
      toast.success("Post removed");
      queryClient.invalidateQueries({ queryKey: ["admin_post_reports"] });
    },
  });

  const dismissPostReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await supabase.from("reports").delete().eq("id", reportId);
    },
    onSuccess: () => {
      toast.success("Report dismissed");
      queryClient.invalidateQueries({ queryKey: ["admin_post_reports"] });
    },
  });

  const dismissAccountReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await supabase.from("account_reports").delete().eq("id", reportId);
    },
    onSuccess: () => {
      toast.success("Report dismissed");
      queryClient.invalidateQueries({ queryKey: ["admin_account_reports"] });
    },
  });

  const dismissTopicReportMutation = useMutation({
    mutationFn: async (reportId: string) => {
      await supabase.from("trending_topic_reports").delete().eq("id", reportId);
    },
    onSuccess: () => {
      toast.success("Report dismissed");
      queryClient.invalidateQueries({ queryKey: ["admin_topic_reports"] });
    },
  });

  const suspendFromReportMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      await supabase.from("user_suspensions").insert({ user_id: userId, reason, suspended_by: user!.id });
    },
    onSuccess: () => {
      toast.success("User suspended");
      setSuspendDialog(null);
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["admin_suspensions"] });
    },
  });

  const ReportEmptyState = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center py-8 text-muted-foreground">
      <Flag className="h-8 w-8 mb-2" />
      <p>No {label} reports</p>
    </div>
  );

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Content Moderation</h2>
      <Tabs defaultValue="posts">
        <TabsList className="mb-4">
          <TabsTrigger value="posts">Posts ({postReports.length})</TabsTrigger>
          <TabsTrigger value="accounts">Accounts ({accountReports.length})</TabsTrigger>
          <TabsTrigger value="topics">Topics ({topicReports.length})</TabsTrigger>
        </TabsList>

        {/* Post Reports */}
        <TabsContent value="posts">
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {loadingPosts ? (
              <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : postReports.length === 0 ? <ReportEmptyState label="post" /> : (
              postReports.map((r: any) => (
                <div key={r.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm">
                      <span className="font-semibold">@{r.reporter?.username}</span>
                      <span className="text-muted-foreground"> reported · {timeAgo(r.created_at)}</span>
                    </p>
                    <div className="flex gap-1.5">
                      <button onClick={() => navigate(`/post/${r.post?.id}`)} className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-accent" title="View post">
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setSuspendDialog({ userId: r.post?.author_id, context: `Post report: ${r.reason}` })} className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-accent" title="Suspend author">
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => dismissPostReportMutation.mutate(r.id)} className="rounded-full border border-border p-1.5 text-green-500 hover:bg-accent" title="Dismiss report">
                        <CheckCircle className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deletePostMutation.mutate(r.post?.id)} className="rounded-full border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10" title="Delete post">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Reason: {r.reason}</p>
                  <p className="text-sm line-clamp-2 text-foreground bg-muted/30 rounded-lg px-3 py-2">{r.post?.content}</p>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Account Reports */}
        <TabsContent value="accounts">
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {loadingAccounts ? (
              <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : accountReports.length === 0 ? <ReportEmptyState label="account" /> : (
              accountReports.map((r: any) => {
                const reported = (reportedProfiles as any)[r.reported_user_id];
                const reporter = (reportedProfiles as any)[r.reporter_id];
                return (
                  <div key={r.id} className="px-4 py-3 flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">@{reporter?.username || "unknown"}</span>
                        <span className="text-muted-foreground"> reported </span>
                        <span className="font-semibold">@{reported?.username || "unknown"}</span>
                        <span className="text-muted-foreground"> · {timeAgo(r.created_at)}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Reason: {r.reason}</p>
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => setSuspendDialog({ userId: r.reported_user_id, context: `Account report: ${r.reason}` })}
                        className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-accent" title="Suspend user">
                        <Ban className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => dismissAccountReportMutation.mutate(r.id)}
                        className="rounded-full border border-border p-1.5 text-green-500 hover:bg-accent" title="Dismiss">
                        <CheckCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Topic Reports */}
        <TabsContent value="topics">
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {loadingTopics ? (
              <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : topicReports.length === 0 ? <ReportEmptyState label="topic" /> : (
              topicReports.map((r: any) => {
                const reporter = (topicReporterProfiles as any)[r.reporter_id];
                return (
                  <div key={r.id} className="px-4 py-3 flex items-start gap-3">
                    <Flag className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">@{reporter?.username || "unknown"}</span>
                        <span className="text-muted-foreground"> reported topic </span>
                        <span className="font-semibold">#{r.topic_name}</span>
                        <span className="text-muted-foreground"> · {timeAgo(r.created_at)}</span>
                      </p>
                      {r.reason && <p className="text-xs text-muted-foreground mt-1">Reason: {r.reason}</p>}
                    </div>
                    <button onClick={() => dismissTopicReportMutation.mutate(r.id)}
                      className="rounded-full border border-border p-1.5 text-green-500 hover:bg-accent" title="Dismiss">
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Suspend from Report Dialog */}
      <Dialog open={!!suspendDialog} onOpenChange={(v) => !v && setSuspendDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
          </DialogHeader>
          {suspendDialog?.context && (
            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">{suspendDialog.context}</p>
          )}
          <Textarea placeholder="Reason for suspension..." value={reason} onChange={(e) => setReason(e.target.value)} />
          <button
            onClick={() => suspendFromReportMutation.mutate({ userId: suspendDialog.userId, reason })}
            disabled={!reason.trim() || suspendFromReportMutation.isPending}
            className="w-full rounded-lg bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
            Confirm Suspension
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
