"use client";

import { useEffect, useRef } from "react";
import { Bot, LoaderCircle, RotateCcw, X } from "lucide-react";
import { useRagChat } from "@/hooks/use-rag-chat";
import { RagInput } from "./rag-input";
import { RagMessageView } from "./rag-message";

const suggestedPrompts = [
  "What are your opening hours?",
  "Which trainers are available on weekends?",
  "How much is the annual membership?",
];

interface RagAssistantProps {
  open: boolean;
  onClose: () => void;
  onUnreadChange: (unread: boolean) => void;
}

export function RagAssistant({ open, onClose, onUnreadChange }: RagAssistantProps) {
  const { messages, status, error, send, retry } = useRagChat();
  const panelRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastAssistantId = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    inputRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  useEffect(() => {
    const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    if (!latestAssistant || latestAssistant.id === lastAssistantId.current) return;
    lastAssistantId.current = latestAssistant.id;
    if (!open) onUnreadChange(true);
  }, [messages, onUnreadChange, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-slate-950/35"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="rag-assistant-title"
        className="absolute inset-0 flex h-full w-full flex-col bg-white shadow-2xl sm:inset-y-4 sm:right-4 sm:left-auto sm:h-[calc(100%-2rem)] sm:w-[400px] sm:rounded-2xl sm:border sm:border-border"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-3.5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-light text-primary">
              <Bot className="h-5 w-5" />
            </span>
            <div>
              <h2 id="rag-assistant-title" className="text-sm font-semibold text-slate-900">
                Gym AI Assistant
              </h2>
              <p className="text-xs text-slate-500">Powered by your gym data</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close gym AI assistant"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div
          ref={scrollRef}
          aria-live="polite"
          aria-relevant="additions"
          className="flex-1 space-y-4 overflow-y-auto bg-slate-50/70 p-4"
        >
          {messages.length === 0 && (
            <div className="space-y-4">
              <div className="rounded-2xl rounded-bl-md border border-border bg-white p-4 text-sm leading-6 text-slate-700">
                Hi! Ask me about gym information in your records.
              </div>
              <div className="flex flex-col items-start gap-2">
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void send(prompt)}
                    disabled={status === "loading"}
                    className="rounded-full border border-border bg-white px-3 py-2 text-left text-xs text-slate-600 transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => <RagMessageView key={message.id} message={message} />)}

          {status === "loading" && (
            <div className="flex items-center gap-2 text-xs text-slate-500" role="status" aria-label="Assistant is typing">
              <LoaderCircle className="h-4 w-4 animate-spin text-primary" />
              <span>Gym AI is thinking...</span>
            </div>
          )}

          {status === "error" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => void retry()}
                className="mt-2 inline-flex items-center gap-1.5 font-medium underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Retry
              </button>
            </div>
          )}
        </div>

        <RagInput ref={inputRef} disabled={status === "loading"} onSend={(message) => void send(message)} />
      </section>
    </div>
  );
}
