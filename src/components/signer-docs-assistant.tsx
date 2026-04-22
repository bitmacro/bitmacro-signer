"use client";

import { useAppLocale } from "@/components/intl-client-provider";
import { getSignerAssistantUi } from "@/lib/signer-assistant-ui";
import { useCallback, useEffect, useId, useRef, useState } from "react";

type Source = { titulo: string; fonte: string; similarity: number };

/** Must exceed 2× server OpenAI timeout (embed + chat); server default 90s each. */
const CHAT_FETCH_MS = 200_000;

export function SignerDocsAssistant() {
  const { locale } = useAppLocale();
  const panelId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<Source[] | null>(null);
  const [unanswered, setUnanswered] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifyDone, setNotifyDone] = useState(false);
  const [notifyError, setNotifyError] = useState<string | null>(null);

  const ui = getSignerAssistantUi(locale);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  async function submit() {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    setError(null);
    setAnswer(null);
    setSources(null);
    setUnanswered(false);
    setPendingQuestion("");
    setNotifyEmail("");
    setNotifyDone(false);
    setNotifyError(null);
    const ac = new AbortController();
    const abortTimer = setTimeout(() => ac.abort(), CHAT_FETCH_MS);
    try {
      const res = await fetch("/api/help/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, locale, produto: "signer" }),
        signal: ac.signal,
      });
      const text = await res.text();
      let data: {
        error?: string;
        answer?: string;
        sources?: Source[];
        unanswered?: boolean;
      };
      try {
        data = text ? (JSON.parse(text) as typeof data) : {};
      } catch {
        setError(ui.errorBadResponse);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? `${res.status}`);
        return;
      }
      setAnswer(data.answer ?? "");
      setSources(data.sources ?? []);
      if (data.unanswered === true) {
        setUnanswered(true);
        setPendingQuestion(q);
      }
    } catch (e) {
      const aborted =
        e instanceof DOMException
          ? e.name === "AbortError"
          : e instanceof Error && e.name === "AbortError";
      setError(aborted ? ui.errorTimeout : ui.errorNetwork);
    } finally {
      clearTimeout(abortTimer);
      setLoading(false);
    }
  }

  async function submitNotify() {
    if (!pendingQuestion || notifyLoading || notifyDone) return;
    setNotifyLoading(true);
    setNotifyError(null);
    try {
      const res = await fetch("/api/help/unanswered-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: pendingQuestion,
          email: notifyEmail.trim(),
          locale,
          produto: "signer",
        }),
      });
      const data = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setNotifyError(data.error ?? `${res.status}`);
        return;
      }
      setNotifyDone(true);
      setUnanswered(false);
    } catch {
      setNotifyError(getSignerAssistantUi(locale).errorNetwork);
    } finally {
      setNotifyLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-[80] flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card/95 text-primary shadow-lg backdrop-blur-md transition-all hover:scale-[1.03] hover:border-primary/50 hover:shadow-primary/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        title={open ? ui.close : ui.openAssistant}
      >
        {open ? (
          <span className="text-2xl leading-none text-foreground" aria-hidden>
            ×
          </span>
        ) : (
          <span className="text-xl font-semibold leading-none" aria-hidden>
            ?
          </span>
        )}
        <span className="sr-only">{ui.srToggle}</span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-modal="true"
          aria-label={ui.dialogLabel}
          className="fixed bottom-24 right-6 z-[80] flex w-[min(100vw-2rem,22rem)] sm:w-[min(100vw-3rem,26rem)] flex-col overflow-hidden rounded-2xl border border-border bg-popover/98 shadow-2xl backdrop-blur-xl"
        >
          <div className="border-b border-border px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              {ui.title}
            </p>
            <p className="text-sm text-muted-foreground">{ui.subtitle}</p>
          </div>

          <div className="flex flex-1 flex-col gap-3 p-4">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              placeholder={ui.placeholder}
              rows={3}
              disabled={loading}
              className="bm-input w-full resize-none rounded-xl border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary/30"
            />
            <button
              type="button"
              onClick={() => void submit()}
              disabled={loading || !question.trim()}
              className="rounded-xl bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? ui.thinking : ui.send}
            </button>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            {answer ? (
              <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
                <p className="whitespace-pre-wrap text-foreground/95">{answer}</p>
              </div>
            ) : null}

            {unanswered && !notifyDone ? (
              <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/25 p-3">
                <input
                  type="email"
                  autoComplete="email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder={ui.notifyEmailPlaceholder}
                  disabled={notifyLoading}
                  className="bm-input w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => void submitNotify()}
                  disabled={notifyLoading}
                  className="rounded-lg border border-primary/40 bg-primary/15 py-2 text-sm font-semibold text-primary transition hover:bg-primary/25 disabled:opacity-50"
                >
                  {notifyLoading ? ui.notifySending : ui.notifyMe}
                </button>
                {notifyError ? (
                  <p className="text-xs text-destructive" role="alert">
                    {notifyError}
                  </p>
                ) : null}
              </div>
            ) : null}

            {notifyDone ? (
              <p className="text-sm text-muted-foreground">{ui.notifyThanks}</p>
            ) : null}

            {sources && sources.length > 0 ? (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer text-primary/90">
                  {ui.learnMore}
                </summary>
                <ul className="mt-2 space-y-1.5 pl-1">
                  {sources.map((s, i) => (
                    <li key={`src-${s.titulo}-${i}`} className="text-foreground/75">
                      {s.titulo}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
