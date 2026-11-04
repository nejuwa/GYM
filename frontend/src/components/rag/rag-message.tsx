import { Database, FileText } from "lucide-react";
import type { RagMessage } from "@/hooks/use-rag-chat";

export function RagMessageView({ message }: { message: RagMessage }) {
  const isUser = message.role === "user";
  const sources = message.sources?.filter((source, index, all) =>
    all.findIndex((candidate) =>
      candidate.type === source.type
      && candidate.table === source.table
      && candidate.file === source.file
      && candidate.page === source.page,
    ) === index,
  );
  return (
    <article className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] ${isUser ? "items-end" : "items-start"} flex flex-col gap-2`}>
        <p
          className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-6 ${
            isUser
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md border border-border bg-white text-slate-800"
          }`}
        >
          {message.content}
        </p>
        {!isUser && sources && sources.length > 0 && (
          <div className="flex flex-wrap gap-1.5" aria-label="Answer sources">
            {sources.map((source, index) => (
              <span
                key={`${source.type}-${source.table || source.file}-${source.page || index}`}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-slate-50 px-2.5 py-1 text-[11px] text-slate-600"
              >
                {source.type === "document" ? (
                  <>
                    <FileText className="h-3 w-3" />
                    {source.file}{source.page ? ` p.${source.page}` : ""}
                  </>
                ) : (
                  <>
                    <Database className="h-3 w-3" />
                    {source.table}
                  </>
                )}
              </span>
            ))}
          </div>
        )}
        {!isUser && message.route && process.env.NODE_ENV === "development" && (
          <span className="text-[10px] uppercase tracking-wide text-slate-400">
            {message.route}
          </span>
        )}
      </div>
    </article>
  );
}
