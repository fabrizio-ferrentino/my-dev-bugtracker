import * as React from "react";
import { cn } from "@/lib/utils";

const inputBase =
  "flex w-full rounded-lg border border-zinc-300 bg-white text-sm shadow-sm transition-colors placeholder:text-zinc-400 focus-visible:border-indigo-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-500";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn(inputBase, "h-10 px-3 py-2", className)} {...props} />
  ),
);
Input.displayName = "Input";

export { Input };
