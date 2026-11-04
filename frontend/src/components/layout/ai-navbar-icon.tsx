import { Sparkles } from "lucide-react";

interface AiNavbarIconProps {
  unread: boolean;
  onClick: () => void;
}

export function AiNavbarIcon({ unread, onClick }: AiNavbarIconProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Ask the Gym AI"
      aria-label="Open gym AI assistant"
      className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Sparkles className="h-5 w-5" aria-hidden="true" />
      {unread && (
        <span
          className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-white"
          aria-label="Unread assistant message"
        />
      )}
    </button>
  );
}
