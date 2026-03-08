import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, FileText, Flag, MessageSquareText, UserCheck, UserX, TrendingUp, Activity, Hash, Heart } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import { timeAgo } from "@/lib/time";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";

export default function AdminOverview() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin_stats"],
    queryFn: async () => {
      const [users, posts, reports, accountReports, tickets, suspensions, verified, hashtags, follows, likes] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase.from("reports").select("*", { count: "exact", head: true }),
        supabase.from("account_reports").select("*", { count: "exact", head: true }),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("user_suspensions").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("verified_users").select("*", { count: "exact", head: true }),
        supabase.from("hashtags").select("*", { count: "exact", head: true }),
        supabase.from("follows").select("*", { count: "exact", head: true }),
        supabase.from("likes").select("*", { count: "exact", head: true }),
      ]);
      return {
        users: users.count || 0,
        posts: posts.count || 0,
        reports: (reports.count || 0) + (accountReports.count || 0),
        openTickets: tickets.count || 0,
        suspendedUsers: suspensions.count || 0,
        verifiedUsers: verified.count || 0,
        hashtags: hashtags.count || 0,
        follows: follows.count || 0,
        likes: likes.count || 0,
      };
    },
  });

  // User growth chart (last 30 days)
  const { data: userGrowth = [] } = useQuery({
    queryKey: ["admin_user_growth"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase.from("profiles").select("created_at").gte("created_at", thirtyDaysAgo).order("created_at");
      if (!data) return [];
      const dayMap: Record<string, number> = {};
      data.forEach((u) => {
        const day = new Date(u.created_at).toLocaleDateString("en", { month: "short", day: "numeric" });
        dayMap[day] = (dayMap[day] || 0) + 1;
      });
      return Object.entries(dayMap).map(([date, count]) => ({ date, users: count }));
    },
  });

  // Post activity chart (last 14 days)
  const { data: postActivity = [] } = useQuery({
    queryKey: ["admin_post_activity"],
    queryFn: async () => {
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase.from("posts").select("created_at").gte("created_at", fourteenDaysAgo).order("created_at");
      if (!data) return [];
      const dayMap: Record<string, number> = {};
      data.forEach((p) => {
        const day = new Date(p.created_at).toLocaleDateString("en", { month: "short", day: "numeric" });
        dayMap[day] = (dayMap[day] || 0) + 1;
      });
      return Object.entries(dayMap).map(([date, count]) => ({ date, posts: count }));
    },
  });

  // Recent signups
  const { data: recentUsers = [] } = useQuery({
    queryKey: ["admin_recent_users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  // Top hashtags
  const { data: topHashtags = [] } = useQuery({
    queryKey: ["admin_top_hashtags"],
    queryFn: async () => {
      const { data } = await supabase.from("hashtags").select("*").order("post_count", { ascending: false }).limit(8);
      return data || [];
    },
  });

  const cards = [
    { label: "Total Users", value: stats?.users, icon: Users, color: "text-primary" },
    { label: "Total Posts", value: stats?.posts, icon: FileText, color: "text-primary" },
    { label: "Open Reports", value: stats?.reports, icon: Flag, color: "text-destructive" },
    { label: "Open Tickets", value: stats?.openTickets, icon: MessageSquareText, color: "text-[hsl(var(--bsky-repost))]" },
    { label: "Verified Users", value: stats?.verifiedUsers, icon: UserCheck, color: "text-primary" },
    { label: "Suspended", value: stats?.suspendedUsers, icon: UserX, color: "text-destructive" },
    { label: "Total Likes", value: stats?.likes, icon: Heart, color: "text-destructive" },
    { label: "Connections", value: stats?.follows, icon: Activity, color: "text-primary" },
    { label: "Hashtags", value: stats?.hashtags, icon: Hash, color: "text-muted-foreground" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Dashboard Overview</h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon className={`h-5 w-5 ${color}`} />
              <span className="text-sm text-muted-foreground">{label}</span>
            </div>
            <p className="text-2xl font-bold">
              {isLoading ? <span className="h-4 w-12 animate-pulse rounded bg-muted inline-block" /> : (value ?? 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {[
          { label: "Manage Users", path: "/admin/users" },
          { label: "View Reports", path: "/admin/moderation" },
          { label: "Content", path: "/admin/content" },
          { label: "Support Tickets", path: "/admin/support" },
          { label: "Verification", path: "/admin/verification" },
        ].map((a) => (
          <button key={a.path} onClick={() => navigate(a.path)}
            className="rounded-full border border-border px-4 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            {a.label}
          </button>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* User Growth */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">User Growth (30 days)</h3>
          </div>
          {userGrowth.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={userGrowth}>
                <defs>
                  <linearGradient id="userFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fill="url(#userFill)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
          )}
        </div>

        {/* Post Activity */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Post Activity (14 days)</h3>
          </div>
          {postActivity.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={postActivity}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} width={30} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Bar dataKey="posts" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">No data yet</p>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Signups */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Recent Signups</h3>
            <button onClick={() => navigate("/admin/users")} className="text-xs text-primary hover:underline">View all</button>
          </div>
          {recentUsers.map((u: any) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-2.5">
              <Avatar className="h-8 w-8">
                <AvatarImage src={u.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{u.display_name?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{u.display_name}</p>
                <p className="text-xs text-muted-foreground">@{u.username}</p>
              </div>
              <span className="text-xs text-muted-foreground">{timeAgo(u.created_at)}</span>
            </div>
          ))}
        </div>

        {/* Top Hashtags */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold">Top Hashtags</h3>
            <button onClick={() => navigate("/admin/content")} className="text-xs text-primary hover:underline">Manage</button>
          </div>
          {topHashtags.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">No hashtags yet</p>
          ) : (
            topHashtags.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm font-medium">#{h.name}</span>
                <span className="text-xs text-muted-foreground">{h.post_count} posts</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
