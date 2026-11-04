"use client";

import { forwardRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Send } from "lucide-react";

interface RagInputProps {
  disabled: boolean;
  onSend: (message: string) => void;
}

export const RagInput = forwardRef<HTMLTextAreaElement, RagInputProps>(
  function RagInput({ disabled, onSend }, ref) {
    const [value, setValue] = useState("");

    const submit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const message = value.trim();
      if (!message || disabled) return;
      onSend(message);
      setValue("");
    };

    const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        event.currentTarget.form?.requestSubmit();
      }
    };

    return (
      <form onSubmit={submit} className="flex items-end gap-2 border-t border-border bg-white p-3">
        <label htmlFor="rag-message-input" className="sr-only">Ask the gym assistant</label>
        <textarea
          ref={ref}
          id="rag-message-input"
          rows={1}
          maxLength={1000}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask about your gym..."
          disabled={disabled}
          className="max-h-32 min-h-11 flex-1 resize-y rounded-xl border border-border bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          aria-label="Send message"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white transition hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    );
  },
);
