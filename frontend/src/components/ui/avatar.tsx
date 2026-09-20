import { cn } from "@/lib/utils";

const avatarColors = [
  "bg-red-100 text-red-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-amber-100 text-amber-700",
  "bg-violet-100 text-violet-700",
  "bg-rose-100 text-rose-700",
  "bg-teal-100 text-teal-700",
  "bg-indigo-100 text-indigo-700",
];

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  status?: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
}

const sizeClasses = {
  xs: "h-7 w-7 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
  xl: "h-20 w-20 text-2xl",
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}

function colorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) % avatarColors.length;
  }
  return avatarColors[hash];
}

export function Avatar({ src, name = "?", size = "md", status, className, ...props }: AvatarProps) {
  const statusColor =
    status === "ACTIVE"
      ? "bg-emerald-500"
      : status === "SUSPENDED"
        ? "bg-amber-500"
        : status === "DEACTIVATED"
          ? "bg-slate-400"
          : undefined;

  return (
    <div className={cn("relative inline-block shrink-0", className)} {...props}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className={cn("rounded-full object-cover", sizeClasses[size])} />
      ) : (
        <div className={cn("rounded-full flex items-center justify-center font-semibold", sizeClasses[size], colorFor(name))}>
          {initials(name)}
        </div>
      )}
      {statusColor && (
        <span
          className={cn(
            "absolute bottom-0 right-0 block rounded-full ring-2 ring-white",
            size === "xs" ? "h-1.5 w-1.5" : "h-2.5 w-2.5",
            statusColor
          )}
        />
      )}
    </div>
  );
}