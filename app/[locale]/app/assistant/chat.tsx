"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bot, Send, User } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { sendChatAction } from "@/app/actions/ai";

type Msg = { role: "user" | "assistant"; content: string; toolsUsed?: string[] };

export function Chat({ conversationId, initial, suggestions }: { conversationId: string | null; initial: Msg[]; suggestions: string[] }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [id, setId] = useState(conversationId);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);

  const send = (value: string) => {
    const message = value.trim();
    if (!message || pending) return;
    setError(null);
    setText("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    start(async () => {
      const r = await sendChatAction(id, message, locale);
      if (!r.ok) {
        setError(t(r.error));
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: r.reply, toolsUsed: r.toolsUsed }]);
      if (!id) {
        setId(r.conversationId);
        router.replace(`/${locale}/app/assistant?c=${r.conversationId}`, { scroll: false });
      }
      requestAnimationFrame(() => end.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
    });
  };

  return (
    <div className="flex min-h-[28rem] flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite" aria-busy={pending}>
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-600">{t("assistant.empty")}</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm hover:bg-ink-50">{s}</button>)}
            </div>
          </div>
        ) : null}
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            <span aria-hidden className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${m.role === "user" ? "bg-ink-200 text-ink-800" : "bg-brand-700 text-white"}`}>
              {m.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
            </span>
            <div className={`max-w-[80%] rounded-[var(--radius-card)] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "bg-ink-900 text-white" : "border border-ink-200 bg-white text-ink-900"}`}>
              <span className="sr-only">{m.role === "user" ? t("assistant.you") : t("assistant.name")}: </span>
              {m.content}
              {m.toolsUsed?.length ? <div className="mt-2 text-xs text-ink-600">{t("assistant.sources")}: {[...new Set(m.toolsUsed)].map((x) => t(`assistant.tools.${x}`)).join(" · ")}</div> : null}
            </div>
          </div>
        ))}
        {pending ? <p className="text-sm text-ink-600">{t("assistant.thinking")}</p> : null}
        <div ref={end} />
      </div>
      {error ? <p role="alert" className="mx-4 mb-2 rounded-md bg-danger-100 px-3 py-2 text-sm text-danger-700">{error}</p> : null}
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex gap-2 border-t border-ink-100 p-3">
        <label htmlFor="chat-input" className="sr-only">{t("assistant.placeholder")}</label>
        <textarea id="chat-input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(text); } }}
          rows={2} maxLength={2000} placeholder={t("assistant.placeholder")} className="flex-1 resize-none rounded-[var(--radius-control)] border border-ink-300 px-3 py-2 text-sm focus:border-ink-900 focus:outline-none" />
        <button type="submit" disabled={pending || !text.trim()} className="inline-flex items-center gap-1.5 self-end rounded-[var(--radius-control)] bg-brand-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          <Send aria-hidden className="size-4 rtl:-scale-x-100" />{t("assistant.send")}
        </button>
      </form>
      <p className="px-4 pb-3 text-xs text-ink-600">{t("assistant.disclaimer")}</p>
    </div>
  );
}
