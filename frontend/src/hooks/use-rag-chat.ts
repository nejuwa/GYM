"use client";

import { useCallback, useState } from "react";
import { sendRagMessage, type RagRoute, type RagSource } from "@/lib/api/rag";

export interface RagMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: RagSource[];
  route?: RagRoute;
  confidence?: number;
}

type ChatStatus = "idle" | "loading" | "error";

export function useRagChat() {
  const [messages, setMessages] = useState<RagMessage[]>([]);
  const [status, setStatus] = useState<ChatStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);

  const requestAnswer = useCallback(async (question: string, appendUser: boolean) => {
    if (appendUser) {
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "user", content: question },
      ]);
    }

    setLastQuestion(question);
    setStatus("loading");
    setError(null);
    try {
      const response = await sendRagMessage(question);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.answer,
          sources: response.sources,
          route: response.route,
          confidence: response.confidence,
        },
      ]);
      setStatus("idle");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The assistant could not answer. Please try again.",
      );
      setStatus("error");
    }
  }, []);

  const send = useCallback(async (message: string) => {
    const question = message.trim();
    if (!question || status === "loading") return;
    await requestAnswer(question, true);
  }, [requestAnswer, status]);

  const retry = useCallback(async () => {
    if (!lastQuestion || status === "loading") return;
    await requestAnswer(lastQuestion, false);
  }, [lastQuestion, requestAnswer, status]);

  return {
    messages,
    status,
    error,
    send,
    retry,
  };
}
