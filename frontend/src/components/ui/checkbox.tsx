"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className, id, ...props }, ref) => {
    const boxId = id || `checkbox-${Math.random().toString(36).slice(2, 9)}`;
    return (
      <div className="flex items-start gap-2.5">
        <input
          ref={ref}
          type="checkbox"
          id={boxId}
          className={cn("mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-primary focus:ring-primary", className)}
          {...props}
        />
        {(label || description) && (
          <label htmlFor={boxId} className="cursor-pointer select-none">
            {label && <span className="block text-sm font-medium text-slate-700">{label}</span>}
            {description && <span className="block text-xs text-slate-500">{description}</span>}
          </label>
        )}
      </div>
    );
  }
);
Checkbox.displayName = "Checkbox";

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className, id, ...props }, ref) => {
    const radioId = id || `radio-${Math.random().toString(36).slice(2, 9)}`;
    return (
      <div className="flex items-center gap-2.5">
        <input
          ref={ref}
          type="radio"
          id={radioId}
          className={cn("h-4 w-4 border-slate-300 text-primary focus:ring-primary", className)}
          {...props}
        />
        {label && (
          <label htmlFor={radioId} className="text-sm font-medium text-slate-700 cursor-pointer select-none">
            {label}
          </label>
        )}
      </div>
    );
  }
);
Radio.displayName = "Radio";