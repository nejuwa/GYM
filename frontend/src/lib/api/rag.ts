import { apiFetch } from "./client";

export type RagRoute =
  | "DATABASE_ONLY"
  | "DOCUMENT_ONLY"
  | "HYBRID"
  | "SMALL_TALK"
  | "OUT_OF_SCOPE";

export interface RagSource {
  type: "database" | "document";
  table?: string;
  file?: string;
  page?: number;
}

export interface RagChatResponse {
  success: boolean;
  answer: string;
  sources: RagSource[];
  confidence: number;
  route: RagRoute;
}

export function sendRagMessage(message: string): Promise<RagChatResponse> {
  return apiFetch("/rag/chat", {
    method: "POST",
    body: { message },
  });
}
