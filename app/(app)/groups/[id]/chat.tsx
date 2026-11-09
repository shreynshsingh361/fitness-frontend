"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button, Card, ErrorBanner, Skeleton, inputClass } from "@/components/ui";
import { api, messageOf } from "@/lib/api";
import { formatMoment } from "@/lib/dates";
import { useApiData, useToday } from "@/lib/hooks";
import type { Group, Message } from "@/lib/types";

const POLL_MS = 5000;

export function Chat({ group }: { group: Group }) {
  const today = useToday();
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const messages = useApiData(`chat:${group.id}`, () =>
    api<{ chat_enabled: boolean; items: Message[] }>(`/groups/${group.id}/messages`),
  );
  const { reload } = messages;

  // New messages are fetched every few seconds while this tab is open. Simple, and
  // enough for a group chat; a live connection would be a later improvement.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) reload();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [reload]);

  const count = messages.data?.items.length ?? 0;
  useEffect(() => {
    if (count > 0) bottom.current?.scrollIntoView({ block: "nearest" });
  }, [count]);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      await api<Message>(`/groups/${group.id}/messages`, { method: "POST", body: { body } });
      setBody("");
      reload();
    } catch (err) {
      setError(messageOf(err));
    } finally {
      setSending(false);
    }
  }

  async function remove(message: Message) {
    setError(null);
    try {
      await api(`/groups/${group.id}/messages/${message.id}`, { method: "DELETE" });
      reload();
    } catch (err) {
      setError(messageOf(err));
    }
  }

  if (messages.data && !messages.data.chat_enabled) {
    return (
      <Card title="Chat">
        <p className="text-sm text-slate-500 dark:text-slate-400">An admin has turned chat off for this group.</p>
      </Card>
    );
  }

  return (
    <Card title="Chat">
      <div className="space-y-3">
        <ErrorBanner message={error ?? messages.error} />
        {!messages.data && !messages.error && <Skeleton className="h-32" />}
        {messages.data && messages.data.items.length === 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400">No messages yet. Say hello!</p>
        )}

        <ul className="max-h-96 space-y-3 overflow-y-auto">
          {messages.data?.items.map((m) => (
            <li key={m.id} className="text-sm">
              <div className="flex items-baseline gap-2">
                <span className="font-semibold">{m.mine ? "You" : m.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{formatMoment(m.created_at, today)}</span>
                {!m.removed && (m.mine || group.my_role === "admin") && (
                  <button
                    type="button"
                    onClick={() => remove(m)}
                    aria-label={`Remove message from ${m.mine ? "you" : m.name}`}
                    className="text-xs text-slate-500 hover:text-red-600 hover:underline dark:text-slate-400"
                  >
                    Remove
                  </button>
                )}
              </div>
              {m.removed ? (
                <p className="text-slate-500 italic dark:text-slate-400">This message was removed.</p>
              ) : (
                <p className="break-words whitespace-pre-wrap">{m.body}</p>
              )}
            </li>
          ))}
          <div ref={bottom} />
        </ul>

        <form onSubmit={send} className="flex gap-2">
          <input
            aria-label="Message"
            className={`${inputClass} min-w-0 flex-1`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={1000}
            placeholder="Write a message"
            required
          />
          <Button type="submit" className="shrink-0" disabled={sending || body.trim() === ""}>
            Send
          </Button>
        </form>
      </div>
    </Card>
  );
}
