import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";
import { appPage, orNotFound } from "@/server/page";
import { chatAvailability, getConversation, listConversations } from "@/server/services/ai-chat";
import { formatDateTime } from "@/lib/i18n/format";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { InlineAction } from "@/components/inline-action";
import { deleteConversationAction } from "@/app/actions/ai";
import { Chat } from "./chat";

export default async function AssistantPage({ params, searchParams }: { params: Promise<{ locale: Locale }>; searchParams: Promise<{ c?: string }> }) {
  const { locale, ctx, d } = await appPage(params);
  const { c } = await searchParams;
  const av = await chatAvailability(ctx);
  if (!av.platform || !av.organization || !av.allowedRole) {
    return (
      <>
        <PageHeader title={d.assistant.title} description={d.assistant.lead} />
        <Card><CardBody className="space-y-2 text-sm text-ink-700">
          <p>{!av.platform ? d.assistant.platformOff : !av.allowedRole ? d.errors.forbiddenPage : d.assistant.orgOff}</p>
          {av.platform && !av.organization && ctx.permissions.has("settings.manage") ? <Link className="font-medium text-brand-700 underline" href={`/${locale}/app/settings`}>{d.nav.settings}</Link> : null}
        </CardBody></Card>
      </>
    );
  }
  const [conversations, current] = await Promise.all([listConversations(ctx), c ? orNotFound(getConversation(ctx, c)) : Promise.resolve(null)]);
  const suggestions = d.assistant.suggestions.split("|");
  return (
    <>
      {av.demo ? <p role="status" className="mb-4 rounded-[var(--radius-card)] border border-warning-700/30 bg-warning-100 px-4 py-2 text-sm font-medium text-warning-700">{d.assistant.demoBanner}</p> : null}
      <PageHeader title={d.assistant.title} description={d.assistant.lead} actions={<Link className="text-sm font-medium text-brand-700 hover:underline" href={`/${locale}/app/assistant`}>{d.assistant.newChat}</Link>} />
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <Card className="order-2 lg:order-1">
          <CardHeader title={d.assistant.history} />
          <ul className="divide-y divide-ink-100 text-sm">
            {conversations.length === 0 ? <li className="px-4 py-3 text-ink-600">—</li> : conversations.map((x) => (
              <li key={x.id} className={x.id === current?.id ? "bg-ink-50" : ""}>
                <Link href={`/${locale}/app/assistant?c=${x.id}`} className="block px-4 py-2 hover:bg-ink-50"><span className="line-clamp-2">{x.title}</span><span className="text-xs text-ink-600">{formatDateTime(x.updatedAt, locale, ctx.org.timezone)}</span></Link>
              </li>
            ))}
          </ul>
          {current ? <CardBody className="border-t border-ink-100"><InlineAction action={deleteConversationAction} hidden={{ conversationId: current.id }} label={d.assistant.delete} variant="danger" size="sm" /></CardBody> : null}
        </Card>
        <Card className="order-1 lg:order-2">
          <Chat key={current?.id ?? "new"} conversationId={current?.id ?? null} suggestions={suggestions}
            initial={(current?.messages ?? []).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content, toolsUsed: m.toolsUsed }))} />
        </Card>
      </div>
    </>
  );
}
