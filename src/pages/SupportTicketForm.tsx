import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "@/i18n/LanguageContext";

export default function SupportTicketForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [type, setType] = useState("feedback");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const ticketTypes = [
    { value: "feedback", label: t("support.feedback") },
    { value: "bug", label: t("support.bug") },
    { value: "help", label: t("support.help_question") },
    { value: "appeal", label: t("support.appeal") },
    { value: "other", label: t("support.other") },
  ];

  const { data: myTickets = [] } = useQuery({
    queryKey: ["my_tickets", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("support_tickets").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(10);
      return data || [];
    },
    enabled: !!user,
  });

  const handleSubmit = async () => {
    if (!subject.trim() || !message.trim()) { toast.error(t("common.loading")); return; }
    setSubmitting(true);
    const { error } = await supabase.from("support_tickets").insert({ user_id: user!.id, type, subject: subject.trim(), message: message.trim() });
    setSubmitting(false);
    if (error) { toast.error("Failed to submit ticket"); } else { setSubmitted(true); toast.success(t("support.submitted")); }
  };

  if (submitted) {
    return (
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
          <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-accent"><ChevronLeft className="h-5 w-5" /></button>
          <h2 className="text-lg font-bold">{t("support.title")}</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <h3 className="text-lg font-bold">{t("support.submitted")}</h3>
          <p className="text-sm text-muted-foreground">{t("support.submitted_desc")}</p>
          <Button variant="outline" className="rounded-full mt-2" onClick={() => { setSubmitted(false); setSubject(""); setMessage(""); }}>{t("support.submit_another")}</Button>
        </div>
      </div>
    );
  }

  const statusColor = (s: string) => { if (s === "open") return "text-yellow-500"; if (s === "in_progress") return "text-blue-500"; if (s === "resolved") return "text-green-500"; return "text-muted-foreground"; };

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur-sm">
        <button onClick={() => navigate(-1)} className="p-1 rounded-full hover:bg-accent"><ChevronLeft className="h-5 w-5" /></button>
        <h2 className="text-lg font-bold">{t("support.help_feedback")}</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("support.type")}</label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>{ticketTypes.map((tt) => <SelectItem key={tt.value} value={tt.value}>{tt.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("support.subject")}</label>
            <Input placeholder={t("support.subject_placeholder")} value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={100} className="rounded-xl" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">{t("support.message")}</label>
            <Textarea placeholder={t("support.message_placeholder")} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={1000} rows={5} className="rounded-xl resize-none" />
            <p className="text-xs text-muted-foreground text-right">{message.length}/1000</p>
          </div>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full rounded-full gap-2">
            <Send className="h-4 w-4" />{submitting ? t("support.submitting") : t("support.submit")}
          </Button>
          {myTickets.length > 0 && (
            <div className="pt-4">
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">{t("support.your_tickets")}</h3>
              <div className="space-y-2">
                {myTickets.map((ticket: any) => (
                  <div key={ticket.id} className="rounded-xl border border-border p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{ticket.subject}</p>
                      <span className={`text-xs font-medium capitalize ${statusColor(ticket.status)}`}>{ticket.status.replace("_", " ")}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{ticket.type} · {new Date(ticket.created_at).toLocaleDateString()}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{ticket.message}</p>
                    {ticket.admin_notes ? (
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-2.5 mt-1">
                        <p className="text-xs font-semibold text-primary mb-0.5">{t("support.admin_response")}</p>
                        <p className="text-xs text-foreground leading-relaxed">{ticket.admin_notes}</p>
                      </div>
                    ) : <p className="text-xs text-muted-foreground italic">{t("support.awaiting")}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
