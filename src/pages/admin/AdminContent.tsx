import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Trash2, Hash, FileText, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { timeAgo } from "@/lib/time";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function AdminContent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [postSearch, setPostSearch] = useState("");
  const [hashtagSearch, setHashtagSearch] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null);

  // Search posts
  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["admin_posts_search", postSearch],
    queryFn: async () => {
      let query = supabase
        .from("posts")
        .select("id, content, created_at, author_id, parent_id, profiles!posts_author_id_fkey(username, display_name, avatar_url)")
        .is("parent_id", null)
        .order("created_at", { ascending: false })
        .limit(30);
      if (postSearch) query = query.ilike("content", `%${postSearch}%`);
      const { data } = await query;
      return data || [];
    },
  });

  // Hashtags
  const { data: hashtags = [], isLoading: loadingHashtags } = useQuery({
    queryKey: ["admin_hashtags", hashtagSearch],
    queryFn: async () => {
      let query = supabase.from("hashtags").select("*").order("post_count", { ascending: false }).limit(50);
      if (hashtagSearch) query = query.ilike("name", `%${hashtagSearch}%`);
      const { data } = await query;
      return data || [];
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      await supabase.from("posts").delete().eq("id", postId);
    },
    onSuccess: () => {
      toast.success("Post deleted");
      queryClient.invalidateQueries({ queryKey: ["admin_posts_search"] });
      queryClient.invalidateQueries({ queryKey: ["admin_stats"] });
      setDeleteConfirm(null);
    },
  });

  const deleteHashtagMutation = useMutation({
    mutationFn: async (hashtagId: string) => {
      // Remove post_hashtag links first, then the hashtag
      await supabase.from("post_hashtags").delete().eq("hashtag_id", hashtagId);
      await supabase.from("hashtags").delete().eq("id", hashtagId);
    },
    onSuccess: () => {
      toast.success("Hashtag deleted");
      queryClient.invalidateQueries({ queryKey: ["admin_hashtags"] });
    },
  });

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Content Management</h2>

      <Tabs defaultValue="posts">
        <TabsList className="mb-4">
          <TabsTrigger value="posts" className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Posts
          </TabsTrigger>
          <TabsTrigger value="hashtags" className="flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5" /> Hashtags
          </TabsTrigger>
        </TabsList>

        {/* Posts Tab */}
        <TabsContent value="posts">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search posts by content..." value={postSearch} onChange={(e) => setPostSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {loadingPosts ? (
              <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : posts.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No posts found</p>
            ) : (
              posts.map((post: any) => {
                const p = post.profiles as any;
                return (
                  <div key={post.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarImage src={p?.avatar_url} />
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">{p?.display_name?.[0]?.toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold truncate">{p?.display_name}</span>
                          <span className="text-xs text-muted-foreground">@{p?.username} · {timeAgo(post.created_at)}</span>
                        </div>
                        <p className="text-sm mt-1 line-clamp-3">{post.content}</p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <button onClick={() => navigate(`/post/${post.id}`)} className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-accent" title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setDeleteConfirm(post)} className="rounded-full border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </TabsContent>

        {/* Hashtags Tab */}
        <TabsContent value="hashtags">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search hashtags..." value={hashtagSearch} onChange={(e) => setHashtagSearch(e.target.value)} className="pl-9" />
          </div>

          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {loadingHashtags ? (
              <div className="flex justify-center py-8"><div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
            ) : hashtags.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No hashtags found</p>
            ) : (
              hashtags.map((h: any) => (
                <div key={h.id} className="flex items-center gap-3 px-4 py-3">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">#{h.name}</p>
                    <p className="text-xs text-muted-foreground">{h.post_count} posts · Created {timeAgo(h.created_at)}</p>
                  </div>
                  <button onClick={() => navigate(`/hashtag/${h.name}`)} className="rounded-full border border-border p-1.5 text-muted-foreground hover:bg-accent" title="View">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => deleteHashtagMutation.mutate(h.id)} className="rounded-full border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10" title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Delete Post Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this post?</p>
          {deleteConfirm && (
            <div className="rounded-lg bg-muted/50 p-3">
              <p className="text-sm line-clamp-3">{deleteConfirm.content}</p>
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setDeleteConfirm(null)} className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium hover:bg-accent">Cancel</button>
            <button onClick={() => deletePostMutation.mutate(deleteConfirm.id)} disabled={deletePostMutation.isPending}
              className="flex-1 rounded-lg bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50">
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
