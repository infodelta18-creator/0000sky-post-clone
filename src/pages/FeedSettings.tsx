import { useState, useEffect } from "react";
import {
  ArrowLeft, Hash, MessageSquareText, Home, MonitorPlay, Info,
  ChevronRight, Play, TrendingUp, CheckSquare, Square,
  ArrowUp, ArrowDown, Trash2, BellOff, Compass, ListFilter,
  Flame, Heart, Users, Newspaper, Pencil, Palette, Save, Bell
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useTranslation } from "@/i18n/LanguageContext";

const iconMap: Record<string, any> = { compass: Compass, "list-filter": ListFilter, flame: Flame, heart: Heart, users: Users, newspaper: Newspaper, pencil: Pencil, palette: Palette };

export default function FeedSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [subSection, setSubSection] = useState<string | null>(null);

  // Content settings from DB
  const [settings, setSettings] = useState({
    autoplay_media: true,
    enable_trending_topics: true,
    enable_trending_in_discover: true,
    thread_sort: "newest",
    following_feed_replies: true,
    following_feed_reposts: true,
    following_feed_quotes: true,
    external_media_enabled: true,
  });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("content_settings").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (data) {
        const d = data as any;
        setSettings({
          autoplay_media: d.autoplay_media,
          enable_trending_topics: d.enable_trending_topics,
          enable_trending_in_discover: d.enable_trending_in_discover,
          thread_sort: d.thread_sort,
          following_feed_replies: d.following_feed_replies,
          following_feed_reposts: d.following_feed_reposts,
          following_feed_quotes: d.following_feed_quotes,
          external_media_enabled: d.external_media_enabled,
        });
      }
      setLoaded(true);
    });
  }, [user]);

  const persistSetting = async (updates: Record<string, any>) => {
    if (!user) return;
    const { data: existing } = await supabase.from("content_settings").select("id").eq("user_id", user.id).maybeSingle();
    if (existing) {
      await supabase.from("content_settings").update({ ...updates, updated_at: new Date().toISOString() } as any).eq("user_id", user.id);
    } else {
      await supabase.from("content_settings").insert({ user_id: user.id, ...updates } as any);
    }
  };

  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    persistSetting({ [key]: value });
  };

  // Interests
  const { data: allInterests = [] } = useQuery({
    queryKey: ["interests"],
    queryFn: async () => { const { data } = await supabase.from("interests").select("*").order("name"); return data || []; },
  });
  const { data: userInterests = [] } = useQuery({
    queryKey: ["user_interests", user?.id],
    queryFn: async () => { if (!user) return []; const { data } = await supabase.from("user_interests").select("*").eq("user_id", user.id); return data || []; },
    enabled: !!user,
  });
  const userInterestIds = new Set(userInterests.map((ui: any) => ui.interest_id));

  const toggleInterest = async (interestId: string) => {
    if (!user) return;
    if (userInterestIds.has(interestId)) {
      await supabase.from("user_interests").delete().eq("user_id", user.id).eq("interest_id", interestId);
    } else {
      await supabase.from("user_interests").insert({ user_id: user.id, interest_id: interestId });
    }
    queryClient.invalidateQueries({ queryKey: ["user_interests"] });
  };

  // Feeds data
  const { data: allFeeds = [] } = useQuery({ queryKey: ["feeds"], queryFn: async () => { const { data } = await supabase.from("feeds").select("*").order("created_at"); return data || []; } });
  const { data: userFeeds = [] } = useQuery({
    queryKey: ["user_feeds", user?.id],
    queryFn: async () => { if (!user) return []; const { data } = await supabase.from("user_feeds").select("*, feeds(*)").eq("user_id", user.id).order("pin_position"); return data || []; },
    enabled: !!user,
  });

  const defaultFeeds = allFeeds.filter((f: any) => f.is_default);
  const pinnedUserFeeds = userFeeds.filter((uf: any) => uf.is_pinned);
  const savedUserFeeds = userFeeds.filter((uf: any) => !uf.is_pinned);
  const pinnedList = [...defaultFeeds.map((f: any) => ({ ...f, _type: "default" })), ...pinnedUserFeeds.map((uf: any) => ({ ...uf.feeds, _type: "user_pinned", _ufId: uf.id }))];
  const savedList = savedUserFeeds.map((uf: any) => ({ ...uf.feeds, _ufId: uf.id }));

  const movePinned = useMutation({
    mutationFn: async ({ ufId, direction }: { ufId: string; direction: "up" | "down" }) => {
      const idx = pinnedUserFeeds.findIndex((uf: any) => uf.id === ufId);
      if (idx === -1) return;
      const swapIdx = direction === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= pinnedUserFeeds.length) return;
      const current = pinnedUserFeeds[idx]; const swap = pinnedUserFeeds[swapIdx];
      await Promise.all([
        supabase.from("user_feeds").update({ pin_position: swap.pin_position }).eq("id", current.id),
        supabase.from("user_feeds").update({ pin_position: current.pin_position }).eq("id", swap.id),
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["user_feeds"] }),
  });

  const removeFeed = useMutation({
    mutationFn: async (ufId: string) => { await supabase.from("user_feeds").delete().eq("id", ufId); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user_feeds"] }); toast.success("Feed removed"); },
  });

  const togglePin = useMutation({
    mutationFn: async (ufId: string) => {
      const uf = userFeeds.find((u: any) => u.id === ufId);
      if (!uf) return;
      await supabase.from("user_feeds").update({ is_pinned: !uf.is_pinned, pin_position: uf.is_pinned ? 0 : pinnedUserFeeds.length }).eq("id", ufId);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["user_feeds"] }); },
  });

  const renderBack = (title: string, onBack: () => void) => (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
      <button onClick={onBack} className="p-1 rounded-full hover:bg-accent"><ArrowLeft className="h-5 w-5" /></button>
      <h2 className="text-lg font-bold">{title}</h2>
    </div>
  );

  // Sub-section: Manage saved feeds
  if (subSection === "feeds") {
    return (
      <div className="flex flex-col h-full">
        {renderBack("Manage saved feeds", () => setSubSection(null))}
        <ScrollArea className="flex-1">
          <div className="px-4 pt-5 pb-2"><h3 className="text-base font-bold text-foreground">Pinned feeds</h3></div>
          <div className="border-t border-border">
            {pinnedList.map((feed: any) => {
              const Icon = iconMap[feed.icon] || Compass;
              const isDefault = feed._type === "default"; const isUserPinned = feed._type === "user_pinned";
              return (
                <div key={feed.id + (feed._ufId || "")} className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${feed.color} text-white`}><Icon className="h-5 w-5" strokeWidth={2} /></div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-[15px] text-foreground truncate">{feed.name}</p><p className="text-sm text-muted-foreground truncate">by {feed.author_handle}</p></div>
                  <div className="flex items-center gap-1">
                    {isUserPinned && (<>
                      <button onClick={() => movePinned.mutate({ ufId: feed._ufId, direction: "up" })} className="p-2 rounded-full hover:bg-accent text-muted-foreground"><ArrowUp className="h-4 w-4" /></button>
                      <button onClick={() => movePinned.mutate({ ufId: feed._ufId, direction: "down" })} className="p-2 rounded-full hover:bg-accent text-muted-foreground"><ArrowDown className="h-4 w-4" /></button>
                    </>)}
                    <button className={`p-2 rounded-full hover:bg-accent ${isDefault || isUserPinned ? "text-primary" : "text-muted-foreground"}`} onClick={() => { if (isUserPinned && feed._ufId) togglePin.mutate(feed._ufId); }} disabled={isDefault}><Bell className="h-4 w-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
          {savedList.length > 0 && (<>
            <div className="px-4 pt-6 pb-2"><h3 className="text-base font-bold text-foreground">Saved feeds</h3></div>
            <div className="border-t border-border">
              {savedList.map((feed: any) => {
                const Icon = iconMap[feed.icon] || Compass;
                return (
                  <div key={feed._ufId} className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                    <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${feed.color} text-white`}><Icon className="h-5 w-5" strokeWidth={2} /></div>
                    <div className="flex-1 min-w-0"><p className="font-semibold text-[15px] text-foreground truncate">{feed.name}</p><p className="text-sm text-muted-foreground truncate">by {feed.author_handle}</p></div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => removeFeed.mutate(feed._ufId)} className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                      <button onClick={() => togglePin.mutate(feed._ufId)} className="p-2 rounded-full hover:bg-accent text-muted-foreground"><BellOff className="h-4 w-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>)}
          <div className="h-20" />
        </ScrollArea>
      </div>
    );
  }

  // Sub-section: Thread preferences
  if (subSection === "threads") {
    const sortOptions = [
      { value: "newest", label: "Newest replies first" },
      { value: "oldest", label: "Oldest replies first" },
      { value: "most_liked", label: "Most liked first" },
    ];
    return (
      <div className="flex flex-col h-full">
        {renderBack("Thread preferences", () => setSubSection(null))}
        <div className="p-4 space-y-4">
          <p className="text-sm text-muted-foreground">Choose how replies are sorted in threads</p>
          <div className="space-y-1">
            {sortOptions.map((opt) => (
              <button key={opt.value} onClick={() => updateSetting("thread_sort", opt.value)}
                className={`w-full rounded-xl px-4 py-3.5 text-left text-[15px] transition-colors ${settings.thread_sort === opt.value ? "bg-primary/10 text-primary font-medium border border-primary/30" : "border border-border hover:bg-accent"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Sub-section: Following feed preferences
  if (subSection === "following") {
    return (
      <div className="flex flex-col h-full">
        {renderBack("Following feed preferences", () => setSubSection(null))}
        <div className="p-4 space-y-1">
          <p className="text-sm text-muted-foreground mb-4">Choose what content to show in your Following feed</p>
          <div className="flex items-center justify-between py-3.5 border-b border-border">
            <span className="text-[15px] font-medium">Show replies</span>
            <Switch checked={settings.following_feed_replies} onCheckedChange={(v) => updateSetting("following_feed_replies", v)} disabled={!loaded} />
          </div>
          <div className="flex items-center justify-between py-3.5 border-b border-border">
            <span className="text-[15px] font-medium">Show reposts</span>
            <Switch checked={settings.following_feed_reposts} onCheckedChange={(v) => updateSetting("following_feed_reposts", v)} disabled={!loaded} />
          </div>
          <div className="flex items-center justify-between py-3.5 border-b border-border">
            <span className="text-[15px] font-medium">Show quote posts</span>
            <Switch checked={settings.following_feed_quotes} onCheckedChange={(v) => updateSetting("following_feed_quotes", v)} disabled={!loaded} />
          </div>
        </div>
      </div>
    );
  }

  // Sub-section: External media
  if (subSection === "external") {
    return (
      <div className="flex flex-col h-full">
        {renderBack("External media", () => setSubSection(null))}
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between py-3.5">
            <div>
              <p className="text-[15px] font-medium">Show external media</p>
              <p className="text-xs text-muted-foreground mt-1">Allow loading of images and media from external sources in posts</p>
            </div>
            <Switch checked={settings.external_media_enabled} onCheckedChange={(v) => updateSetting("external_media_enabled", v)} disabled={!loaded} />
          </div>
        </div>
      </div>
    );
  }

  // Sub-section: Your interests
  if (subSection === "interests") {
    return (
      <div className="flex flex-col h-full">
        {renderBack("Your interests", () => setSubSection(null))}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            <p className="text-sm text-muted-foreground">Select topics you're interested in to personalize your feed</p>
            {allInterests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No interests available</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {allInterests.map((interest: any) => {
                  const selected = userInterestIds.has(interest.id);
                  return (
                    <button key={interest.id} onClick={() => toggleInterest(interest.id)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${selected ? "bg-primary text-primary-foreground" : "border border-border text-foreground hover:bg-accent"}`}>
                      {interest.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div className="h-20" />
        </ScrollArea>
      </div>
    );
  }

  // Main Content & Media page
  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-accent"><ArrowLeft className="h-5 w-5" /></button>
        <h2 className="text-lg font-bold">{t("settings.content_media")}</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="border-b border-border">
          <SettingsNavRow icon={Hash} label="Manage saved feeds" onClick={() => setSubSection("feeds")} />
          <SettingsNavRow icon={MessageSquareText} label="Thread preferences" onClick={() => setSubSection("threads")} />
          <SettingsNavRow icon={Home} label="Following feed preferences" onClick={() => setSubSection("following")} />
          <SettingsNavRow icon={MonitorPlay} label="External media" onClick={() => setSubSection("external")} />
          <SettingsNavRow icon={Info} label="Your interests" onClick={() => setSubSection("interests")} />
        </div>

        <div className="border-b border-border">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <Play className="h-5 w-5 text-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-foreground">Autoplay videos and GIFs</span>
            </div>
            <Checkbox checked={settings.autoplay_media} onCheckedChange={(c) => updateSetting("autoplay_media", !!c)} disabled={!loaded} />
          </div>
        </div>

        <div className="border-b border-border">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-foreground">Enable trending topics</span>
            </div>
            <Checkbox checked={settings.enable_trending_topics} onCheckedChange={(c) => updateSetting("enable_trending_topics", !!c)} disabled={!loaded} />
          </div>
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-foreground" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-foreground">Enable trending videos in your Discover feed</span>
            </div>
            <Checkbox checked={settings.enable_trending_in_discover} onCheckedChange={(c) => updateSetting("enable_trending_in_discover", !!c)} disabled={!loaded} />
          </div>
        </div>

        <div className="h-20" />
      </ScrollArea>
    </div>
  );
}

function SettingsNavRow({ icon: Icon, label, onClick }: { icon: any; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-accent transition-colors">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-foreground" strokeWidth={1.75} />
        <span className="text-[15px] font-medium text-foreground">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}
