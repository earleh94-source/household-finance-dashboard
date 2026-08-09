import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  onValueChange?: (value: string) => void;
};

export function Select({ className, onValueChange, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "h-10 min-w-0 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-300/50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700",
        className
      )}
      onChange={(event) => onValueChange?.(event.target.value)}
      {...props}
    >
      {children}
    </select>
  );
}
