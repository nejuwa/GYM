import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
  showTagline?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4", text: "text-lg", tagline: "text-[10px]" },
  md: { box: "h-10 w-10 rounded-xl", icon: "h-5 w-5", text: "text-xl", tagline: "text-[11px]" },
  lg: { box: "h-14 w-14 rounded-2xl", icon: "h-7 w-7", text: "text-3xl", tagline: "text-xs" },
};

export function Logo({ size = "md", variant = "dark", showTagline = false, className }: LogoProps) {
  const s = sizeClasses[size];

  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <div className={cn("flex items-center justify-center", s.box, "bg-gradient-to-br from-[#E50914] to-[#8f040a] shadow-lg shadow-red-500/30")}>
        <Dumbbell className={cn(s.icon, "text-white")} />
      </div>
      <div className="leading-tight">
        <p className={cn("font-bold tracking-tight", s.text, variant === "light" ? "text-white" : "text-slate-900")}>
          GYM<span className="text-primary">MIS</span>
        </p>
        {showTagline && (
          <p className={cn("font-medium tracking-wide", s.tagline, variant === "light" ? "text-slate-400" : "text-slate-500")}>
            Smart Gym Management System
          </p>
        )}
      </div>
    </div>
  );
}